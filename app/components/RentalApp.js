// A form with contact information with a message box for the user to express interest in renting the property. The form should have a submit button that sends the information to the server and displays a success message to the user.
// The form should include the property ID as a hidden field to associate the rental interest with the correct property.

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RentalApp({ propertyId }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // helper to update form fields
  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // submits the form
  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    const { name, email, phone, message } = form;

    const { error } = await supabase.from("rental_apps").insert({
      p_id: propertyId,
      name,
      email,
      phone,
      message,
    });

    if (error) {
      alert(error.message || "Could not submit your interest. Please try again.");
    } else {
      setForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
      setShowSuccess(true);
    }

    setSubmitting(false);
  }

  // Shows a success message. Have to reset the page to request another since we don't want to encourage multiple submissions. Can change if wanted
  if (showSuccess) {
    return (
      <div className="bg-gray-100 p-6 rounded shadow-md">
        <h2 className="text-lg font-bold mb-2">Success</h2>
        <p className="mb-4 text-sm text-gray-700">
          Your interest has been submitted. We will contact you soon.
        </p>
      </div>
    );
  }

  // Otherwise show the form
  return (
    <div className="bg-gray-100 p-6 rounded shadow-md">
      <h2 className="text-lg font-bold mb-4">Express Your Interest in Renting</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" value={propertyId} />
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rental-name">Name</label>
          <input
            type="text"
            id="rental-name"
            name="name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
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
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
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
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rental-message">Message</label>
          <textarea
            id="rental-message"
            name="message"
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-950 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          {submitting ? "Submitting..." : "Submit Interest"}
        </button>
      </form>
    </div>
  );
}
