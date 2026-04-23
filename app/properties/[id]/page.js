// Page for specific listing accessed via /properties/[id]

import Image from "next/image";
import { supabase } from "@/lib/supabase";
import RequestShowing from "@/app/components/RequestShowing";
import RentalApp from "@/app/components/RentalApp";
import PropertyGalleryModal from "@/app/components/PropertyGalleryModal";

const siteName = "Amelia Huimin Shen";

async function getProperty(id) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("p_id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// async since metadata depends on the property data
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

  // Pull photos
  const { data: photos, error: photoError } = await supabase
    .from("photos")
    .select("*")
    .eq("p_id", id)
    .order("order", { ascending: true });

  if (photoError) {
    console.error(photoError.message || "Unable to load photos.");
  }

  const photoData = photos || [];
  // Want to pull out the first/main photo
  const mainPhoto = photoData[0] || null;
  // First 4 after the main for the small gallery on the right
  const gridPhotos = photoData.slice(1, 5);

  // Build a map of file_name to supabase public URL for all photos
  const photoUrls = Object.fromEntries(
    photoData.map((photo) => {
      const { data } = supabase.storage.from("photo_bucket").getPublicUrl(photo.file_name);
      return [photo.file_name, data?.publicUrl || null];
    })
  );

  // This is all valid photos with photoUrls for the full gallery
  const galleryPhotos = photoData
    .map((photo, index) => ({
      src: photoUrls[photo.file_name],
      alt: `Photo ${index + 1} of ${property?.address || "property"}`,
    }))
    .filter((photo) => Boolean(photo.src));

  return (
    <main>
      <div className="w-full max-w-7xl mx-auto px-2 md:px-4 py-2 justify-center text-center mb-10 relative">
        {/* If there are any photos */}
        {photoData.length > 0 ? (
          <div className="relative w-full mx-auto">
            {photoData.length === 1 ? (
              // If only one photo, you can just show it by itself
              <div className="relative w-full h-88 md:h-136 overflow-hidden">
                <Image
                  src={photoUrls[mainPhoto.file_name]}
                  alt={`Photo of ${property?.address || "property"}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1152px"
                  className="object-cover"
                  loading="eager"
                  quality={[100, 75]}
                />
              </div>
            ) : ( 
              // For multiple photos, show the first as the main photo and <=4 more in a column on the right
              <div className="grid w-full grid-cols-1 md:grid-cols-12 gap-3 md:items-start">
                <div className="relative h-88 md:h-120 overflow-hidden md:col-span-10">
                  <Image
                    src={photoUrls[mainPhoto.file_name]}
                    alt={`Photo 1 of ${property?.address || "property"}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 78vw, 980px"
                    className="object-cover"
                    loading="eager"
                    quality={[100, 75]}
                  />
                </div>

                <div className="md:col-span-2 w-full max-w-56 md:justify-self-center grid h-88 md:h-120 grid-rows-4 gap-2">
                  {gridPhotos.map((photo, index) => (
                    <div
                      key={`${photo.file_name}-${index}`}
                      className="relative overflow-hidden"
                    >
                      <Image
                        src={photoUrls[photo.file_name]}
                        alt={`Photo ${index + 2} of ${property?.address || "property"}`}
                        fill
                        sizes="(max-width: 768px) 96vw, (max-width: 1280px) 16vw, 220px"
                        className="object-cover"
                        loading="lazy"
                        quality={[100, 75]}
                      />

                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Gallery Modal Button in the lower right of the 4 photo column, will open a popup component */}
            <div className="absolute bottom-0 right-0 z-10 cursor-pointer">
              <PropertyGalleryModal photos={galleryPhotos} address={property?.address} />
            </div>
          </div>
        ) : (
          // Placeholder if no photos for this property
          <div className="relative w-full mx-auto h-88 md:h-136 bg-gray-200 mb-6 flex items-center justify-center overflow-hidden">
            <span className="text-gray-500">No photos available.</span>
          </div>
        )}
      </div>
      {/* Display Property Info */}
      <div className="relative w-full max-w-360 mx-auto mb-4 px-2 md:px-4">
        <h1 className="justify-center text-center text-black text-4xl font-bold">{property.address}</h1>
        <p className="text-gray-700 text-center">{property.city}, CA {property.zip}</p>
      </div>
      {/* Make this left column of the grid smaller */}
      <div className="w-full max-w-360 mx-auto px-2 md:px-3 grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-7">
        {/* Property details content */}
        {/* Address, City, CA. Beds, Baths, Sqft, Rent, Open Listing Period, Home type, home description */}
        <div className="text-left mb-10">
          <p className="text-gray-700 mb-2">${property.monthly_rent}/mo</p>
          <div className="flex flex-wrap w-full gap-8 justify-start">
            <p className="text-gray-700 mb-2">{property.beds} Beds</p>
            <p className="text-gray-700 mb-2">{property.baths} Baths</p>
            <p className="text-gray-700 mb-2">{property.sqft} sqft</p>
          </div>
          <p className="text-gray-700 mb-2">{property.home_type}</p>
          <p className="font-bold text-lg mb-2">Property Details</p>
          <p className="text-gray-700 mb-2 whitespace-pre-line">{property.home_desc}</p>
        </div>
        {/* External Link, either Zillow or Redfin */}
        {property.ext_link ? <div>
          <a href={property.ext_link} target="_blank" rel="noopener noreferrer">
            <button className="bg-blue-950 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded mb-4">
              {property.ext_link?.includes("zillow") ? "Zillow" : "Redfin"} Listing
            </button>
          </a>
        </div>
         : null}
      </div>
      <div className="md:col-span-5">
        {/* Right side */}
        <div>
          {/* request showing form */}
          <RequestShowing propertyId={property.p_id} />
        </div>
        <div className="my-4"> 
          {/* Rental interest form */}
          <RentalApp propertyId={property.p_id} />
        </div>
      </div>
      </div>
    </main>
  );
}
