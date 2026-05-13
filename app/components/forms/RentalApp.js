// Form for users to express rental interest in a property. Submits via a
// server action component that handles Turnstile verification, inserts into the database,
// and sends a notification email to the site owner.

"use client";

import { useActionState } from "react";
import { submitRentalApp } from "./rentalAppAction";
import TurnstileWidget from "./TurnstileWidget";

// Submit button styling for the TurnstileWidget instance in this form
const SUBMIT_BUTTON_CLASSNAME = `bg-blue-950 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded
  disabled:opacity-50 disabled:cursor-default disabled:hover:bg-blue-950 cursor-pointer`;

export default function RentalApp({ propertyId, propertyAddress }) {
  const [state, formAction] = useActionState(submitRentalApp, {});

  if (state?.success) {
    return (
      <div className="bg-gray-100 p-6 rounded shadow-md">
        <h2 className="text-lg font-bold mb-2">Success</h2>
        <p className="mb-4 text-sm text-gray-700">
          Your interest has been submitted. We will contact you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-6 rounded shadow-md">
      <h2 className="text-lg font-bold mb-4">Express Your Interest in Renting</h2>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="propertyAddress" value={propertyAddress ?? ""} />
        {state?.error ? (
          <p className="rounded-sm bg-red-100 px-4 py-3 text-sm text-red-800">{state.error}</p>
        ) : null}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rental-name">Name</label>
          <input
            type="text"
            id="rental-name"
            name="name"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rental-email">Email</label>
          <input
            type="email"
            id="rental-email"
            name="email"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rental-phone">Phone</label>
          <input
            type="tel"
            id="rental-phone"
            name="phone"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rental-message">Message</label>
          <textarea
            id="rental-message"
            name="message"
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <TurnstileWidget
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          label="Submit Interest"
          buttonClassName={SUBMIT_BUTTON_CLASSNAME}
        />
      </form>
    </div>
  );
}
