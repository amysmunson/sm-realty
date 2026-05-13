// Server action for handling contact form submissions.
// Includes Turnstile verification, saving the request to Supabase, 
// and sending the notification email to the brokerage.

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { verifyTurnstileToken } from "@/lib/verifyTurnstile";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

export async function submitContact(formData) {
  // Cloudflare Turnstile
  await verifyTurnstileToken(formData.get("cf-turnstile-response"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  // Using anon client since this is only an insert into public contact requests
  const supabase = createClient(supabaseUrl, anonKey);

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  const { error } = await supabase.from("contact_reqs").insert([payload]);

  if (error) {
    throw new Error(`Failed to submit contact request: ${error.message}`);
  }

  // Resend Email Notification
  const { ok: emailedSuccessfully } = await sendNotificationEmail({
    subject: `New contact request from ${payload.name || "website visitor"}`,
    replyTo: payload.email,
    text: [
      "New contact request received from the website.",
      `Name: ${payload.name || "(not provided)"}`,
      `Email: ${payload.email || "(not provided)"}`,
      `Phone: ${payload.phone || "(not provided)"}`,
      "",
      "Message:",
      payload.message || "(not provided)",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <p style="margin:0 0 8px 0"><strong>Name:</strong> ${payload.name || "(not provided)"}</p>
        <p style="margin:0 0 8px 0"><strong>Email:</strong> ${payload.email || "(not provided)"}</p>
        <p style="margin:0 0 8px 0"><strong>Phone:</strong> ${payload.phone || "(not provided)"}</p>
        <p style="margin:16px 0 8px 0"><strong>Message:</strong></p>
        <div style="white-space:pre-wrap;border:1px solid #e5e7eb;padding:12px;border-radius:4px">${payload.message || "(not provided)"}</div>
      </div>
    `,
  });

  // Redirect back to contact page with query params indicating success or failure of email
  redirect(`/contact?submitted=1&emailed=${emailedSuccessfully ? "1" : "0"}`);
}
