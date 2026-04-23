// Edit Properties Component

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/app/components/CurrentUserId";

const EDITABLE_FIELDS = [
  "address",
  "city",
  "zip",
  "beds",
  "baths",
  "sqft",
  "monthly_rent",
  "home_type",
  "home_desc",
  "ext_link",
  "open_rental",
];

const MAX_PHOTO_INSERT_RETRIES = 50;

function toNullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableText(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function normalizeProperty(property) {
  return {
    address: toNullableText(property.address),
    city: toNullableText(property.city),
    zip: toNullableText(property.zip),
    beds: toNullableNumber(property.beds),
    baths: toNullableNumber(property.baths),
    sqft: toNullableNumber(property.sqft),
    monthly_rent: toNullableNumber(property.monthly_rent),
    home_type: toNullableText(property.home_type),
    home_desc: toNullableText(property.home_desc),
    ext_link: toNullableText(property.ext_link),
    open_rental: Boolean(property.open_rental),
  };
}

function formatPhotoNameForDisplay(fileName) {
  if (!fileName) {
    return "Unnamed photo";
  }

  const trimmed = String(fileName).replace(/^\/+/, "");
  return trimmed || "Unnamed photo";
}

function buildPhotoInsertErrorMessage(insertError) {
  const message = insertError?.message || "Unable to save one or more photos to the gallery.";
  const isPrimaryKeyCollision = isPhotosPrimaryKeyCollision(insertError);

  if (!isPrimaryKeyCollision) {
    return message;
  }

  return "Photo upload failed because the photos ID sequence is out of sync. In Supabase SQL Editor, run: SELECT setval(pg_get_serial_sequence('public.photos', 'photo_id'), COALESCE((SELECT MAX(photo_id) FROM public.photos), 0) + 1, false);";
}

function isPhotosPrimaryKeyCollision(error) {
  const message = error?.message || "";
  return (
    /duplicate key value violates unique constraint/i.test(message) &&
    /photos_pkey/i.test(message)
  );
}

export default function EditPropertiesClient() {
  const router = useRouter();
  const { userId, loading: userLoading } = useCurrentUserId();

  const [properties, setProperties] = useState([]);
  const [originalPropertiesById, setOriginalPropertiesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [galleryProperty, setGalleryProperty] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [savedGalleryPhotoIds, setSavedGalleryPhotoIds] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState(null);
  const [galleryError, setGalleryError] = useState("");
  const uploadInputRef = useRef(null);

  // Check user admin status and load properties on page load
  useEffect(() => {
    let active = true;

    async function loadPage() {
      if (userLoading) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const effectiveUserId = userId || session?.user?.id || null;

      if (!effectiveUserId) {
        router.replace("/login");
        return;
      }

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id,is_admin")
        .eq("id", effectiveUserId)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (userError || !userRow) {
        router.replace("/");
        return;
      }

      if (!userRow.is_admin) {
        router.replace("/");
        return;
      }

      setAuthorized(true);

      const { data, error: propertiesError } = await supabase
        .from("properties")
        .select("p_id,address,city,zip,beds,baths,sqft,monthly_rent,home_type,home_desc,ext_link,open_rental")
        .order("open_rental", { ascending: false })
        .order("address", { ascending: true });

      if (!active) {
        return;
      }

      if (propertiesError) {
        setError(propertiesError.message || "Unable to load properties.");
      } else {
        const loadedProperties = data || [];
        setProperties(loadedProperties);
        setOriginalPropertiesById(
          Object.fromEntries(
            loadedProperties.map((property) => [property.p_id, normalizeProperty(property)])
          )
        );
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router, userId, userLoading]);

  function updatePropertyField(pId, field, value) {
    setProperties((prev) =>
      prev.map((property) => {
        if (property.p_id !== pId) {
          return property;
        }

        return {
          ...property,
          [field]: value,
        };
      })
    );
  }

  // Mark if a row is dirty by comparing current vals to originals
  function isRowDirty(property) {
    const originalProperty = originalPropertiesById[property.p_id];

    if (!originalProperty) {
      return false;
    }

    const currentProperty = normalizeProperty(property);
    return EDITABLE_FIELDS.some((field) => currentProperty[field] !== originalProperty[field]);
  }

  const hasUnsavedGalleryChanges =
    galleryProperty !== null &&
    savedGalleryPhotoIds.join(",") !== galleryPhotos.map((photo) => String(photo.photo_id)).join(",");

  const hasUnsavedChanges =
    properties.some((property) => isRowDirty(property)) || hasUnsavedGalleryChanges;

  function resetGalleryState() {
    setGalleryProperty(null);
    setGalleryPhotos([]);
    setSavedGalleryPhotoIds([]);
    setGalleryLoading(false);
    setGallerySaving(false);
    setGalleryUploading(false);
    setGalleryDeletingId(null);
    setGalleryError("");

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  }

  function closeGalleryEditor() {
    if (hasUnsavedGalleryChanges) {
      const shouldDiscard = window.confirm("You have unsaved gallery changes. Close without saving?");
      if (!shouldDiscard) {
        return;
      }
    }

    resetGalleryState();
  }

  function getPhotoPublicUrl(fileName) {
    if (!fileName) {
      return null;
    }

    const { data } = supabase.storage.from("photo_bucket").getPublicUrl(fileName);
    return data?.publicUrl || null;
  }

  // Helper if you are editing gallery photos for a row
  async function openGalleryEditor(property) {
    setGalleryProperty(property);
    setGalleryLoading(true);
    setGalleryError("");

    // Pull photos for this property
    const { data, error: photosError } = await supabase
      .from("photos")
      .select("photo_id,file_name,p_id,order,homepage")
      .eq("p_id", property.p_id)
      .order("order", { ascending: true })
      .order("photo_id", { ascending: true });

    if (photosError) {
      setGalleryError(photosError.message || "Unable to load gallery photos.");
      setGalleryPhotos([]);
      setSavedGalleryPhotoIds([]);
    } else {
      // Map the photos to include their public URLs for display in the gallery editor
      const photos = (data || []).map((photo) => ({
        ...photo,
        publicUrl: getPhotoPublicUrl(photo.file_name),
      }));

      setGalleryPhotos(photos);
      setSavedGalleryPhotoIds(photos.map((photo) => String(photo.photo_id)));
    }

    setGalleryLoading(false);
  }

  // Helpers to reorder gallery by up and down buttons
  function movePhoto(array, fromIndex, toIndex) {
    const next = [...array];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  function moveGalleryPhotoByOffset(photoId, offset) {
    setGalleryPhotos((prev) => {
      const fromIndex = prev.findIndex((photo) => photo.photo_id === photoId);
      if (fromIndex === -1) {
        return prev;
      }

      const toIndex = fromIndex + offset;
      if (toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }

      return movePhoto(prev, fromIndex, toIndex);
    });
  }

  async function saveGalleryOrder() {
    if (!galleryProperty || gallerySaving) {
      return;
    }

    setGallerySaving(true);
    setGalleryError("");

    const updates = galleryPhotos
      .map((photo, index) => ({ photoId: photo.photo_id, order: index + 1 }))
      .filter(({ photoId }) => Boolean(photoId));

    const results = await Promise.all(
      updates.map(({ photoId, order }) =>
        supabase
          .from("photos")
          .update({ order })
          .eq("photo_id", photoId)
      )
    );

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      setGalleryError(failed.error.message || "Unable to save gallery order.");
      setGallerySaving(false);
      return;
    }

    setGalleryPhotos((prev) => prev.map((photo, index) => ({ ...photo, order: index + 1 })));
    setSavedGalleryPhotoIds(galleryPhotos.map((photo) => String(photo.photo_id)));
    setGallerySaving(false);
  }

  // Helper to build a safe storage file name and path for uploaded photos, and to handle the upload and associated database record creation with retries for potential photo_id collisions
  function buildStorageFileName(propertyId, originalName, index) {
    const extensionMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
    const baseName = originalName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);

    const safeBaseName = baseName || "photo";
    return `${propertyId}/${Date.now()}-${index}-${safeBaseName}${extension}`;
  }

  async function handleUploadFiles(event) {
    if (!galleryProperty || galleryUploading) {
      return;
    }

    // this allows multiple file upload
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setGalleryUploading(true);
    setGalleryError("");

    let maxOrder = Math.max(0, ...galleryPhotos.map((photo) => Number(photo.order) || 0));
    const createdPhotos = [];

    // Upload each file to storage and create associated photo record in the database one at a time with retries for potential photo_id collisions
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const storageFileName = buildStorageFileName(galleryProperty.p_id, file.name, index + 1);

      const { error: uploadError } = await supabase.storage
        .from("photo_bucket")
        .upload(storageFileName, file, { upsert: false });

      if (uploadError) {
        setGalleryError(uploadError.message || "Unable to upload one or more photos.");
        continue;
      }

      maxOrder += 1;

      let insertedPhoto = null;
      let insertError = null;

      // photo_id collision means you have to retry with new ids. Let's review this later and make it much more efficient. Ideally even random number is better
      for (let attempt = 0; attempt < MAX_PHOTO_INSERT_RETRIES; attempt += 1) {
        const result = await supabase
          .from("photos")
          .insert({
            file_name: storageFileName,
            p_id: galleryProperty.p_id,
            order: maxOrder,
            homepage: false,
          })
          .select("photo_id,file_name,p_id,order,homepage")
          .single();

        insertedPhoto = result.data || null;
        insertError = result.error || null;

        if (insertedPhoto && !insertError) {
          break;
        }

        if (!isPhotosPrimaryKeyCollision(insertError)) {
          break;
        }
      }

      if (insertError || !insertedPhoto) {
        if (storageFileName) {
          await supabase.storage.from("photo_bucket").remove([storageFileName]);
        }
        setGalleryError(buildPhotoInsertErrorMessage(insertError));
        continue;
      }

      createdPhotos.push({
        ...insertedPhoto,
        publicUrl: getPhotoPublicUrl(insertedPhoto.file_name),
      });
    }

    if (createdPhotos.length > 0) {
      setGalleryPhotos((prev) => [...prev, ...createdPhotos]);
      setSavedGalleryPhotoIds((prev) => [
        ...prev,
        ...createdPhotos.map((photo) => String(photo.photo_id)),
      ]);
    }

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    setGalleryUploading(false);
  }

  async function deleteGalleryPhoto(photo) {
    if (!photo?.photo_id || galleryDeletingId) {
      return;
    }

    const shouldDelete = window.confirm("Delete this photo from the gallery?");
    if (!shouldDelete) {
      return;
    }

    setGalleryDeletingId(photo.photo_id);
    setGalleryError("");

    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("photo_id", photo.photo_id);

    if (deleteError) {
      setGalleryError(deleteError.message || "Unable to delete photo.");
      setGalleryDeletingId(null);
      return;
    }

    if (photo.file_name) {
      await supabase.storage.from("photo_bucket").remove([photo.file_name]);
    }

    setGalleryPhotos((prev) => prev.filter((item) => item.photo_id !== photo.photo_id));
    setSavedGalleryPhotoIds((prev) => prev.filter((id) => id !== String(photo.photo_id)));
    setGalleryDeletingId(null);
  }

  // Prevents user from navigating away with unsaved changes by prompting them
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleDocumentClick(event) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest("a[href]");
      if (!anchor) {
        return;
      }

      // Allow new-tab behavior without a prompt.
      if (anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameLocation =
        nextUrl.origin === currentUrl.origin &&
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash;

      if (isSameLocation) {
        return;
      }

      const shouldLeave = window.confirm("You have unsaved changes. Leave without saving?");
      if (!shouldLeave) {
        event.preventDefault();
      }
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  async function saveProperty(property) {
    setSavingId(property.p_id);
    setError("");

    const payload = {
      address: property.address || null,
      city: property.city || null,
      zip: property.zip || null,
      beds: toNullableNumber(property.beds),
      baths: toNullableNumber(property.baths),
      sqft: toNullableNumber(property.sqft),
      monthly_rent: toNullableNumber(property.monthly_rent),
      home_type: property.home_type || null,
      home_desc: property.home_desc || null,
      ext_link: property.ext_link || null,
      open_rental: Boolean(property.open_rental),
    };

    const { error: updateError } = await supabase
      .from("properties")
      .update(payload)
      .eq("p_id", property.p_id);

    if (updateError) {
      setError(updateError.message || "Unable to save property.");
    } else {
      setOriginalPropertiesById((prev) => ({
        ...prev,
        [property.p_id]: normalizeProperty(property),
      }));
    }

    setSavingId(null);
  }

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <p className="text-sm text-gray-600">Loading properties...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-4">
      {error ? (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Address</th>
              <th className="border border-gray-300 p-2">City</th>
              <th className="border border-gray-300 p-2">ZIP</th>
              <th className="border border-gray-300 p-2">Beds</th>
              <th className="border border-gray-300 p-2">Baths</th>
              <th className="border border-gray-300 p-2">Sqft</th>
              <th className="border border-gray-300 p-2">Monthly Rent</th>
              <th className="border border-gray-300 p-2">Home Type</th>
              <th className="border border-gray-300 p-2">Description</th>
              <th className="border border-gray-300 p-2">External Link</th>
              <th className="border border-gray-300 p-2">Open</th>
              <th className="border border-gray-300 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.p_id} className={property.open_rental ? "" : "bg-gray-50"}>
                {(() => {
                  const rowDirty = isRowDirty(property);
                  return (
                    <>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="text"
                          value={property.address || ""}
                          placeholder={"—"}
                          onChange={(event) => updatePropertyField(property.p_id, "address", event.target.value)}
                          className="w-32 rounded  p-1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="text"
                          value={property.city || ""}
                          placeholder={"—"}
                          onChange={(event) => updatePropertyField(property.p_id, "city", event.target.value)}
                          className="w-20 rounded  p-1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="text"
                          value={property.zip || ""}
                          placeholder={"—"}
                          onChange={(event) => updatePropertyField(property.p_id, "zip", event.target.value)}
                          className="w-12 rounded  p-1 text-center"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={property.beds ?? ""}
                          placeholder={"0"}
                          onChange={(event) => updatePropertyField(property.p_id, "beds", event.target.value)}
                          className="w-12 rounded p-1 block mx-auto text-center"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={property.baths ?? ""}
                          placeholder={"0"}
                          onChange={(event) => updatePropertyField(property.p_id, "baths", event.target.value)}
                          className="w-12 rounded p-1 block mx-auto text-center"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={property.sqft ?? ""}
                          placeholder={"0"}
                          onChange={(event) => updatePropertyField(property.p_id, "sqft", event.target.value)}
                          className="w-16 rounded p-1 block mx-auto text-center"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={property.monthly_rent ?? ""}
                          placeholder={"0"}
                          onChange={(event) => updatePropertyField(property.p_id, "monthly_rent", event.target.value)}
                          className="w-20 rounded p-1 block mx-auto text-center"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <select
                          value={property.home_type || ""}
                          onChange={(event) => updatePropertyField(property.p_id, "home_type", event.target.value)}
                          className="w-40 rounded  p-1"
                        >
                          <option value="Single-Family Home">Single-Family Home</option>
                          <option value="Condominium">Condominium</option>
                          <option value="Duplex">Duplex</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <textarea
                          value={property.home_desc || ""}
                          placeholder={"A description of the property and its features goes here."}
                          onChange={(event) => updatePropertyField(property.p_id, "home_desc", event.target.value)}
                          rows={3}
                          className="w-84 rounded  p-1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="url"
                          value={property.ext_link || ""}
                          placeholder={"Zillow or Redfin Link"}
                          onChange={(event) => updatePropertyField(property.p_id, "ext_link", event.target.value)}
                          className="w-44 rounded  p-1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(property.open_rental)}
                          onChange={(event) => updatePropertyField(property.p_id, "open_rental", event.target.checked)}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openGalleryEditor(property)}
                            className="rounded border border-blue-200 px-3 py-1 text-blue-800 hover:bg-blue-50"
                          >
                            Photos
                          </button>
                          <button
                            type="button"
                            onClick={() => saveProperty(property)}
                            disabled={savingId === property.p_id || !rowDirty}
                            className={`rounded px-3 py-1 text-white disabled:opacity-60 ${rowDirty
                                ? "bg-blue-950 hover:bg-blue-800"
                                : "bg-gray-400 cursor-not-allowed"
                              }`}
                          >
                            {savingId === property.p_id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {galleryProperty ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4"
          onClick={closeGalleryEditor}
        >
          <div
            className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Photo Gallery</h2>
                <p className="text-sm text-gray-600">{galleryProperty.address}</p>
              </div>
              <button
                type="button"
                onClick={closeGalleryEditor}
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-5 py-4">
              <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                Upload/delete actions save immediately. Reordering is a draft until you click Save Order.
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label
                  htmlFor="gallery-upload-input"
                  className={`rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 ${galleryUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-gray-100"
                    }`}
                >
                  {galleryUploading ? "Uploading..." : "Upload Photo"}
                </label>
                <input
                  id="gallery-upload-input"
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadFiles}
                  disabled={galleryUploading || gallerySaving}
                  className="hidden"
                />
              </div>

              {galleryError ? (
                <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{galleryError}</p>
              ) : null}

              {galleryLoading ? (
                <p className="text-sm text-gray-600">Loading gallery photos...</p>
              ) : null}

              {!galleryLoading && galleryPhotos.length === 0 ? (
                <p className="text-sm text-gray-600">No photos found for this listing yet.</p>
              ) : null}

              {!galleryLoading && galleryPhotos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryPhotos.map((photo, index) => (
                    <div
                      key={photo.photo_id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide text-blue-900">Photo {index + 1}</span>
                        {/* <span className="text-xs text-gray-500">Use arrows</span> */}
                      </div>

                      {photo.publicUrl ? (
                        <img
                          src={photo.publicUrl}
                          alt={`Property photo ${index + 1}`}
                          className="h-40 w-full rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded bg-gray-200 text-sm text-gray-500">
                          Preview unavailable
                        </div>
                      )}

                      <p className="mt-2 truncate text-xs text-gray-500">{formatPhotoNameForDisplay(photo.file_name)}</p>

                      <div className="mt-3 flex justify-between gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => moveGalleryPhotoByOffset(photo.photo_id, -1)}
                            disabled={index === 0}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                            </svg>

                          </button>
                          <button
                            type="button"
                            onClick={() => moveGalleryPhotoByOffset(photo.photo_id, 1)}
                            disabled={index === galleryPhotos.length - 1}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>

                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteGalleryPhoto(photo)}
                          disabled={galleryDeletingId === photo.photo_id || gallerySaving}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-40 hover:bg-red-50"
                        >
                          {galleryDeletingId === photo.photo_id ? "Deleting..." :
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closeGalleryEditor}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveGalleryOrder}
                disabled={!hasUnsavedGalleryChanges || gallerySaving || galleryLoading}
                className="rounded bg-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-800"
              >
                {gallerySaving ? "Saving Order..." : "Save Order"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
