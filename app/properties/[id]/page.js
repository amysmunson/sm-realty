// Page for specific listing accessed via /properties/[id]

import { supabase } from "@/lib/supabase";
import RequestShowing from "@/app/components/RequestShowing";
import RentalApp from "@/app/components/RentalApp";
import PropertyPhotos from "@/app/components/PropertyPhotos";
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

  // Helper to send notification emails for both showing requests and rental applications.
  async function notifyRequest(kind, payload) {
    "use server";

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = "Shen Munson Realty <onboarding@resend.dev>";
    const resendTo = process.env.RESEND_TO_EMAIL;

    if (!resendApiKey || !resendTo) {
      return { emailedSuccessfully: false };
    }

    const propertyLabel = property?.address || `Property ID ${id}`;
    const subject =
      kind === "showing"
        ? `New showing request for ${propertyLabel}`
        : `New rental application for ${propertyLabel}`;

    const textLines = [
      `${kind === "showing" ? "New showing request" : "New rental application"} received from the website.`,
      `Property: ${propertyLabel}`,
      `Name: ${payload.name || "(not provided)"}`,
      `Email: ${payload.email || "(not provided)"}`,
      `Phone: ${payload.phone || "(not provided)"}`,
    ];

    if (kind === "showing") {
      textLines.push("", "Preferred showing times:");
      (payload.slots || []).forEach((slot, index) => {
        textLines.push(
          `${index + 1}. ${slot.date || "(no date)"} ${slot.startTime || "(no start)"} - ${slot.endTime || "(no end)"}`
        );
      });
      textLines.push("", "Notes:", payload.notes || "(not provided)");
    } else {
      textLines.push("", "Message:", payload.message || "(not provided)");
    }

    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [resendTo],
          replyTo: payload.email || resendFrom,
          subject,
          text: textLines.join("\n"),
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
              <h2 style="margin:0 0 12px 0">${subject}</h2>
              <p style="margin:0 0 8px 0"><strong>Property:</strong> ${propertyLabel}</p>
              <p style="margin:0 0 8px 0"><strong>Name:</strong> ${payload.name || "(not provided)"}</p>
              <p style="margin:0 0 8px 0"><strong>Email:</strong> ${payload.email || "(not provided)"}</p>
              <p style="margin:0 0 8px 0"><strong>Phone:</strong> ${payload.phone || "(not provided)"}</p>
              ${kind === "showing"
              ? `
                    <p style="margin:16px 0 8px 0"><strong>Preferred showing times:</strong></p>
                    <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px">${textLines
                .slice(6)
                .join("\n")}</div>
                  `
              : `
                    <p style="margin:16px 0 8px 0"><strong>Message:</strong></p>
                    <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px">${payload.message || "(not provided)"}</div>
                  `
            }
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send notification email via Resend:", await emailResponse.text());
        return { emailedSuccessfully: false };
      }

      return { emailedSuccessfully: true };
    } catch (error) {
      console.error("Failed to send notification email via Resend:", error);
      return { emailedSuccessfully: false };
    }
  }

  // Handles form submission for showing requests. Parses the dynamic showing time slots and saves both the request and availability to Supabase, then sends a notification email.
  async function submitShowing(formData) {
    "use server";

    const rawSlots = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("showingDate-") || !value) {
        continue;
      }

      const slotIndex = key.split("-")[1];
      const startTime = String(formData.get(`showingStartTime-${slotIndex}`) ?? "").trim();
      const endTime = String(formData.get(`showingEndTime-${slotIndex}`) ?? "").trim();

      rawSlots.push({
        date: String(value),
        startTime,
        endTime,
      });
    }

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const { error: requestError, data: showingRequest } = await supabase
      .from("showing_reqs")
      .insert({
        p_id: id,
        name,
        email,
        phone,
        notes: notes || null,
      })
      .select("showing_id")
      .single();

    if (requestError) {
      throw new Error(requestError.message || "Unable to save showing request.");
    }

    const availabilityRows = rawSlots.map(({ date, startTime, endTime }) => ({
      showing_id: showingRequest.showing_id,
      available_date: date,
      start_time: new Date(`${date}T${startTime}`).toISOString(),
      end_time: new Date(`${date}T${endTime}`).toISOString(),
    }));

    const { error: availabilityError } = await supabase.from("availability").insert(availabilityRows);

    if (availabilityError) {
      throw new Error(availabilityError.message || "Unable to save showing availability.");
    }

    const notificationResult = await notifyRequest("showing", {
      name,
      email,
      phone,
      notes,
      slots: rawSlots,
      propertyAddress: property?.address,
    });

    return { emailedSuccessfully: notificationResult.emailedSuccessfully };
  }

  // Helper for submitting a rental application/interest form
  async function submitRental(formData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    const { error } = await supabase.from("rental_apps").insert({
      p_id: id,
      name,
      email,
      phone,
      message,
    });

    if (error) {
      throw new Error(error.message || "Unable to save rental application.");
    }

    const notificationResult = await notifyRequest("rental", {
      name,
      email,
      phone,
      message,
      propertyAddress: property?.address,
    });

    return { emailedSuccessfully: notificationResult.emailedSuccessfully };
  }

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
              submitShowing={submitShowing}
            />
          </div>
          <div className="my-4">
            {/* Rental interest form */}
            <RentalApp
              propertyId={property.p_id}
              propertyAddress={property?.address}
              submitRental={submitRental}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
