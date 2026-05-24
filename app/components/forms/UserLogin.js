// User login component

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UserLogin() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [linkStep, setLinkStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // helper to update form fields
  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Check credentials and send the magic link
  async function handleCredentialsSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      // Sign in with supabase auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      // exit if error
      if (signInError) {
        setError(signInError.message || "Could not sign in.");
        return;
      }

      // Temporary: Magic Link disabled in deployment
      // Instead simply redirecting to their profile page
      router.replace("/profile");

      // await supabase.auth.signOut();

      // // Send the link for email sign in -- subject to overall supabase email rate limits
      // const { error: otpError } = await supabase.auth.signInWithOtp({
      //   email: form.email,
      //   options: {
      //     emailRedirectTo: `${window.location.origin}/profile`,
      //   },
      // });
      // // Send the link for email sign in -- subject to overall supabase email rate limits
      // const { error: otpError } = await supabase.auth.signInWithOtp({
      //   email: form.email,
      //   options: {
      //     emailRedirectTo: `${window.location.origin}/profile`,
      //   },
      // });

      // if (otpError) {
      //   setError(otpError.message || "Could not send sign-in link.");
      //   return;
      // }
      // if (otpError) {
      //   setError(otpError.message || "Could not send sign-in link.");
      //   return;
      // }

      // setLinkStep(true);
      // setMessage("We sent a sign-in link to your email. Click it to finish signing in.");
      // setLinkStep(true);
      // setMessage("We sent a sign-in link to your email. Click it to finish signing in.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card-auth">
      <h2 className="text-xl font-semibold mb-4">Log In</h2>
      {!linkStep ? (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              className="input-form"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              minLength={8}
              required
              className="input-form"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary"
          >
            {submitting ? "Checking Credentials..." : "Continue"}
          </button>
        </form>
      ) : (
        // This step has been temporarily disabled in deployment, and so this page will not currently be reached
        // This step has been temporarily disabled in deployment, and so this page will not currently be reached
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Click the sign-in link we sent to your email to finish logging in.
          </p>
          <button
            type="button"
            onClick={() => {
              setLinkStep(false);
              setMessage("");
              setError("");
            }}
            className="w-full bg-gray-100 text-gray-800 rounded px-4 py-2 cursor-pointer"
          >
            Back
          </button>
        </div>
      )}

      {message ? <p className="text-green-700 mt-3 text-sm">{message}</p> : null}
      {error ? <p className="text-red-700 mt-3 text-sm">{error}</p> : null}
    </section>
  );
}
