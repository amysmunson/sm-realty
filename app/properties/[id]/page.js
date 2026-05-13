// Page for specific listing accessed via /properties/[id]

import { supabase } from "@/lib/supabase";
import RequestShowing from "@/app/components/forms/RequestShowing";
import RentalApp from "@/app/components/forms/RentalApp";
import PropertyPhotos from "@/app/components/photos/PropertyPhotos";
import { getFeaturePolicyDisplaySections } from "@/app/components/PropertyFeaturesPolicies";

const siteName = "Shen Munson Realty";

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

  // Build a map of file_name to supabase public URL for all photos
  const photoUrls = Object.fromEntries(
    photoData.map((photo) => {
      const { data } = supabase.storage.from("photo_bucket").getPublicUrl(photo.file_name);
      return [photo.file_name, data?.publicUrl || null];
    })
  );

  // Collect all valid photos with photoUrls in a single list to be used for the below
      // PropertyPhotos: the photo display on this page
      // PropertyGalleryModal (rendered inside PropertyPhotos): popup with the full grid of photos
      // PhotoViewer (rendered inside both): fullscreen lightbox viewer for any photo on the page or in the gallery popup
  const galleryPhotos = photoData
    .map((photo, index) => ({
      src: photoUrls[photo.file_name],
      alt: `Photo ${index + 1} of ${property?.address || "property"}`,
    }))
    .filter((photo) => Boolean(photo.src));

  // Pull out the features and policies for display for this property
  const featurePolicySections = getFeaturePolicyDisplaySections(property);

  // Render the bullet list for a given array of items, or return null if there are no items to display for the features and policies sections.
  function renderBulletList(items) {
    if (!items || items.length === 0) {
      return null;
    }

    return (
      <ul className="list-disc space-y-2 pl-5 text-gray-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <main>
      {/* Photo Display. Pulled out for cleanliness */}
      <div className="w-full max-w-7xl mx-auto px-2 md:px-4 py-2 justify-center text-center mb-10 relative">
        <PropertyPhotos photos={galleryPhotos} address={property?.address} />
      </div>
      {/* Display Property Info */}
      <div className="relative w-full max-w-360 mx-auto mb-4 px-2 md:px-4">
        <h1 className="justify-center text-center text-black text-4xl font-bold">{property.address}</h1>
        <p className="text-gray-700 text-center text-lg">{property.city}, CA {property.zip}</p>
      </div>
      {/* Make this left column of the grid smaller */}
      <div className="w-full max-w-360 mx-auto px-2 md:px-3 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7">
          {/* Property details content */}
          {/* Address, City, CA. Beds, Baths, Sqft, Rent, Open Listing Period, Home type, home description */}
          <div className="text-left mb-10">
            <div className="mb-8">
              {/* <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${property.monthly_rent?.toLocaleString()}
                </span>
                <span className="text-gray-500">/month</span>
              </div> */}

              {/* Need lines between each row */}

              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-200 border-y border-gray-200 py-4 gap-4 items-center">
                <div className="px-4 text-center">
                    <div className="text-xl font-semibold text-gray-900">
                      ${property.monthly_rent?.toLocaleString()}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">/month</div>
                </div>
                <div className="px-4 text-center">
                  <div className="text-xl font-semibold text-gray-900">{property.beds}</div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Beds</div>
                </div>
                <div className="px-4 text-center">
                  <div className="text-xl font-semibold text-gray-900">{property.baths}</div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Baths</div>
                </div>
                <div className="px-4 text-center">
                  <div className="text-xl font-semibold text-gray-900">
                    {property.sqft?.toLocaleString()}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Sq Ft</div>
                </div>
                <div className="px-4 text-center md:col-span-1 col-span-2">
                  <div className="text-xl font-semibold text-gray-900">{property.home_type}</div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Type</div>
                </div>
              </div>
            </div>
            <h2 className="font-bold text-lg mb-2">Property Description</h2>
            <p className="text-gray-700 mb-2 whitespace-pre-line">{property.home_desc}</p>
            <h2 className="font-bold text-lg mb-2">Features and Policies</h2>
            <div className="space-y-5">
              {featurePolicySections.map((section) => (
                <section key={section.title}>
                  {renderBulletList(section.items) ? (
                    <h3 className="font-semibold text-gray-900 mb-2 text-md">{section.title}</h3>
                  ) : null}
                  {renderBulletList(section.items) || null}
                </section>
              ))}
            </div>
          </div>
          {/* External Link, either Zillow or Redfin */}
          {property.ext_link ? (
            <div>
              <a href={property.ext_link} target="_blank" rel="noopener noreferrer">
                <button className="bg-blue-950 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded mb-4">
                  {property.ext_link?.includes("zillow") ? "Zillow" : "Redfin"} Listing
                </button>
              </a>
            </div>
          ) : null}
        </div>
        <div className="md:col-span-5">
          {/* Right side */}
          <div>
            {/* request showing form */}
            <RequestShowing
              propertyId={property.p_id}
              propertyAddress={property?.address}
            />
          </div>
          <div className="my-4">
            {/* Rental interest form */}
            <RentalApp
              propertyId={property.p_id}
              propertyAddress={property?.address}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
