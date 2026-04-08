// Dashboard Client Component

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/app/components/CurrentUserId";

// Get the first photo for a property, if it exists, from the given data
function getPropertyPhoto(property, photoData) {
  const propertyPhotos = photoData?.filter((photo) => photo.p_id === property.p_id) || [];

  if (propertyPhotos.length > 0) {
    propertyPhotos.sort((a, b) => a.order - b.order);
    return propertyPhotos[0].file_name;
  }

  return null;
}

// If a user is not authorized to view the dashboard, permissions error
function permissionsError() {
  return (
    <div className="container mx-auto px-4 justify-center text-center">
      <h1 className="text-2xl font-bold m-4">Dashboard</h1>
      <p className="pb-10">You do not have permission to view this page.</p>
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const { userId, loading: userLoading } = useCurrentUserId();
  const [propertyData, setPropertyData] = useState([]);
  const [photoData, setPhotoData] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [bucketNames, setBucketNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      // Wait until we have pulled the user ID
      if (userLoading) {
        return;
      }

      // Pulling their session userId as a backup in case the hook doesn't have it
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Temporarily ensuring we have a userId if the route isn't working
      const effectiveUserId = userId || session?.user?.id || false;

      // If user is not signed in, redirect to login page
      if (!effectiveUserId) {
        router.replace("/login");
        return;
      }

      // Pull the users data for this user to check if they are an admin
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id,is_admin")
        .eq("id", effectiveUserId)
        .maybeSingle();

      if (!active) {
        return;
      }

      // If there was an error finding this user, redirect to home
      if (userError || !userRow) {
        router.replace("/");
        return;
      }

      // If this user is not an admin, redirect them to home
      if (!userRow.is_admin) {
        router.replace("/");
        return;
      } 
      // Otherwise they are an admin
      else {
        setAuthorized(true);
      }

      // Admin only from here

      // Load the property data and photo data in parallel
      const [{ data: properties, error: propertyError }, { data: photos, error: photoError }] =
        await Promise.all([
          supabase.from("properties").select("*"),
          supabase.from("photos").select("*"),
        ]);

      if (!active) {
        return;
      }

      // Note any errors
      if (propertyError) {
        setError(propertyError.message || "Unable to load properties.");
      } else {
        setPropertyData(properties || []);
      }

      if (photoError) {
        setError(photoError.message || "Unable to load photos.");
      } else {
        setPhotoData(photos || []);
      }

      // const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

      // console.log("listBuckets result:", { buckets, bucketError });

      // if (!active) {
      //   return;
      // }

      // if (bucketError) {
      //   setError(bucketError.message || "Unable to load storage buckets.");
      // } else {
      //   setBucketNames((buckets || []).map((bucket) => bucket.name));
      // }

      // Generate public URLs for the first photo of each property to display on the dashboard, if they exist
      const urlEntries = await Promise.all(
        (properties || []).map(async (property) => {
          const photoSrc = getPropertyPhoto(property, photos || []);

          if (!photoSrc) {
            return [property.p_id, null];
          }

          const { data } = supabase.storage.from("photo_bucket").getPublicUrl(photoSrc);
          return [property.p_id, data?.publicUrl || null];
        })
      );

      if (!active) {
        return;
      }

      setPhotoUrls(Object.fromEntries(urlEntries));
      // console.log("bucketNames loaded:", (buckets || []).map((bucket) => bucket.name));
      setLoading(false);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router, userId, userLoading]);

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold m-4">Dashboard</h1>
        <p className="text-sm text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!authorized) {
    return permissionsError();
  }

  // Extracting property IDs and any homepage photos
  const propertyIds = propertyData.map((property) => property.p_id).join(",");
  const homepagePhotos = photoData
    .filter((photo) => photo.homepage === true)
    .map((photo) => photo.file_name);

  // A temporary dashboard setup
  return (
    <div>
      <main>
        <div className="relative w-full mb-10 p-4 pt-20">
          <h1 className="justify-center text-center text-black text-4xl font-bold">Dashboard</h1>
        </div>

        <div className="container mx-auto px-4 justify-center text-center">
          <h1 className="text-2xl font-bold m-4">
            <Link href="/properties" className="text-black">
              Properties
            </Link>
          </h1>

          <div className="grid grid-cols-1 h-150 gap-4 mb-20">
            {propertyData?.map((property) => {
              const photoSrc = getPropertyPhoto(property, photoData);
              const photoUrl = photoUrls[property.p_id] || (photoSrc ? supabase.storage.from("photo_bucket").getPublicUrl(photoSrc).data.publicUrl : null);

              return (
                <Link
                  href={`/properties/${property.p_id}`}
                  key={property.p_id}
                  className="flex items-center overflow-hidden gap-4 p-4 bg-white border-gray-200 border b rounded-lg shadow-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <div className="flex items-center justify-center relative aspect-4/3 h-60 rounded-md overflow-hidden bg-gray-300">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={property.address}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        quality={[100, 75]}
                        className="object-cover"
                        loading="eager"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-1/2 h-1/2 text-zinc-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="text-left p-4 pb-8">
                    <div className="font-semibold">{property.address}</div>
                    <div className="text-sm text-gray-600">{property.city}, CA</div>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
}
