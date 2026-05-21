// About Page
import AgentCard from "@/app/components/AgentCard";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "About | Shen Munson Realty",
};

export default async function AboutPage() {
  const [{ data: agents, error: agentError }] = await Promise.all([
    supabase.from("agents").select("*"),
  ]);

  if (agentError) {
    console.error(agentError.message || "Unable to load agents.");
  }

  console.log(agents);

  // sort agents by alphabetical order by name
  agents.sort((a, b) => a.name.localeCompare(b.name));

  const photoUrls = Object.fromEntries(
    agents.map((user) => {
      const photoSrc = user.photo_file_name;
      if (!photoSrc) return [user.id, null];

      const { data } = supabase.storage.from("photo_bucket").getPublicUrl(photoSrc);
      return [user.id, data?.publicUrl || null];
    })
  );

  return (
    <main>
      <div className="relative w-full mb-10 p-4 pt-20">
        <h1 className="justify-center text-center text-black text-4xl font-bold">About</h1>
      </div>
      <div className="px-16 container mx-auto justify-center text-center mb-10">
        <p className="indent-8 text-left leading-10">
          Based in Sillicon Valley, Shen Munson Realty is a real estate
          brokerage serving buyers, sellers, landlords, tenants, and property owners throughout the South Bay.
          Led by a licensed broker with nearly 30 years of local experience and market expertise,
          Shen Munson Realty provides personalized service and practical guidance to help clients achieve
          their real estate goals. We specialize in residential rentals, sales, and are committed to
          helping clients navigate every step. Whether you are renting, selling, or looking for a
          property manager, Shen Munson Realty is here to help.
        </p>
      </div>

      <div className="container mx-auto px-4 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mb-4 text-gray-700"
              aria-hidden="true"
            >
              <path d="M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z"/>
            </svg>
            <h3 className="text-xl font-semibold mb-2">Residential Rentals</h3>
            <p className="text-sm text-gray-600">
              Matching tenants with quality homes and helping landlords find tennants across the South Bay.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mb-4 text-gray-700"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12 12 2.25 21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-6h4.5v6h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5"
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">Residential Sales</h3>
            <p className="text-sm text-gray-600">
              Guiding buyers and sellers through residential real estate transactions with local market expertise.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mb-4 text-gray-700"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">Property Management</h3>
            <p className="text-sm text-gray-600">
              Assisting property owners with coordinating, leasing, and maintaining properties with care.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-10 justify-center text-center">
        <div className="mb-10">
          <h1 className="justify-center text-center text-black text-4xl font-bold">Our Team</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-10">
          {agents.map((agent) => {
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                photoSrc={photoUrls[agent.id]}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}