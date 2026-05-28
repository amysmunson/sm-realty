# Database Schema

This document summarizes the tables and storage buckets that are referenced in the app code.

## Storage

- `photo_bucket`: public storage bucket that serves property and homepage images.

## Tables

### `properties`

Primary content table for listings and homepage-linked properties.

Observed fields used in the app:

- `p_id`
- `address`
- `city`
- `zip`
- `beds`
- `baths`
- `full_baths`
- `sqft`
- `monthly_rent`
- `home_type`
- `home_desc`
- `open_rental`
- `ext_link`

Usage:

- Public property listings and property detail pages.
- Dashboard tables.
- Property edit workflows.
- Rental application and showing request forms that need the property label.

### `photos`

Image metadata for property photos and homepage photos.

Observed fields used in the app:

- `id`
- `p_id`
- `file_name`
- `homepage`
- `photo_order`
- `alt`

Usage:

- Home page main and featured photos.
- Property cards and property detail pages.
- Gallery editing and ordering in the admin interface.

### `agents`

Brokerage agent records.

Observed fields used in the app:

- `id`
- `name`
- `email`
- `phone`
- `license`
- `dre_num`

Usage:

- About page team section.
- Dashboard review table.
- Admin agent editor.

### `users`

Profile records associated with authentication.

Observed fields used in the app:

- `id`
- `name`
- `email`
- `phone`

Usage:

- Profile page.
- Login and signup flows.
- Admin checks for privileged views.

### `contact_reqs`

Contact form submissions.

Observed fields used in the app:

- `id`
- `created_at`
- `name`
- `email`
- `phone`
- `message`
- `open`

Usage:

- Contact form submission.
- Dashboard and admin editing.

### `rental_apps`

Contact request submissions tied to a property.

Observed fields used in the app:

- `form_id`
- `created_at`
- `p_id`
- `name`
- `email`
- `phone`
- `message`
- `open`

Usage:

- Rental-specific contact form.
- Dashboard review table.
- Admin applications editor.

### `showing_reqs`

Showing request submissions tied to a property.

Observed fields used in the app:

- `showing_id`
- `created_at`
- `p_id`
- `name`
- `email`
- `phone`
- `notes`
- `open`

Usage:

- Showing request form.
- Dashboard review table.
- Admin showing editor.

### `availability`

Availability rows linked to a showing request.

Observed fields used in the app:

- `avail_id`
- `showing_id`
- `available_date`
- `start_time`
- `end_time`

Usage:

- Showing request creation.
- Admin showing editor.
- Showing request display and email formatting.

## Data Relationships

- `photos.p_id` links photos to properties.
- `rental_apps.p_id` links rental applications to properties.
- `showing_reqs.p_id` links showing requests to properties.
- `availability.showing_id` links preferred times to a showing request.


