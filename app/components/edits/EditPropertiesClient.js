// Edit Properties Component

"use client";

import { useEffect, useRef, useState } from "react";
import { setComponentUnsaved } from "@/lib/unsavedClient";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import {
  FEATURE_POLICY_GROUPS,
  getEmptyFeaturePolicyData,
  normalizeFeaturePolicyData,
  serializeFeaturePolicyData,
} from "@/app/components/PropertyFeaturesPolicies";

const EDITABLE_FIELDS = [
  "address",
  "city",
  "zip",
  "beds",
  "baths",
  "full_baths",
  "sqft",
  "monthly_rent",
  "home_type",
  "home_desc",
  "ext_link",
  "feature_policy_data",
  "open_rental",
];

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
    full_baths: toNullableNumber(property.full_baths),
    sqft: toNullableNumber(property.sqft),
    monthly_rent: toNullableNumber(property.monthly_rent),
    home_type: toNullableText(property.home_type),
    home_desc: toNullableText(property.home_desc),
    ext_link: toNullableText(property.ext_link),
    feature_policy_data: normalizeFeaturePolicyData(property.feature_policy_data),
    open_rental: Boolean(property.open_rental),
  };
}

function cloneFeaturePolicyData(value) {
  return serializeFeaturePolicyData(value);
}

function getFeaturePolicyItems(property, category) {
  return cloneFeaturePolicyData(property?.feature_policy_data)?.[category] || [];
}

function updateFeaturePolicyItem(property, category, index, value) {
  const nextData = cloneFeaturePolicyData(property.feature_policy_data);
  nextData[category] = nextData[category].map((item, itemIndex) => (itemIndex === index ? value : item));
  return nextData;
}

function addFeaturePolicyItem(property, category) {
  const nextData = cloneFeaturePolicyData(property.feature_policy_data);
  nextData[category] = [...nextData[category], ""];
  return nextData;
}

function removeFeaturePolicyItem(property, category, index) {
  const nextData = cloneFeaturePolicyData(property.feature_policy_data);
  nextData[category] = nextData[category].filter((_, itemIndex) => itemIndex !== index);
  return nextData;
}

function formatPhotoNameForDisplay(fileName) {
  if (!fileName) {
    return "Unnamed photo";
  }

  const trimmed = String(fileName).replace(/^\/+/, "");
  return trimmed || "Unnamed photo";
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
  const [deletingId, setDeletingId] = useState(null);
  const [galleryProperty, setGalleryProperty] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [savedGalleryPhotoIds, setSavedGalleryPhotoIds] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState(null);
  const [galleryError, setGalleryError] = useState("");
  const [detailsProperty, setDetailsProperty] = useState(null);
  const [detailsFeaturePolicyData, setDetailsFeaturePolicyData] = useState(getEmptyFeaturePolicyData());
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState("");
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
        .select("p_id,address,city,zip,beds,baths,full_baths,sqft,monthly_rent,home_type,home_desc,ext_link,feature_policy_data,open_rental")
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

    // For feature_policy_data, we need to compare the JSON strings, but for other fields a simple equality check
    const currentProperty = normalizeProperty(property);
    return EDITABLE_FIELDS.some((field) => {
      if (field === "feature_policy_data") {
        return JSON.stringify(currentProperty[field]) !== JSON.stringify(originalProperty[field]);
      }

      return currentProperty[field] !== originalProperty[field];
    });
  }

  const hasUnsavedGalleryChanges =
    galleryProperty !== null &&
    savedGalleryPhotoIds.join(",") !== galleryPhotos.map((photo) => photo.id).join(",");

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

  // Features and Policies Editor Helpers
  function closeDetailsEditor() {
    setDetailsProperty(null);
    setDetailsFeaturePolicyData(getEmptyFeaturePolicyData());
    setDetailsSaving(false);
    setDetailsError("");
  }

  function openDetailsEditor(property) {
    setDetailsProperty({
      ...property,
    });
    setDetailsFeaturePolicyData(cloneFeaturePolicyData(property.feature_policy_data));
    setDetailsError("");
  }

  function updateDetailsField(field, value) {
    setDetailsProperty((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        [field]: value,
      };
    });

    setProperties((prev) =>
      prev.map((property) => {
        if (!detailsProperty || property.p_id !== detailsProperty.p_id) {
          return property;
        }

        return {
          ...property,
          [field]: value,
        };
      })
    );
  }

  function updateDetailsFeaturePolicy(category, index, value) {
    setDetailsFeaturePolicyData((prev) => ({
      ...prev,
      [category]: prev[category].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function addDetailsFeaturePolicy(category) {
    setDetailsFeaturePolicyData((prev) => ({
      ...prev,
      [category]: [...prev[category], ""],
    }));
  }

  function removeDetailsFeaturePolicy(category, index) {
    setDetailsFeaturePolicyData((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

// End of features and policies editor helpers

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
      .select("id,file_name,p_id,order,homepage")
      .eq("p_id", property.p_id)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true });

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
      setSavedGalleryPhotoIds(photos.map((photo) => photo.id));
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
      const fromIndex = prev.findIndex((photo) => photo.id === photoId);
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
      .map((photo, index) => ({ photoId: photo.id, order: index + 1 }))
      .filter(({ photoId }) => Boolean(photoId));

    const results = await Promise.all(
      updates.map(({ photoId, order }) =>
        supabase
          .from("photos")
          .update({ order })
          .eq("id", photoId)
      )
    );

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      setGalleryError(failed.error.message || "Unable to save gallery order.");
      setGallerySaving(false);
      return;
    }

    setGalleryPhotos((prev) => prev.map((photo, index) => ({ ...photo, order: index + 1 })));
    setSavedGalleryPhotoIds(galleryPhotos.map((photo) => photo.id));
    setGallerySaving(false);
  }

  // Helper to build a safe storage file name and path for uploaded photos
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

    // Upload each file to storage and create associated photo record in the database one at a time
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

      const { data: insertedPhoto, error: insertError } = await supabase
        .from("photos")
        .insert({
          file_name: storageFileName,
          p_id: galleryProperty.p_id,
          order: maxOrder,
          homepage: false,
        })
        .select("id,file_name,p_id,order,homepage")
        .single();

      if (insertError || !insertedPhoto) {
        if (storageFileName) {
          await supabase.storage.from("photo_bucket").remove([storageFileName]);
        }
        setGalleryError(insertError?.message || "Unable to save one or more photos to the gallery.");
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
        ...createdPhotos.map((photo) => photo.id),
      ]);
    }

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    setGalleryUploading(false);
  }

  async function deleteGalleryPhoto(photo) {
    if (!photo?.id || galleryDeletingId) {
      return;
    }

    const shouldDelete = window.confirm("Delete this photo from the gallery?");
    if (!shouldDelete) {
      return;
    }

    setGalleryDeletingId(photo.id);
    setGalleryError("");

    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photo.id);

    if (deleteError) {
      setGalleryError(deleteError.message || "Unable to delete photo.");
      setGalleryDeletingId(null);
      return;
    }

    if (photo.file_name) {
      await supabase.storage.from("photo_bucket").remove([photo.file_name]);
    }

    setGalleryPhotos((prev) => prev.filter((item) => item.id !== photo.id));
    setSavedGalleryPhotoIds((prev) => prev.filter((id) => id !== photo.id));
    setGalleryDeletingId(null);
  }

  // Register this component's unsaved state with global handler to avoid duplicates
  const _unsavedId = useRef(null);
  if (_unsavedId.current === null) _unsavedId.current = String(Math.random());

  useEffect(() => {
    setComponentUnsaved(_unsavedId.current, hasUnsavedChanges);
    return () => setComponentUnsaved(_unsavedId.current, false);
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
      full_baths: toNullableNumber(property.full_baths),
      sqft: toNullableNumber(property.sqft),
      monthly_rent: toNullableNumber(property.monthly_rent),
      home_type: property.home_type || null,
      home_desc: property.home_desc || null,
      ext_link: property.ext_link || null,
      feature_policy_data: serializeFeaturePolicyData(property.feature_policy_data),
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

  async function deleteProperty(property) {
    if (!property?.p_id || deletingId || savingId === property.p_id) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this property? This will also remove its photos from the gallery."
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingId(property.p_id);
    setError("");

    const { data: propertyPhotos, error: photosError } = await supabase
      .from("photos")
      .select("id,file_name")
      .eq("p_id", property.p_id);

    if (photosError) {
      setError(photosError.message || "Unable to load property photos for deletion.");
      setDeletingId(null);
      return;
    }

    const fileNames = (propertyPhotos || [])
      .map((photo) => photo.file_name)
      .filter(Boolean);

    if (fileNames.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("photo_bucket")
        .remove(fileNames);

      if (storageError) {
        setError(storageError.message || "Unable to remove property photos from storage.");
        setDeletingId(null);
        return;
      }
    }

    const { error: deletePhotosError } = await supabase
      .from("photos")
      .delete()
      .eq("p_id", property.p_id);

    if (deletePhotosError) {
      setError(deletePhotosError.message || "Unable to delete property photos.");
      setDeletingId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("p_id", property.p_id);

    if (deleteError) {
      setError(deleteError.message || "Unable to delete property.");
      setDeletingId(null);
      return;
    }

    if (galleryProperty?.p_id === property.p_id) {
      resetGalleryState();
    }

    if (detailsProperty?.p_id === property.p_id) {
      closeDetailsEditor();
    }

    setProperties((prev) => prev.filter((item) => item.p_id !== property.p_id));
    setOriginalPropertiesById((prev) => {
      const next = { ...prev };
      delete next[property.p_id];
      return next;
    });

    setSavingId((current) => (current === property.p_id ? null : current));
    setDeletingId(null);
  }

  async function saveDetailsEditor() {
    if (!detailsProperty) {
      return;
    }

    setDetailsSaving(true);
    setDetailsError("");

    const payload = {
      beds: toNullableNumber(detailsProperty.beds),
      baths: toNullableNumber(detailsProperty.baths),
      full_baths: toNullableNumber(detailsProperty.full_baths),
      feature_policy_data: serializeFeaturePolicyData(detailsFeaturePolicyData),
    };

    const { error: updateError } = await supabase
      .from("properties")
      .update(payload)
      .eq("p_id", detailsProperty.p_id);

    if (updateError) {
      setDetailsError(updateError.message || "Unable to save features and policies.");
      setDetailsSaving(false);
      return;
    }

    setProperties((prev) =>
      prev.map((property) =>
        property.p_id === detailsProperty.p_id
          ? {
            ...property,
            beds: toNullableNumber(detailsProperty.beds),
            baths: toNullableNumber(detailsProperty.baths),
            full_baths: toNullableNumber(detailsProperty.full_baths),
            feature_policy_data: serializeFeaturePolicyData(detailsFeaturePolicyData),
          }
          : property
      )
    );

    setOriginalPropertiesById((prev) => ({
      ...prev,
      [detailsProperty.p_id]: {
        ...prev[detailsProperty.p_id],
        beds: toNullableNumber(detailsProperty.beds),
        baths: toNullableNumber(detailsProperty.baths),
        full_baths: toNullableNumber(detailsProperty.full_baths),
        feature_policy_data: serializeFeaturePolicyData(detailsFeaturePolicyData),
      },
    }));

    setDetailsSaving(false);
    closeDetailsEditor();
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
              <th className="border border-gray-300 p-2">Full Baths</th>
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
                          value={property.full_baths ?? ""}
                          placeholder={"0"}
                          onChange={(event) => updatePropertyField(property.p_id, "full_baths", event.target.value)}
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
                          className="w-16 rounded p-1 block mx-auto text-center"
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
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={property.home_desc || ""}
                            placeholder={"A description of the property and its features goes here."}
                            onChange={(event) => updatePropertyField(property.p_id, "home_desc", event.target.value)}
                            rows={3}
                            // height should adjust with content up to a max of 100px, then scroll
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = `${Math.min(el.scrollHeight, 500)}px`;
                              }
                            }}
                            className="w-84 rounded p-1 resize-none overflow-y-auto"
                            style={{ maxHeight: "200px" }}
                          // className='w-84 rounded p-1 ${property.home_desc ? "h-100" : ""}'
                          />
                          <button
                            type="button"
                            onClick={() => openDetailsEditor(property)}
                            className="rounded border border-blue-950 px-3 py-1 text-blue-950 hover:bg-blue-950 hover:text-white flex justify-center"
                          >
                            Features and Policies
                          </button>
                        </div>
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
                            className="rounded border border-blue-950 px-1 py-1 text-blue-950 hover:bg-blue-50 flex justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>

                          </button>
                          <button
                            type="button"
                            onClick={() => saveProperty(property)}
                            disabled={savingId === property.p_id || !rowDirty}
                            aria-label={savingId === property.p_id ? "Saving..." : "Save"}
                            className={`rounded px-1 py-1 text-white disabled:opacity-60 flex justify-center ${rowDirty
                              ? "bg-blue-950 hover:bg-blue-800"
                              : "bg-gray-400 cursor-not-allowed"
                              }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                            </svg>

                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProperty(property)}
                            className="rounded border border-blue-950 px-1 py-1 text-blue-950 hover:bg-red-800 hover:text-white hover:border-red-800 flex justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
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

      {detailsProperty ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4"
          onClick={closeDetailsEditor}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Features and Policies</h2>
                <p className="text-sm text-gray-600">{detailsProperty.address}</p>
              </div>
              <button
                type="button"
                onClick={closeDetailsEditor}
                className="px-3 py-1 text-sm text-gray-700 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-5 py-4 space-y-6">
              {detailsError ? (
                <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detailsError}</p>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">Features</h3>
                <p className="mt-1 text-sm text-slate-600">Add each bullet as its own line item. No formatting needed.</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Beds</span>
                    <input
                      type="number"
                      value={detailsProperty.beds ?? ""}
                      onChange={(event) => updateDetailsField("beds", event.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Total Baths</span>
                    <input
                      type="number"
                      value={detailsProperty.baths ?? ""}
                      onChange={(event) => updateDetailsField("baths", event.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Full Baths</span>
                    <input
                      type="number"
                      value={detailsProperty.full_baths ?? ""}
                      onChange={(event) => updateDetailsField("full_baths", event.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="mt-4 space-y-4">
                  {FEATURE_POLICY_GROUPS.features.map((group) => (
                    <div key={group.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-medium text-slate-900">{group.label}</h4>
                        <button
                          type="button"
                          onClick={() => addDetailsFeaturePolicy(group.key)}
                          className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-800 hover:bg-blue-50"
                        >
                          + Add bullet
                        </button>
                      </div>
                      <div className="space-y-2">
                        {/* {getFeaturePolicyItems(detailsProperty, group.key).length === 0 ? (
                          <p className="text-sm text-slate-500">No bullets yet.</p>
                        ) : null} */}
                        {detailsFeaturePolicyData[group.key].map((item, index) => (
                          <div key={`${group.key}-${index}`} className="flex gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(event) => updateDetailsFeaturePolicy(group.key, index, event.target.value)}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                            />
                            <button
                              type="button"
                              onClick={() => removeDetailsFeaturePolicy(group.key, index)}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">Policies</h3>
                <p className="mt-1 text-sm text-slate-600">Use short bullets so the listing reads cleanly.</p>
                <div className="mt-4 space-y-4">
                  {FEATURE_POLICY_GROUPS.policies.map((group) => (
                    <div key={group.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-medium text-slate-900">{group.label}</h4>
                        <button
                          type="button"
                          onClick={() => addDetailsFeaturePolicy(group.key)}
                          className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-800 hover:bg-blue-50"
                        >
                          + Add bullet
                        </button>
                      </div>
                      <div className="space-y-2">
                        {/* {getFeaturePolicyItems(detailsProperty, group.key).length === 0 ? (
                          <p className="text-sm text-slate-500">No bullets yet.</p>
                        ) : null} */}
                        {detailsFeaturePolicyData[group.key].map((item, index) => (
                          <div key={`${group.key}-${index}`} className="flex gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(event) => updateDetailsFeaturePolicy(group.key, index, event.target.value)}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                            />
                            <button
                              type="button"
                              onClick={() => removeDetailsFeaturePolicy(group.key, index)}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closeDetailsEditor}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDetailsEditor}
                disabled={detailsSaving}
                className="rounded bg-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-800"
              >
                {detailsSaving ? "Saving..." : "Save Features & Policies"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                className="px-3 py-1 text-sm text-gray-700 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
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
                      key={photo.id}
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
                            onClick={() => moveGalleryPhotoByOffset(photo.id, -1)}
                            disabled={index === 0}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                            </svg>

                          </button>
                          <button
                            type="button"
                            onClick={() => moveGalleryPhotoByOffset(photo.id, 1)}
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
                          disabled={galleryDeletingId === photo.id || gallerySaving}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-40 hover:bg-red-50"
                        >
                          {galleryDeletingId === photo.id ? "Deleting..." :
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
