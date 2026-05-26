// Dashboard Client Component
// Right now this only redirects to subpages of edit, but maybe it's better to have 1 big edit page.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";

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
    <div className="min-h-screen pb-16">
			<main className="mx-auto w-full max-w-375 px-4 pt-20 sm:px-6 lg:px-8">
        <div className="relative w-full">
          <h1 className="heading-page">
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

        <section className="card-intro">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-200/60 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-cyan-200/50 blur-2xl" />

          <div className="relative p-6 sm:p-8">
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              This page displays the relevant property, contact request, showing request, and agent information in a centralized location. 
              The navigation buttons below allow you to jump to the relevant section on this page.
              To view closed contact requests, change the homepage image, or make any edits to the data displayed, click the Edit button. You can also
              click on a section header to jump to editing that secion.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href="#properties" className="btn-nav-pill">Properties</a>
              <a href="#contacts" className="btn-nav-pill">Contacts</a>
              <a href="#showings" className="btn-nav-pill">Showings</a>
              <a href="#applications" className="btn-nav-pill">Applications</a>
              <a href="#agents" className="btn-nav-pill">Agents</a>
            </div>

            <div className="mt-6 rounded-xl">
              <Link
                href="/edit"
                className="btn-primary"
              >
                Edit
              </Link>
            </div>

          </div>
        </section>

        {/* Properties */}
        <div id="properties" className="container mx-auto px-4 justify-center text-center">
          <h1 className="heading-dashboard-section">
            <Link
              href="/edit#properties"
              className="heading-dashboard-link"
            >
              Properties
            </Link>
          </h1>
        </div>

        <div className="container-table">

          <table className="table-dashboard">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-table">Address</th>
                <th className="text-table">City</th>
                <th className="text-table">Beds</th>
                <th className="text-table">Baths</th>
                <th className="text-table">Sqft</th>
                <th className="text-table">Monthly Rent</th>
                <th className="text-table">Home Type</th>
                <th className="text-table">Rental Status</th>
                <th className="text-table">External Listing</th>
                <th className="text-table">Internal Listing</th>
              </tr>
            </thead>
            <tbody>
              {propertyData?.map((property) => {
                return (
                  <tr key={property.p_id} className={property.open_rental === false ? "bg-gray-100" : ""}>
                    <td className="text-table">{property.address || "—"}</td>
                    <td className="text-table">{property.city || "—"}</td>
                    <td className="text-table">{property.beds || "—"}</td>
                    <td className="text-table">{property.baths || "—"}</td>
                    <td className="text-table">{property.sqft || "—"}</td>
                    <td className="text-table">{property.monthly_rent || "—"}</td>
                    <td className="text-table">{property.home_type || "—"}</td>
                    <td className="text-table">{property.open_rental ? "Open" : "Closed"}</td>
                    <td className="text-table">
                      {property.ext_link ?
                        (<a href={property.ext_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          <div className="w-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" />
                            </svg>
                          </div>
                        </a>)
                        : (<a className="text-gray-500 cursor-default" aria-disabled="true">
                          —
                        </a>)}
                    </td>
                    <td className="text-table">
                      <Link href={`/properties/${property.p_id} `} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        <div className="w-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" />
                          </svg>
                        </div>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>

        {/* Contact Requests */}
        <div id="contacts" className="container mx-auto px-4 justify-center text-center">
          <h1 className="heading-dashboard-section">
            <Link
              href="/edit#contacts"
              className="heading-dashboard-link"
            >
              Contact Requests
            </Link>
          </h1>
        </div>

        <div className="container-table">
          {contactRequests && contactRequests.length > 0 ? (
            <table className="table-dashboard">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-table w-52">Submitted</th>
                  <th className="text-table">Name</th>
                  <th className="text-table">Email</th>
                  <th className="text-table w-36">Phone</th>
                  <th className="text-table w-96">Message</th>
                </tr>
              </thead>
              <tbody>
                {contactRequests?.map((request) => {
                  return (
                    <tr key={request.id} className={request.open === false ? "bg-gray-100" : ""}>
                      <td className="text-table">{formatTimestamp(request.created_at)}</td>
                      <td className="text-table">{request.name || "—"}</td>
                      <td className="text-table">{request.email || "—"}</td>
                      <td className="text-table">{request.phone || "—"}</td>
                      <td className="text-table">{request.message || "—"}</td>
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
        <div id="applications" className="container mx-auto px-4 justify-center text-center">
          <h1 className="heading-dashboard-section">
            <Link
              href="/edit#applications"
              className="heading-dashboard-link"
            >
              Property-Specific Contact Requests
            </Link>
          </h1>
        </div>

        <div className="container-table">
          {rentalApps && rentalApps.length > 0 ? (
            <table className="table-dashboard">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-table w-52">Submitted</th>
                  <th className="text-table">Property</th>
                  <th className="text-table">Name</th>
                  <th className="text-table">Email</th>
                  <th className="text-table w-36">Phone</th>
                  <th className="text-table w-96">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rentalApps?.map((application) => {
                  return (
                    <tr key={application.form_id} className={application.open === false ? "bg-gray-100" : ""}>
                      <td className="text-table">{formatTimestamp(application.created_at)}</td>
                      <td className="text-table">{getPropertyName(application.p_id, propertyData) || "—"}</td>
                      <td className="text-table">{application.name || "—"}</td>
                      <td className="text-table">{application.email || "—"}</td>
                      <td className="text-table">{application.phone || "—"}</td>
                      <td className="text-table">{application.message || "—"}</td>
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
        <div id="showings" className="container mx-auto px-4 justify-center text-center">
          <h1 className="heading-dashboard-section">
            <Link
              href="/edit#showings"
              className="heading-dashboard-link"
            >
              Showing Requests
            </Link>
          </h1>
        </div>

        <div className="container-table">
          {showingRequests && showingRequests.length > 0 ? (
            <table className="table-dashboard">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-table w-52">Submitted</th>
                  <th className="text-table w-44">Property</th>
                  <th className="text-table w-44">Name</th>
                  <th className="text-table">Email</th>
                  <th className="text-table w-36">Phone</th>
                  <th className="text-table min-w-60">Notes</th>
                  <th className="text-table min-w-60">Availability</th>
                </tr>
              </thead>
              <tbody>
                {showingRequests?.map((request) => {
                  return (
                    <tr key={request.showing_id} className={request.open === false ? "bg-gray-100" : ""}>
                      <td className="text-table">{formatTimestamp(request.created_at)}</td>
                      <td className="text-table">{propertyIdToAddress[request.p_id] || "—"}</td>
                      <td className="text-table">{request.name || "—"}</td>
                      <td className="text-table">{request.email || "—"}</td>
                      <td className="text-table">{request.phone || "—"}</td>
                      <td className="text-table">{request.notes || "—"}</td>
                      <td className="text-table p-1 whitespace-pre-line text-left">
                        {formatAvailabilityDisplay(availabilityByShowingId[request.showing_id] || [])}
                      </td>
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
        <div id="agents" className="container mx-auto px-4 justify-center text-center">
          <h1 className="heading-dashboard-section">
            <Link
              href="/edit#agents"
              className="heading-dashboard-link"
            >
              Agents
            </Link>
          </h1>
        </div>

        <div className="container-table">

          <table className="table-dashboard">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-table">Name</th>
                <th className="text-table">Email</th>
                <th className="text-table">Phone</th>
                <th className="text-table">License</th>
                <th className="text-table">DRE #</th>
              </tr>
            </thead>
            <tbody>
              {agents?.map((agent) => {
                return (
                  <tr key={agent.id}>
                    <td className="text-table">{agent.name || "—"}</td>
                    <td className="text-table">{agent.email || "—"}</td>
                    <td className="text-table">{agent.phone || "—"}</td>
                    <td className="text-table">{agent.license || "—"}</td>
                    <td className="text-table">{agent.dre_num || "—"}</td>
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
