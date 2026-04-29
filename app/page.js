// Home Page for Amelia Shen

import Image from "next/image";
import Link from "next/link";
import { supabase } from '@/lib/supabase'

export const metadata = {
  title: "Amelia Huimin Shen, Broker",
  description: "Broker Amelia Huimin Shen's Home Page",
};


export default async function Home() {
  // grab subabase data for properties and photos
  const { data: property_data, error: property_error } = await supabase
    .from('properties')
    .select('*')

  if (property_error) {
    console.error(property_error)
  }

  // extract property ids
  const propertyIds = property_data.map(p => p.p_id).join(',');

  const { data: photoData, error: photoError } = await supabase
    .from('photos')
    .select('*')
    // Pulls property page photos with order=1 and homepage photos
    .or(
      `and(p_id.in.(${propertyIds}),order.eq.1), homepage.eq.true`
    );

  if (photoError) {
    console.error(photoError)
  }

  // Extract homepage photos' file names, sorted by photo_id
  const homepagePhotoFiles = (photoData || [])
    .filter((p) => p?.homepage === true)
    .sort((a, b) => (a?.photo_id || 0) - (b?.photo_id || 0))
    .map((p) => p.file_name)
    .filter(Boolean);

  // Generates the public url for the homepage
  const homepagePhotoSrc = (() => {
    const firstHomepageFile = homepagePhotoFiles[0];
    if (!firstHomepageFile) {
      return "/placeholder_home_image2.jpg";
    }

    const { data } = supabase.storage.from("photo_bucket").getPublicUrl(firstHomepageFile);
    return data?.publicUrl || "/placeholder_home_image2.jpg";
  })();


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
    return firstPhotoByProperty;
  }

  // Precompute first photo once to prevent per-property filter/sort in render
  const firstPhotoByProperty = buildFirstPhotoMap(photoData);

  // Generate public URLs for the first photo of each property to display on the dashboard if they exist
  const photoUrls = Object.fromEntries(
    property_data.map((property) => {
      const photoSrc = firstPhotoByProperty.get(property.p_id);
      if (!photoSrc) return [property.p_id, null];

      const { data } = supabase.storage.from("photo_bucket").getPublicUrl(photoSrc.file_name);
      return [property.p_id, data?.publicUrl || null];
    })
  );

  return (
    <div>
      <main>
        <div className="relative w-full h-150 mb-10">
          <Image
            src={homepagePhotoSrc}
            alt="Home Background"
            fill
            className="object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-white text-4xl font-bold p-4 rounded">
              Amelia Huimin Shen, Broker
            </h1>
          </div>
        </div>
        <div className="container mx-auto px-4 justify-center text-center">
          <div className="py-4">
            <h1 className="text-2xl font-bold m-4">
              <Link href="/properties" className="text-black">
                Properties
              </Link>
            </h1>
            {/* grid of properties, card style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {property_data?.map(property => {
                // Grab the photo for this property, otherwise null
                // const photoSrc = getPropertyPhoto(property, photoData);

                return (
                  // Card for property
                  <Link
                    href={`/properties/${property.p_id}`}
                    key={property.p_id}
                    className="flex flex-col items-center overflow-hidden gap-4 bg-white border-gray-200 border b rounded-lg shadow-md hover:bg-gray-100 transition cursor-pointer"
                  >
                    {/* Property Image or Icon depending on if the property has any photos */}
                    <div className="flex items-center justify-center relative w-full aspect-4/3 bg-gray-300">
                      {photoUrls[property.p_id] ? (
                        <Image
                          src={photoUrls[property.p_id]}
                          alt={property.address}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        // Image icon from heroicons, only show if no photos for this property
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-1/2 h-1/2 text-zinc-500"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      )}
                    </div>


                    {/* Address */}
                    <div className='text-center p-4 pb-8'>
                      <div className="font-semibold">{property.address}</div>
                      <div className="text-sm text-gray-600">{property.city}, CA</div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="my-8">
              <Link
                href="/properties"
                className="bg-white border-2 border-blue-950 hover:bg-blue-950 text-blue-950 hover:text-white font-bold py-2 px-4 rounded mt-4"
              >
                See All
              </Link>
            </div>
          </div>
          <h1 className="text-2xl font-bold m-4">About</h1>
          <p className="pb-10">
            We help clients rent and sell properties.
          </p>
        </div>
      </main>
    </div>
  );
}
