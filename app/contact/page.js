import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Contact | Amelia Huimin Shen",
};

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const submitted = params?.submitted === "1";

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

    redirect("/contact?submitted=1");
  }

  return (
    <main>
      <div className="relative w-full mb-10 p-4 pt-20">
        <h1 className="justify-center text-center text-black text-4xl font-bold">Contact Us</h1>
      </div>

      <div className="container mx-auto px-4 justify-center text-center mb-10">
        {submitted ? (
          <p className="mx-auto mb-6 max-w-lg rounded-sm bg-green-100 px-4 py-3 text-sm text-green-800">
            Your message was submitted!
          </p>
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