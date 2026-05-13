import { headers } from "next/headers";

// Verifies a Cloudflare Turnstile token server-side. Throws on any failure —
// callers can catch and convert to a returned error if they want to surface
// it to the user, or let it bubble to an error boundary.
export async function verifyTurnstileToken(rawToken) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing TURNSTILE_SECRET_KEY environment variable.");
  }

  const token = String(rawToken ?? "").trim();
  if (!token) {
    throw new Error("Missing Turnstile token.");
  }

  const headerList = await headers();
  const remoteIp =
    headerList.get("cf-connecting-ip") ||
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.append("remoteip", remoteIp);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const result = await res.json().catch(() => ({ success: false }));
  if (!result.success) {
    console.error("Turnstile verification failed:", result);
    throw new Error("Turnstile verification failed.");
  }
}
