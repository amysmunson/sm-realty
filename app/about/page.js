// About Page
import AgentCard from "@/app/components/AgentCard";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "About | Amelia Huimin Shen",
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
        <p className="indent-8 pb-10">
          We help clients buy and sell properties with confidence. We help clients buy and sell properties with confidence. We help clients buy and sell properties with confidence. We help clients buy and sell properties with confidence.
        </p>
      </div>

      <div className="container mx-auto px-4 justify-center text-center">

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
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