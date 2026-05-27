# Integrations

## Supabase

Supabase is the app's main backend.

Used for:

- Database reads and writes.
- Auth sign-up and login profile storage.
- Admin editing flows.
- Public property, agent, and photo data.

Implementation notes:

- `lib/supabase.js` exports the browser client.
- `createServerSupabaseClient()` uses the service key for privileged server-side access.
- The app stores public data such as properties, photos, contact requests, rental applications, showing requests, availability, agents, and users in Supabase tables.

## Vercel

Vercel is the deployment target for the public site and admin UI.

Used for:

- Hosting.
- Environment variable management.
- Preview and production deployments.

Implementation notes:

- The repo is already structured for Vercel's Next.js deployment model.
- Build output uses the standard `next build` and `next start` commands.

## Cloudflare Turnstile

Turnstile protects the public request forms.

Used in:

- Contact submission.
- Rental application submission.
- Showing request submission.

Implementation notes:

- `lib/verifyTurnstile.js` validates the token server-side.
- The server action or route handler should fail early if the token is missing or invalid.
- The client-side widgets provide the token under the `cf-turnstile-response` field.

## Resend

Resend is used for notification email delivery.

Used for:

- Contact request notifications.
- Rental application notifications.
- Showing request notifications.
- Registration-related notification flows where configured.

Implementation notes:

- `lib/sendNotificationEmail.js` posts to the Resend API.
- Email sending is best-effort: database writes should still succeed even if email delivery fails.
- Replies are directed to the submitter where available.
