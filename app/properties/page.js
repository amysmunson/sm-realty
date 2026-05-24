// Page to display all listings
import PropertyCard from "@/app/components/PropertyCard";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "Properties | Shen Munson Realty",
};

// Force this page to be dynamic and pull fresh data instead of static generation
// Revisit this decision later if we want to add caching or static generation for better performance, but for now we want latest data
export const dynamic = "force-dynamic";


// Build a map of p_id -> first photo file_name (lowest order)
function buildFirstPhotoMap(photoData = []) {
  const firstPhotoByProperty = new Map();

  // Iterate through photos, keep track of the lowest order photo for each property
  for (const photo of photoData) {
    if (!photo?.p_id || !photo?.file_name) continue;

    // Determine if this photo should replace the existing one for this property based on order
    const existing = firstPhotoByProperty.get(photo.p_id);
    const photoOrder = photo.order ?? Number.MAX_SAFE_INTEGER;
    const existingOrder = existing?.order ?? Number.MAX_SAFE_INTEGER;

    // If no existing photo for this property or this photo has a lower order, update the map
    if (!existing || photoOrder < existingOrder) {
      firstPhotoByProperty.set(photo.p_id, photo);
    }
  }

  // Convert to a simple p_id -> file_name map for easier lookup later
  return Object.fromEntries(
    [...firstPhotoByProperty.entries()].map(([p_id, photo]) => [p_id, photo.file_name])
  );
}

export default async function Properties() {
  // fetch property and photo data
  const [{ data: properties, error: propertyError }, { data: photos, error: photoError }] =
    await Promise.all([
      supabase.from("properties").select("*").filter("open_rental", "eq", true),
      supabase.from("photos").select("*"),
    ]);

  if (propertyError) {
    console.error(propertyError.message || "Unable to load properties.");
  }

  if (photoError) {
    console.error(photoError.message || "Unable to load photos.");
  }

  const propertyData = properties || [];
  const photoData = photos || [];

  // Precompute first photo once to prevent per-property filter/sort in render
  const firstPhotoByProperty = buildFirstPhotoMap(photoData);

  // Generate public URLs for the first photo of each property to display on the dashboard if they exist
  const photoUrls = Object.fromEntries(
    propertyData.map((property) => {
      const photoSrc = firstPhotoByProperty[property.p_id];
      if (!photoSrc) return [property.p_id, null];

      const { data } = supabase.storage.from("photo_bucket").getPublicUrl(photoSrc);
      return [property.p_id, data?.publicUrl || null];
    })
  );

  return (
    <div style={{ minHeight: "calc(100vh - 6rem)" }}>
      <main className="w-full">
        <div className="relative w-full mb-10 p-4 pt-20">
          <h1 className="justify-center text-center text-black text-4xl font-bold">Properties </h1>
        </div>

        <div className="container mx-auto px-4 mb-40 justify-center text-center">
          {propertyData.length === 0 ? (
            <p className="text-center text-gray-500">No properties currently available.</p>
          ) :
            <div className="grid grid-cols-1 gap-4 mb-20">
              {propertyData.map((property) => (
                <PropertyCard
                  key={property.p_id}
                  property={property}
                  photoUrl={photoUrls[property.p_id]}
                />
              ))}
            </div>
          }
        </div>
      </main>
    </div>
  );
}
