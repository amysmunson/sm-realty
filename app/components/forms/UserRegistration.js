// This component handles user registration/sign up

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; 

export default function UserRegistration() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // helper to update form fields
  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Submit the form data
  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      // Call the registration API route to create the user in supabase auth and get the new user ID
      const response = await fetch("/api/register-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // Payload will contain userId if successful
      const payload = await response.json();

      // console.log("Registration response:", payload.userId);

      if (!response.ok) {
        setError(payload?.error || "Could not create account.");
        return;
      }

      // Push to the supabase users table with the new user data
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: payload.userId,
          name: form.name,
          email: form.email,
          phone: form.phone,
        })
        .maybeSingle();

      if (userError) {
        setError(userError?.message || "Account created but failed to create profile.");
      } else {
        setSuccess(true);
      }


      setMessage("Account created. Check your email to confirm your account.");
      setForm({ name: "", email: "", password: "", phone: "" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-md mx-auto text-left mt-6 mb-10 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create Account</h2>
      {success ? (
        <p className="text-green-700 mt-3 text-sm">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span> 
            </label>
            {/* This can have more text formatting rules */}
          <input
            id="register-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="register-password"
            type="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            minLength={8}
            // Regex to require a special character, num, lower, and upper case for password security 
            pattern="^(?=.*[^A-Za-z0-9])(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*$"
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="register-phone" className="block text-sm font-medium mb-1">
            Phone
          </label>
          <input
            id="register-phone"
            type="tel"
            value={form.phone}
            pattern="^\+?[1-9]\d{1,14}$"
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <p> <span className="text-red-500 text-sm">* Required field</span> </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-950 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Sign Up"}
        </button>
      </form>
      )}

      {error ? <p className="text-red-700 mt-3 text-sm">{error}</p> : null}
    </section>
  );
}
