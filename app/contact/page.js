// Contact submission page
// Calls server component action for Turnstile verification, database insert, and email sending
// Promoting modularity

import TurnstileWidget from "../components/forms/TurnstileWidget";
import { submitContact } from "../components/forms/contactAction";

export const metadata = {
  title: "Contact | Shen Munson Realty",
};

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const submitted = params?.submitted === "1";
  const emailed = params?.emailed === "1";

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <main>
      <div className="relative w-full p-4 pt-20">
        <h1 className="justify-center text-center text-black text-4xl font-bold">Contact Us</h1>
      </div>

      <div className="container mx-auto px-4 justify-center text-center mb-20">
          {submitted ? (
            emailed ? (
              <div className="mx-auto mb-8 max-w-lg rounded-sm bg-green-100 px-4 py-3 text-sm text-green-800">
                Your message was submitted and emailed successfully.
              </div>
            ) : (
              <div className="mx-auto mb-8 max-w-lg rounded-sm bg-yellow-100 px-4 py-3 text-sm text-yellow-800">
                Your message was saved, but the email could not be sent. It may take us a little longer to get back to you, but we will respond as soon as we can.
              </div>
            )
          ) : (<div className="min-h-12"></div>)}

        <form action={submitContact} className="max-w-lg mx-auto space-y-6">
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
          <TurnstileWidget siteKey={turnstileSiteKey} />
        </form>
      </div>
    </main>
  );
}