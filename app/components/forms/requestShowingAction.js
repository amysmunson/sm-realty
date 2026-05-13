// Server actions for handling showing request form
// Verifies Turnstile token, inserts application into Supabase, then sends notification email to brokerage

"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { verifyTurnstileToken } from "@/lib/verifyTurnstile";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

// Formats a showing slot for display in the notification email
function formatSlotForEmail({ date, start_time, end_time }) {
  const start = new Date(start_time);
  const end = new Date(end_time);
  const timeOpts = { hour: "numeric", minute: "2-digit" };
  return `${date} — ${start.toLocaleTimeString("en-US", timeOpts)} to ${end.toLocaleTimeString("en-US", timeOpts)}`;
}

export async function submitShowingRequest(_prevState, formData) {
  // Turnstile verification happens first
  await verifyTurnstileToken(formData.get("cf-turnstile-response"));

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) {
    return { error: "Missing property id." };
  }

  const propertyAddress = String(formData.get("propertyAddress") ?? "").trim();
  const propertyLabel = propertyAddress || `Property ID ${propertyId}`;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  let slots;
  try {
    slots = JSON.parse(String(formData.get("slots") ?? "[]"));
  } catch {
    return { error: "Invalid date/time selection." };
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    return { error: "Please choose at least one preferred date and time range." };
  }

  const now = new Date();
  const maxDateTime = new Date(now);
  maxDateTime.setMonth(maxDateTime.getMonth() + 1);

  const normalizedSlots = slots.map((slot) => {
    const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
    const endDateTime = new Date(`${slot.date}T${slot.endTime}`);
    return { date: slot.date, startDateTime, endDateTime };
  });

  const hasInvalidSlot = normalizedSlots.some(({ startDateTime, endDateTime }) => {
    return (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime()) ||
      startDateTime > maxDateTime ||
      endDateTime > maxDateTime ||
      endDateTime <= startDateTime
    );
  });

  if (hasInvalidSlot) {
    return { error: "Please choose valid date and time ranges within the next month." };
  }

  // Service-role-keyed client bypasses RLS so the action can .select() the
  // showing_id after insert and write the linked availability rows.
  // Sending showing request and grabbing its id
  const supabase = createServerSupabaseClient();

  const { data: showingRequest, error: requestError } = await supabase
    .from("showing_reqs")
    .insert({
      p_id: propertyId,
      name,
      email,
      phone,
      notes: notes || null,
    })
    .select("showing_id")
    .single();

  if (requestError) {
    console.error("showing_reqs insert failed:", requestError);
    return { error: "Could not submit your request. Please try again." };
  }

  // Inserting availability information linked to the showing request into the database
  const availabilityRows = normalizedSlots.map(({ date, startDateTime, endDateTime }) => ({
    showing_id: showingRequest.showing_id,
    available_date: date,
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
  }));

  const { error: availabilityError } = await supabase
    .from("availability")
    .insert(availabilityRows);

  if (availabilityError) {
    console.error("availability insert failed:", availabilityError);
    return { error: "Request was created, but availability could not be saved." };
  }

  const slotLines = availabilityRows.map(formatSlotForEmail);

  // Send notification email with request details and availability
  await sendNotificationEmail({
    subject: `New showing request for ${propertyLabel}`,
    replyTo: email,
    text: [
      "New showing request received from the website.",
      `Property: ${propertyLabel}`,
      `Name: ${name || "(not provided)"}`,
      `Email: ${email || "(not provided)"}`,
      `Phone: ${phone || "(not provided)"}`,
      "",
      "Preferred times:",
      ...slotLines.map((line) => `  - ${line}`),
      "",
      "Notes:",
      notes || "(none)",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px 0">New showing request for ${propertyLabel}</h2>
        <p style="margin:0 0 8px 0"><strong>Property:</strong> ${propertyLabel}</p>
        <p style="margin:0 0 8px 0"><strong>Name:</strong> ${name || "(not provided)"}</p>
        <p style="margin:0 0 8px 0"><strong>Email:</strong> ${email || "(not provided)"}</p>
        <p style="margin:0 0 8px 0"><strong>Phone:</strong> ${phone || "(not provided)"}</p>
        <p style="margin:16px 0 8px 0"><strong>Preferred times:</strong></p>
        <ul style="margin:0 0 8px 0;padding-left:20px">
          ${slotLines.map((line) => `<li>${line}</li>`).join("")}
        </ul>
        <p style="margin:16px 0 8px 0"><strong>Notes:</strong></p>
        <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px">${notes || "(none)"}</div>
      </div>
    `,
  });

  return { success: true };
}
