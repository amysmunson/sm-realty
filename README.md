# ![favicon](public/favicon-32x32.png) [Shen Munson Realty](https://www.shenmunson.com/)


## Table of Contents
<details open>
<summary> README.md </summary>

1. [Project Purpose](#project-purpose)
2. [Core Features](#core-features)
3. [File Structure](#file-structure)
4. [Architecture](#architecture)
5. [Integrations and APIs](#integrations-and-apis)
6. [Build And Deploy](#build-and-deploy)
7. [To Do List](#to-do-list)
8. [References](#references)
</details>

<details>
<summary> Additional Documentation </summary>

1. [Architecture](architecture.md)
2. [Integrations](integrations.md)
3. [Database Schema](database-schema.md)
4. [Admin Workflows](admin-workflows.md)
5. [Pull Request Template](pull_request_template.md)
</details>

## Project Purpose

This is a code repository for the Shen Munson Realty website. The public site presents the brokerage, the active property listings, and contact options. The authenticated dashboard supports internal review and centralized editing of property, homepage media, agent, contact, and showing request information.


## Core Features

- Public Homepage, About, Properties, and Property Details pages.
- Public Contact forms so visitors can contact the brokerage.
- Property cards, detail pages, photo galleries, and a full-screen photo viewer.
- Contact and showing request forms with validation and captcha protection.
- Admin dashboard pages for reviewing requests, editing property data, updating the homepage image, and managing agent records.
- Shared UI styling utilities in styles.css.


## File Structure

```text
.
|-- app/
|   |-- page.js                    Home page
|   |-- about/page.js              About page
|   |-- contact/page.js            Contact form page
|   |-- properties/
|   |   |-- page.js                Property index page
|   |   `-- [id]/page.js           Property detail page
|   |-- edit/page.js               Admin edit landing page
|   |-- dashboard/page.js          Admin dashboard route
|   |-- login/page.js              Login page
|   |-- signup/page.js             Signup page
|   |-- profile/page.js            Profile page
|   |-- globals.css                Global CSS variables and theme overrides
|   |-- styles.css                 Shared component utility classes
|   |-- api/
|   |   `-- register-auth/route.js  Registration API route
|   `-- components/
|       |-- forms/                 Contact, signup, rental, and showing forms
|       |-- photos/                Property gallery and photo viewer UI
|       |-- edits/                 Admin edit tables and modals
|       `-- utils/                 Shared header, footer, and menu pieces
|-- lib/
|   |-- supabase.js                Supabase client helpers
|   |-- verifyTurnstile.js         Turnstile verification helper
|   `-- sendNotificationEmail.js   Resend email helper
|-- public/                        Static assets and images
`-- docs/                          Supporting documentation
```


## Architecture

This app uses the Next.js App Router with server components, client components, server actions, and route handlers.

Supabase is the database and backing store for application data, auth, and admin edits. Public forms insert to the database through the anon client, while admin operations use a server-role Supabase client with elevated privileges and run via server actions or protected API routes to enforce access control and validation.

- `app/page.js` renders the landing page.
- `app/*/page.js` renders the relevant public or admin page.
- Shared styles are in `app/styles.css` and base global colors are in `app/globals.css`.
- `app/components/forms/*Action.js` files handle form submission on the server.
- `app/api/register-auth/route.js` handles registration through an API route.
- `lib/supabase.js` creates the client used by the app and a server-only client for privileged database access.
- `lib/verifyTurnstile.js` verifies Cloudflare Turnstile tokens server-side.
- `lib/sendNotificationEmail.js` sends best-effort notification email through Resend.


## Integrations And APIs

- Vercel: hosting and deployment target for the live site.
- Supabase: database, auth, and row-level security.
- Cloudflare Turnstile: protection for contact, rental application, and showing request flows against bots.
- Resend: notification email delivery for inbound contact and showing requests.

#### Note:
Each of these APIs (excluding Vercel) require environment variables to function. The necessary key names can be found in .env.example

## Prerequisites
- Node.js 20 or newer.
- Project npm packages from package.json
    - next 16.2.1
    - react 19.2.4
    - react-dom 19.2.4
    - @supabase/supabase-js ^2.101.1
    - @supabase/ssr ^0.10.0
    - tailwindcss ^4.3.0
    - @tailwindcss/postcss ^4.3.0
    - babel-plugin-react-compiler 1.0.0
    - eslint ^9
    - eslint-config-next 16.2.1
- A Supabase project.
- A Resend account and API key.
- Cloudflare Turnstile keys.
- A Vercel project for deployment.


## Build And Deploy

#### Local development:

```bash
npm install
npm run dev
```

The dev server will run on [http://localhost:3000](http://localhost:3000).

#### Production build:

```bash
npm run build
npm run start
```

#### Linting:

```bash
npm run lint
```

#### Deployment on Vercel:

1. The repository must be connected to a project on Vercel.
2. Add the necessary environment variables in the Vercel project settings.
3. Deploy from the tracked branch.


## To Do List

- [ ] Profile Editing
- [ ] Proper Dark Mode
- [ ] MLS Listings
<!-- Gallery could be thumbnails instead to save on Cached Egress -->
<!-- Modularize the supabase calls more -->
<!-- Sign Up Confirmation email disabled temporarily -->
<!-- Consider email authentication for login only for admin -->
<!-- Issue with login email, not allowing proper magiclink in deployment. Will fix -->
<!-- Set up forwarding inside of gmail itself for realty email to personal -->
<!-- Cloudflare settings -->


## References

- Next.js documentation: [https://nextjs.org/docs](https://nextjs.org/docs)
- Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Cloudflare Turnstile documentation: [https://developers.cloudflare.com/turnstile/](https://developers.cloudflare.com/turnstile/)
- Resend documentation: [https://resend.com/docs](https://resend.com/docs)
- Lato font: [https://fonts.google.com/specimen/Lato](https://fonts.google.com/specimen/Lato?preview.script=Latn)
