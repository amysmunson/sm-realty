// Home Page for Shen Munson Realty

import Image from "next/image";
import Link from "next/link";
import { supabase } from '@/lib/supabase'


// Revalidate daily
export const revalidate = 86400;


export const metadata = {
  title: "Shen Munson Realty",
  description: "Shen Munson Realty's Home Page",
};


export default async function Home() {
  // grab subabase data for properties and photos
  const { data: property_data, error: property_error } = await supabase
    .from('properties')
    .select('*')
    .filter("open_rental", "eq", true);

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

  // Extract homepage photos' file names, sorted by creation time
  const homepagePhotoFiles = (photoData || [])
    .filter((p) => p?.homepage === true)
    .sort((a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0))
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
        <div className="relative w-full h-120 lg:h-screen mb-10">
          <Image
            src={homepagePhotoSrc}
            alt="Home Background"
            fill
            className="object-cover"
            loading="eager"
          />
          <div className="absolute w-full h-full bg-black opacity-30" />
          {/* Alight text to bottom */}
          {/* <div className="absolute flex w-full items-center justify-center bottom-0"> */}
          <div className="absolute inset-0 flex w-full items-center justify-center">
            <h1 className="text-white text-8xl font-bold p-4 rounded">
              Shen Munson Realty
            </h1>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-12 justify-center text-center">
          <section className="relative mx-4 mb-12 overflow-hidden rounded-3xl px-6 py-16">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 top-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
              <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-slate-200/50 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-[70vh] max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col justify-center space-y-5 text-center lg:min-h-[40vh] lg:text-left">
                <div className="mx-auto h-1 w-20 rounded-full bg-blue-950 lg:mx-0" />
                <h2 className="subheading-page">About</h2>
              </div>

              <div className="rounded-3xl p-6 sm:p-8 lg:p-10">
                <p className="text-pretty text-base leading-8 text-gray-700 sm:text-lg sm:leading-9">
                  Based in Sillicon Valley, Shen Munson Realty is a real estate brokerage serving buyers,
                  sellers, landlords, tenants, and property owners throughout the South Bay. Led by a licensed
                  broker with nearly 30 years of local experience and market expertise, Shen Munson Realty
                  provides personalized service and practical guidance to help clients achieve their real estate
                  goals. We specialize in residential rentals, sales, and are committed to helping clients
                  navigate every step. Whether you are renting, selling, or looking for a property managemer,
                  Shen Munson Realty is here to help.
                </p>
              </div>
            </div>
          </section>
          {property_data.length > 0 && (
            <div>
              <div className="py-4">
                <h2 className="text-2xl font-bold m-4 mb-8">
                  <Link href="/properties" className="subheading-page">
                    Properties
                  </Link>
                </h2>
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
                    className="btn-secondary-blue mt-4 font-bold"
                  >
                    See All
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
