// Page for specific listing accessed via /properties/[id]

import { supabase } from "@/lib/supabase";

const siteName = "Amelia Huimin Shen";

async function getProperty(id) {
  const { data, error } = await supabase
    .from("properties")
    .select("p_id, address")
    .eq("p_id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const property = await getProperty(id);

  return {
    title: property?.address
      ? `${property.address} | ${siteName}`
      : `Property Details | ${siteName}`,
  };
}

export default async function PropertyDetailsPage({ params }) {
  const { id } = await params;
  const property = await getProperty(id);

  return (
    <main>
      <h1>Property Details</h1>
      <p>
        {property?.address
          ? `Details for ${property.address}`
          : `Details for property with ID: ${id}`}
      </p>
    </main>
  );
}