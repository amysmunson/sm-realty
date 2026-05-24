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
      <div className="container-page">
        <div className="w-full">
          <h1 className="justify-center text-center text-black text-4xl font-bold">Contact Us</h1>
          <div className="card-auth">
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
            ) : (<div className="p-2"></div>)}

            <form action={submitContact} className="">
              <div className="mb-4">
                <label htmlFor="name" className="label-form">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 input-form"
                  placeholder="Your name"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="label-form">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="mt-1 input-form"
                  placeholder="Your email"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="label-form">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="mt-1 input-form"
                  placeholder="Your phone number"
                />
              </div>
              <div className="mb-2">
                <label htmlFor="message" className="label-form">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="mt-1 input-form"
                  placeholder="Your message"
                />
              </div>
              <TurnstileWidget siteKey={turnstileSiteKey} />
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}