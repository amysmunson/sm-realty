// Form for users to express rental interest in a property. Submits via a
// server action component that handles Turnstile verification, inserts into the database,
// and sends a notification email to the site owner.

"use client";

import { useActionState } from "react";
import { submitRentalApp } from "./rentalAppAction";
import TurnstileWidget from "./TurnstileWidget";

export default function RentalApp({ propertyId, propertyAddress }) {
  const [state, formAction] = useActionState(submitRentalApp, {});

  if (state?.success) {
    return (
      <div className="card-form">
        <h2 className="heading-form">Success</h2>
        <p className="mb-4 text-sm text-gray-700">
          Your interest has been submitted. We will contact you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="card-form">
      <h2 className="heading-form">Contact Us</h2>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="propertyAddress" value={propertyAddress ?? ""} />
        {state?.error ? (
          <p className="banner-error">{state.error}</p>
        ) : null }
        <div>
          <label className="label-form" htmlFor="rental-name">Name</label>
          <input
            type="text"
            id="rental-name"
            name="name"
            required
            className="input-form"
          />
        </div>
        <div>
          <label className="label-form" htmlFor="rental-email">Email</label>
          <input
            type="email"
            id="rental-email"
            name="email"
            required
            className="input-form"
          />
        </div>
        <div>
          <label className="label-form" htmlFor="rental-phone">Phone</label>
          <input
            type="tel"
            id="rental-phone"
            name="phone"
            required
            className="input-form"
          />
        </div>
        <div>
          <label className="label-form" htmlFor="rental-message">Message</label>
          <textarea
            id="rental-message"
            name="message"
            rows={4}
            className="input-form"
          />
        </div>
        <TurnstileWidget
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          label="Submit Interest"
        />
      </form>
    </div>
  );
}
