// Sends a notification email via Resend. Returns { ok: true } on success or
// { ok: false } on any failure. Failures are logged but never thrown since emails are
// best-effort. Will still record to database on failure of email

export async function sendNotificationEmail({ subject, replyTo, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESEND_TO_EMAIL;
  const from = "Shen Munson Realty <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or RESEND_TO_EMAIL environment variables.");
    return { ok: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        replyTo: replyTo || from,
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend send failed:", await res.text());
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error("Resend send threw:", err);
    return { ok: false };
  }
}
