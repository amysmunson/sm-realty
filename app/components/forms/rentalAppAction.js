// Server actions for handling rental applications form
// Verifies Turnstile token, inserts application into Supabase, then sends notification email to brokerage

"use server";

import { createClient } from "@supabase/supabase-js";
import { verifyTurnstileToken } from "@/lib/verifyTurnstile";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

export async function submitRentalApp(_prevState, formData) {
  // Turnstile verification happens first
  await verifyTurnstileToken(formData.get("cf-turnstile-response"));

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) {
    return { error: "Missing property id." };
  }

  const propertyAddress = String(formData.get("propertyAddress") ?? "").trim();
  const propertyLabel = propertyAddress || `Property ID ${propertyId}`;

  const payload = {
    p_id: propertyId,
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  // Insert into database
  const supabase = createClient(supabaseUrl, anonKey);
  const { error } = await supabase.from("rental_apps").insert(payload);

  if (error) {
    console.error("rental_apps insert failed:", error);
    return { error: "Could not submit your interest. Please try again." };
  }

  // Sending notification email using Resend
  await sendNotificationEmail({
    subject: `New rental contact request for ${propertyLabel}`,
    replyTo: payload.email,
    text: [
      "New rental contact request received from the website.",
      `Property: ${propertyLabel}`,
      `Name: ${payload.name || "(not provided)"}`,
      `Email: ${payload.email || "(not provided)"}`,
      `Phone: ${payload.phone || "(not provided)"}`,
      "",
      "Message:",
      payload.message || "(not provided)",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px 0">New rental contact request for ${propertyLabel}</h2>
        <p style="margin:0 0 8px 0"><strong>Property:</strong> ${propertyLabel}</p>
        <p style="margin:0 0 8px 0"><strong>Name:</strong> ${payload.name || "(not provided)"}</p>
        <p style="margin:0 0 8px 0"><strong>Email:</strong> ${payload.email || "(not provided)"}</p>
        <p style="margin:0 0 8px 0"><strong>Phone:</strong> ${payload.phone || "(not provided)"}</p>
        <p style="margin:16px 0 8px 0"><strong>Message:</strong></p>
        <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px">${payload.message || "(not provided)"}</div>
      </div>
    `,
  });

  return { success: true };
}
