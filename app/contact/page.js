import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Contact | Amelia Huimin Shen",
};

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const submitted = params?.submitted === "1";
  const emailed = params?.emailed === "1";

  // Function to handle contact request form submission
  async function submitContact(formData) {
    "use server";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const supabase = createClient(supabaseUrl, anonKey);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    const { error } = await supabase.from("contact_reqs").insert([payload]);

    if (error) {
      throw new Error(`Failed to submit contact request: ${error.message}`);
    }

    // Send email notification using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = "Amelia Huimin Shen <onboarding@resend.dev>";
    const resendTo = process.env.RESEND_TO_EMAIL;

    let emailedSuccessfully = false;

    if (resendApiKey && resendTo) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [resendTo],
            replyTo: payload.email || resendFrom,
            subject: `New contact request from ${payload.name || "website visitor"}`,
            text: [
              "New contact request received from the website.",
              `Name: ${payload.name || "(not provided)"}`,
              `Email: ${payload.email || "(not provided)"}`,
              `Phone: ${payload.phone || "(not provided)"}`,
              "",
              "Message:",
              payload.message || "(not provided)",
            ].join("\n"),
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
                <h2 style="margin:0 0 12px 0">New contact request</h2>
                <p style="margin:0 0 8px 0"><strong>Name:</strong> ${payload.name || "(not provided)"}</p>
                <p style="margin:0 0 8px 0"><strong>Email:</strong> ${payload.email || "(not provided)"}</p>
                <p style="margin:0 0 8px 0"><strong>Phone:</strong> ${payload.phone || "(not provided)"}</p>
                <p style="margin:16px 0 8px 0"><strong>Message:</strong></p>
                <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px">${payload.message || "(not provided)"}</div>
              </div>
            `,
          }),
        });

        emailedSuccessfully = emailResponse.ok;
        if (!emailResponse.ok) {
          console.error("Failed to send contact email via Resend:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("Failed to send contact email via Resend:", emailError);
      }
    } else {
      console.error("Missing RESEND_API_KEY or RESEND_TO_EMAIL environment variables.");
    }

    redirect(`/contact?submitted=1&emailed=${emailedSuccessfully ? "1" : "0"}`);
  }

  return (
    <main>
      <div className="relative w-full mb-10 p-4 pt-20">
        <h1 className="justify-center text-center text-black text-4xl font-bold">Contact Us</h1>
      </div>

      <div className="container mx-auto px-4 justify-center text-center mb-10">
        {submitted ? (
          emailed ? (
            <p className="mx-auto mb-6 max-w-lg rounded-sm bg-green-100 px-4 py-3 text-sm text-green-800">
              Your message was submitted and emailed successfully.
            </p>
          ) : (
            <p className="mx-auto mb-6 max-w-lg rounded-sm bg-yellow-100 px-4 py-3 text-sm text-yellow-800">
              Your message was submitted, but the email notification could not be sent.
            </p>
          )
        ) : 

        (<form action={submitContact} className="max-w-lg mx-auto space-y-6">
          <div>
            <label htmlFor="name" className="block text-left text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-left text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2"
              placeholder="Your email"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-left text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2"
              placeholder="Your phone number"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-left text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2"
              placeholder="Your message"
            />
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm cursor-pointer text-white bg-blue-950 hover:bg-blue-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-950 transition"
            >
              Submit
            </button>
          </div>
        </form>)}
      </div>
    </main>
  );
}