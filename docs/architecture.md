# Architecture

## Overview

Shen Munson Realty is a Next.js App Router application that serves a public real-estate website and an authenticated admin dashboard. The app combines server components, client components, server actions, and a small API route for account creation.

The project is organized around three main concerns:

- Public marketing pages and listing pages.
- Lead-capture flows for contact, rental applications, and showing requests.
- Admin tooling for editing property data, homepage media, agents, and inbound requests.

## Rendering Model

The app uses the Next.js App Router under `app/`.

- Page routes such as `app/page.js`, `app/about/page.js`, and `app/properties/[id]/page.js` render the public site.
- Client components handle interactive UI such as the dashboard, profile page, photo viewers, and editing tables.
- Server actions handle form submission for contact, rental, and showing request flows.
- The registration route under `app/api/register-auth/route.js` performs account creation against Supabase Auth.

## Shared Layout

The root layout in `app/layout.js` loads the global font, global CSS, shared styles, the site header, and the footer. This keeps the public pages and admin pages visually consistent while allowing route-level customization.

The site shell is intentionally shared:

- `app/components/utils/SiteHeader.js` renders the responsive header and theme toggle.
- `app/components/utils/Footer.js` renders the footer links and contact information.
- `app/styles.css` contains the shared utility classes for buttons, cards, banners, tables, modals, headings, and nav elements.
- `app/globals.css` owns the theme variables and global color behavior.

## Data Flow

The application treats Supabase as the central system of record.

- Public pages read from Supabase to display properties, agents, and photos.
- Form submissions write to Supabase and then trigger notification email as a best-effort side effect.
- Admin edit screens load data from Supabase, mutate records in place, and keep the UI synced with optimistic or local state updates where practical.

The app uses two Supabase client modes:

- Browser/anon access for public reads and low-risk inserts.
- Service-role access for server-side workflows that need elevated permissions.
