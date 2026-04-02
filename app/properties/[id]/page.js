// Page for specific listing accessed via /properties/[id]

export const metadata = {
  title: "Property Details | Amelia Huimin Shen",
};

export default async function PropertyDetailsPage({ params }) {
  const { id } = await params;

  return (
    <main>
      <h1>Property Details</h1>
      <p>Details for property with ID: {id}</p>
    </main>
  );
}   