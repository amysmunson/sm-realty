// Allows admin to replace the homepage image by uploading a new one, 
// with automatic cleanup of old homepage photos and handling of any photos linked to properties 

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";

function getPhotoPublicUrl(fileName) {
	if (!fileName) {
		return null;
	}

	const { data } = supabase.storage.from("photo_bucket").getPublicUrl(fileName);
	return data?.publicUrl || null;
}

// Build a safe storage file name for the uploaded homepage photo, using a timestamp and sanitized version of the original file name
function buildHomepageStorageFileName(originalName) {
	const extensionMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
	const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
	const baseName = originalName
		.replace(/\.[^/.]+$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9-_]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);

	const safeBaseName = baseName || "homepage";
	return `homepage/${Date.now()}-${safeBaseName}${extension}`;
}

async function cleanupHomepageDuplicates(photos, keepPhotoId) {
	const duplicates = (photos || []).filter((photo) => photo.id !== keepPhotoId);

	for (const photo of duplicates) {
		// For photos linked to properties, we keep the row but set homepage to false
		if (photo.p_id) {
			await supabase.from("photos").update({ homepage: false }).eq("id", photo.id);
			continue;
		}

		// For unlinked photos, we delete the row and the file from storage
		await supabase.from("photos").delete().eq("id", photo.id);

		if (photo.file_name) {
			await supabase.storage.from("photo_bucket").remove([photo.file_name]);
		}
	}
}

export default function EditHomepage() {
	const router = useRouter();
	const { userId, loading: userLoading } = useCurrentUserId();

	const [homepagePhotos, setHomepagePhotos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState("");
	const uploadInputRef = useRef(null);

	// Load from the db
	async function loadHomepagePhotos() {
		const { data, error: photosError } = await supabase
			.from("photos")
			.select("id,file_name,p_id,homepage,created_at")
			.eq("homepage", true)
			.order("created_at", { ascending: true });

		if (photosError) {
			setError(photosError.message || "Unable to load homepage photos.");
			return;
		}

		setHomepagePhotos(
			(data || []).map((photo) => ({
				...photo,
				publicUrl: getPhotoPublicUrl(photo.file_name),
			}))
		);
	}

	// Check authorization and load homepage photos on mount, redirecting if not authorized
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

			if (userError || !userRow || !userRow.is_admin) {
				router.replace("/");
				return;
			}

			setAuthorized(true);
			await loadHomepagePhotos();

			if (!active) {
				return;
			}

			setLoading(false);
		}

		loadPage();

		return () => {
			active = false;
		};
	}, [router, userId, userLoading]);

	// Handle file input change to upload a new homepage photo
	async function handleUploadFile(event) {
		const file = event.target.files?.[0];
		if (!file || working) {
			return;
		}

		setWorking(true);
		setError("");

		const storageFileName = buildHomepageStorageFileName(file.name);
		const { error: uploadError } = await supabase.storage
			.from("photo_bucket")
			.upload(storageFileName, file, { upsert: false });

		if (uploadError) {
			setError(uploadError.message || "Unable to upload homepage photo.");
			setWorking(false);
			return;
		}

		const { data: insertedPhoto, error: insertError } = await supabase
			.from("photos")
			.insert({
				file_name: storageFileName,
				p_id: null,
				order: 1,
				homepage: true,
			})
			.select("id,file_name,p_id,homepage,created_at")
			.single();

		if (insertError || !insertedPhoto) {
			await supabase.storage.from("photo_bucket").remove([storageFileName]);
			setError(insertError?.message || "Unable to save homepage photo.");
			setWorking(false);
			return;
		}

		const { data: allHomepageData, error: allHomepageError } = await supabase
			.from("photos")
			.select("id,file_name,p_id,homepage,created_at")
			.eq("homepage", true)
			.order("created_at", { ascending: true });

		if (allHomepageError) {
			setError(allHomepageError.message || "Unable to validate homepage photos.");
			setWorking(false);
			return;
		}

		await cleanupHomepageDuplicates(allHomepageData || [], insertedPhoto.id);
		await loadHomepagePhotos();

		if (uploadInputRef.current) {
			uploadInputRef.current.value = "";
		}

		setWorking(false);
	}

	if (userLoading || loading) {
		return (
			<div className="container mx-auto px-4 py-10 text-center">
				<p className="text-sm text-gray-600">Loading homepage photos...</p>
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

			<div className="mb-4 rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
				Multiple homepage entries may exist historically, but only the first is used. Uploading a new homepage photo
				will keep only that new one as homepage: unlinked homepage rows are deleted, and property-linked rows are kept
				with homepage turned off.
			</div>

			<div className="mb-4 flex flex-wrap items-center gap-3">
				<label
					htmlFor="homepage-upload-input"
					className={`rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 ${
						working ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-gray-100"
					}`}
				>
					{working ? "Uploading..." : "Upload Homepage Photo"}
				</label>
				<input
					id="homepage-upload-input"
					ref={uploadInputRef}
					type="file"
					accept="image/*"
					onChange={handleUploadFile}
					disabled={working}
					className="hidden"
				/>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full border-collapse border border-gray-300 text-sm">
					<thead>
						<tr className="bg-gray-100">
							<th className="border border-gray-300 p-2">Preview</th>
							<th className="border border-gray-300 p-2">Source</th>
							<th className="border border-gray-300 p-2">File</th>
							<th className="border border-gray-300 p-2">Used</th>
						</tr>
					</thead>
					<tbody>
						{homepagePhotos.length === 0 ? (
							<tr>
								<td colSpan={4} className="border border-gray-300 p-3 text-center text-gray-600">
									No homepage photos found.
								</td>
							</tr>
						) : (
							homepagePhotos.map((photo, index) => (
								<tr key={photo.id} className={index === 0 ? "" : "bg-gray-50"}>
									<td className="border border-gray-300 p-2">
										{photo.publicUrl ? (
											<img
												src={photo.publicUrl}
												alt={`Homepage photo ${index + 1}`}
												className="h-24 w-32 rounded object-cover"
											/>
										) : (
											<div className="flex h-24 w-32 items-center justify-center rounded bg-gray-200 text-xs text-gray-600">
												No preview
											</div>
										)}
									</td>
									<td className="border border-gray-300 p-2 text-center">
										{photo.p_id ? `Property ${photo.p_id}` : "Homepage Upload"}
									</td>
									<td className="border border-gray-300 p-2 text-xs text-gray-600">{photo.file_name || "-"}</td>
									<td className="border border-gray-300 p-2 text-center">
										{index === 0 ? "Yes (first)" : "No"}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
