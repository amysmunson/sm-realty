// Dashboard Client Component
// Right now this only redirects to subpages of edit, but maybe it's better to have 1 big edit page.

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

function getPropertyName(p_id, propertyData) {
  const property = propertyData.find((p) => p.p_id === p_id);
  return property ? property.address || `Property ${p_id}` : `Property ${p_id}`;
}

// If a user is not authorized to view the dashboard, permissions error
function permissionsError() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <div className="mb-10">
        <h1 className="justify-center text-center text-black text-4xl font-bold">Dashboard</h1>
      </div>
      <p className="pb-10">You do not have permission to view this page.</p>
    </div>
  );
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatAvailabilityDisplay(rows) {
  if (!rows || rows.length === 0) {
    return "—";
  }

  return [...rows]
    .sort((a, b) => {
      const aStart = new Date(a.start_time).getTime();
      const bStart = new Date(b.start_time).getTime();
      return aStart - bStart;
    })
    .map((slot) => {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Invalid time range";
      }

      const formattedDate = start.toLocaleDateString();
      const formattedStart = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const formattedEnd = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${formattedDate} ${formattedStart}-${formattedEnd}`;
    })
    .join("\n");
}

export default function DashboardClient() {
  const router = useRouter();
  const { userId, loading: userLoading } = useCurrentUserId();
  const [propertyData, setPropertyData] = useState([]);
  const [photoData, setPhotoData] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [rentalApps, setRentalApps] = useState([]);
  const [showingRequests, setShowingRequests] = useState([]);
  const [availabilityByShowingId, setAvailabilityByShowingId] = useState({});
  const [agents, setAgents] = useState([]);
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
          supabase.from("properties").select("*").order("open_rental", { ascending: false }),
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

      const [{ data: contactRequests, error: contactRequestError }, { data: rentalApps, error: rentalAppError }, { data: showingRequests, error: showingRequestError }, { data: availabilityRows, error: availabilityError }, { data: agents, error: agentError }] =
        await Promise.all([
          // Version that doesn't show closed requests at the bottom, will be shown in edit page
          supabase.from("contact_reqs").select("*").is("open", true).order("created_at", { ascending: false }),
          supabase.from("rental_apps").select("*").is("open", true).order("created_at", { ascending: false }),
          supabase.from("showing_reqs").select("*").is("open", true).order("created_at", { ascending: false }),
          supabase.from("availability").select("showing_id,available_date,start_time,end_time"),
          supabase.from("agents").select("*").order("name", { ascending: true }),
        ]);

      if (!active) {
        return;
      }

      // Note any errors
      if (contactRequestError) {
        setError(contactRequestError.message || "Unable to load contact requests.");
      } else {
        setContactRequests(contactRequests || []);
      }
      if (rentalAppError) {
        setError(rentalAppError.message || "Unable to load rental applications.");
      } else {
        setRentalApps(rentalApps || []);
      }
      if (showingRequestError) {
        setError(showingRequestError.message || "Unable to load showing requests.");
      } else {
        setShowingRequests(showingRequests || []);
      }
      if (availabilityError) {
        setError(availabilityError.message || "Unable to load availability.");
      } else {
        const grouped = (availabilityRows || []).reduce((acc, row) => {
          const key = row.showing_id;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(row);
          return acc;
        }, {});
        setAvailabilityByShowingId(grouped);
      }
      if (agentError) {
        setError(agentError.message || "Unable to load agents.");
      } else {
        setAgents(agents || []);
      }

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

  // Wait to make sure we have an allowed user before showing anything
  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="mb-10">
          <h1 className="justify-center text-center text-black text-4xl font-bold">Dashboard</h1>
        </div>
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

  // create a map of property ID to address for easy lookup in showing requests
  const propertyIdToAddress = Object.fromEntries(
    propertyData.map((property) => [property.p_id, property.address || "—"])
  );

  console.log(propertyData);

  // The dashboard
  return (
    <div>
      <main>
        {/* Upper right corner edit button. Can also click the text */}
        <div className="text-right p-4 text-sm">
          <Link
            href="/edit"
            className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
          >
            Edit
          </Link>
        </div>
        <div className="relative w-full mb-10 p-4 pt-8">
          <h1 className="justify-center text-center text-black text-4xl font-bold">
            <Link
              href="/edit"
              className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
            >
              <span>
                Dashboard
              </span>
            </Link>
          </h1>
        </div>

        <div label="description" className="container mx-auto px-4 text-center mb-10">
          <p className="text-md text-gray-700">
            Here you can view the essentail information about your properties, contact requests, rental applications, and showing requests all in one place. Click "Edit" or any section header to make changes and view all information.
          </p>
        </div>

        {/* Properties */}
        <div className="container mx-auto px-4 justify-center text-center">
          <h1 className="text-2xl font-bold m-4 text-black">
            <Link
              href="/edit#properties"
              className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
            >
              Properties
            </Link>
          </h1>
        </div>

        <div className="container mx-auto w-full px-4 mb-20 overflow-x-auto text-center">

          <table className="table-auto md:table-fixed w-full my-4 mx-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-1 overflow-auto">Address</th>
                <th className="border border-gray-300 p-1 overflow-auto">City</th>
                <th className="border border-gray-300 p-1 overflow-auto">Beds</th>
                <th className="border border-gray-300 p-1 overflow-auto">Baths</th>
                <th className="border border-gray-300 p-1 overflow-auto">Sqft</th>
                <th className="border border-gray-300 p-1 overflow-auto">Monthly Rent</th>
                <th className="border border-gray-300 p-1 overflow-auto">Home Type</th>
                <th className="border border-gray-300 p-1 overflow-auto">Rental Status</th>
                <th className="border border-gray-300 p-1 overflow-auto">External Listing</th>
                <th className="border border-gray-300 p-1 overflow-auto">Internal Listing</th>
              </tr>
            </thead>
            <tbody>
              {propertyData?.map((property) => {
                return (
                  <tr key={property.p_id} className={property.open_rental === false ? "bg-gray-100" : ""}>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.address || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.city || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.beds || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.baths || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.sqft || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.monthly_rent || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.home_type || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{property.open_rental ? "Open" : "Closed"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">
                      {property.ext_link ?
                        (<a href={property.ext_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          View
                        </a>)
                        : (<a className="text-gray-500 cursor-not-allowed" aria-disabled="true">
                          —
                        </a>)}
                    </td>
                    <td className="border border-gray-300 p-1 overflow-auto">
                      <Link href={`/properties/${property.p_id} `} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>

        {/* Contact Requests */}
        <div className="container mx-auto px-4 justify-center text-center">
          <h1 className="text-2xl font-bold m-4 text-black">
            <Link
              href="/edit#contacts"
              className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
            >
              Contact Requests
            </Link>
          </h1>
        </div>

        <div className="container mx-auto w-full px-4 mb-20 overflow-x-auto text-center">
          {contactRequests && contactRequests.length > 0 ? (
            <table className="table-auto md:table-fixed w-full my-4 mx-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300">Submitted</th>
                  <th className="border border-gray-300">Name</th>
                  <th className="border border-gray-300">Email</th>
                  <th className="border border-gray-300 w-36">Phone</th>
                  <th className="border border-gray-300">Message</th>
                  <th className="border border-gray-300 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {contactRequests?.map((request) => {
                  return (
                    <tr key={request.id} className={request.open === false ? "bg-gray-100" : ""}>
                      <td className="border border-gray-300 p-1 overflow-auto">{formatTimestamp(request.created_at)}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.name || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.email || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.phone || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.message || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.open ? "Open" : "Closed"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No open contact requests at this time. See all existing contact requests <Link href="/edit#contacts" className="text-blue-500 hover:text-blue-700">here</Link>.</p>
          )}

        </div>

        {/* Rental Apps */}
        <div className="container mx-auto px-4 justify-center text-center">
          <h1 className="text-2xl font-bold m-4 text-black">
            <Link
              href="/edit#applications"
              className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
            >
              Rental Applications
            </Link>
          </h1>
        </div>

        <div className="container mx-auto w-full px-4 mb-20 overflow-x-auto text-center">
          {rentalApps && rentalApps.length > 0 ? (
            <table className="table-auto md:table-fixed w-full my-4 mx-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 w-56">Submitted</th>
                  <th className="border border-gray-300 w-48">Property</th>
                  <th className="border border-gray-300 w-56">Name</th>
                  <th className="border border-gray-300 w-56">Email</th>
                  <th className="border border-gray-300 w-40">Phone</th>
                  <th className="border border-gray-300">Notes</th>
                  <th className="border border-gray-300 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {rentalApps?.map((application) => {
                  return (
                    <tr key={application.form_id} className={application.open === false ? "bg-gray-100" : ""}>
                      <td className="border border-gray-300 p-1 overflow-auto">{formatTimestamp(application.created_at)}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{getPropertyName(application.p_id, propertyData) || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{application.name || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{application.email || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{application.phone || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{application.message || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{application.open ? "Open" : "Closed"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No open rental applications at this time. See all existing applications <Link href="/edit#applications" className="text-blue-500 hover:text-blue-700">here</Link>.</p>
          )}

        </div>

        {/* Showing Requests */}
        <div className="container mx-auto px-4 justify-center text-center">
          <h1 className="text-2xl font-bold m-4 text-black">
            <Link
              href="/edit#showings"
              className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
            >
              Showing Requests
            </Link>
          </h1>
        </div>

        <div className="container mx-auto w-full px-4 mb-20 overflow-x-auto text-center">
          {showingRequests && showingRequests.length > 0 ? (
            <table className="table-auto md:table-fixed w-full my-4 mx-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-1 overflow-auto">Submitted</th>
                  <th className="border border-gray-300 p-1 overflow-auto">Property</th>
                  <th className="border border-gray-300 p-1 overflow-auto">Name</th>
                  <th className="border border-gray-300 p-1 overflow-auto">Email</th>
                  <th className="border border-gray-300 p-1 overflow-auto w-36">Phone</th>
                  <th className="border border-gray-300 p-1 overflow-auto">Notes</th>
                  <th className="border border-gray-300 p-1 overflow-auto">Availability</th>
                  <th className="border border-gray-300 p-1 overflow-auto w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {showingRequests?.map((request) => {
                  return (
                    <tr key={request.showing_id} className={request.open === false ? "bg-gray-100" : ""}>
                      <td className="border border-gray-300 p-1 overflow-auto">{formatTimestamp(request.created_at)}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{propertyIdToAddress[request.p_id] || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.name || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.email || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.phone || "—"}</td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.notes || "—"}</td>
                      <td className="border border-gray-300 p-1 whitespace-pre-line text-left">
                        {formatAvailabilityDisplay(availabilityByShowingId[request.showing_id] || [])}
                      </td>
                      <td className="border border-gray-300 p-1 overflow-auto">{request.open ? "Open" : "Closed"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No open showing requests at this time. See all existing showing requests <Link href="/edit#showings" className="text-blue-500 hover:text-blue-700">here</Link>.</p>
          )}

        </div>

        {/* Agents */}
        <div className="container mx-auto px-4 justify-center text-center">
          <h1 className="text-2xl font-bold m-4 text-black">
            <Link
              href="/edit#agents"
              className="inline-flex items-center font-inherit text-inherit hover:text-blue-800 leading-none"
            >
              Agents
            </Link>
          </h1>
        </div>

        <div className="container mx-auto w-full px-4 mb-20 overflow-x-auto text-center">

          <table className="table-auto md:table-fixed w-full my-4 mx-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-1 overflow-auto">Name</th>
                <th className="border border-gray-300 p-1 overflow-auto">Email</th>
                <th className="border border-gray-300 p-1 overflow-auto">Phone</th>
                <th className="border border-gray-300 p-1 overflow-auto">License</th>
                <th className="border border-gray-300 p-1 overflow-auto">DRE #</th>
              </tr>
            </thead>
            <tbody>
              {agents?.map((agent) => {
                return (
                  <tr key={agent.id}>
                    <td className="border border-gray-300 p-1 overflow-auto">{agent.name || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{agent.email || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{agent.phone || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{agent.license || "—"}</td>
                    <td className="border border-gray-300 p-1 overflow-auto">{agent.dre_num || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
      </main>
    </div>
  );
}
