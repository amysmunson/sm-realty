# Admin Workflows

## Overview

The app has two separate admin surfaces:

- The dashboard for reviewing live data
- The edit pages for changing records that live in the dashboard

## Dashboard Review Flow

Use the dashboard to review current records in one place.

- Properties
- Contact requests
- Property-specific contact requests
- Showing requests
- Agents

The dashboard provides anchor links so you can jump to each section quickly. It is primarily a read-only review surface, not the main editing interface.

## Edit Page Flow

The edit page is the centralized editing page.

Sections on the edit page:

- Homepage photos
- Properties
- Contacts
- Property-specific contacts
- Showings
- Agents

## Homepage Image Workflow

The homepage editor manages the currently featured homepage image.

- Uploading a new homepage image replaces the existing homepage entry
- Property-linked photos are preserved
- Unlinked homepage rows are removed

## Property Workflow

The property editor supports both inline field editing and modal-driven subworkflows.

Editable areas:

- Inline core property data
    - Address
    - City
    - Zipcode
    - Beds
    - Baths
    - Full baths
    - Sqft
    - Monthly rent
    - Home type
    - Home description
    - Open/closed rental status
- Modal
    - External listing link
    - Features and policies content
    - Gallery photo upload, ordering, and deletion

## Contact, Rental, And Showing Workflows

These editors use table rows with inline inputs and a shared save pattern.

- Open rows can be edited and saved individually
- Closed rows are still visible to view on the edit page
- Availability data is tied to showing requests and is edited together with the showing row

## Real Estate Agent Workflow

The agent editor manages the agent roster used by the About page and dashboard.

Contains:
- Agent name
- Contact details
- License type
- DRE number
