// Client component for editing agents table (admin only)

"use client";

import { useEffect, useState, useRef } from "react";
import { setComponentUnsaved } from "@/lib/unsavedClient";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";

const EDITABLE_FIELDS = ["name", "email", "phone", "license", "dre_num"];

function toNullableText(value) {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    return String(value);
}

function normalizeAgent(agent) {
    return {
        name: toNullableText(agent.name),
        email: toNullableText(agent.email),
        phone: toNullableText(agent.phone),
        license: toNullableText(agent.license),
        dre_num: toNullableText(agent.dre_num),
    };
}

function createAgentId() {
    return globalThis.crypto?.randomUUID?.() || String(Date.now());
}

function getAgentPhotoPublicUrl(fileName) {
    if (!fileName) {
        return null;
    }

    const { data } = supabase.storage.from("photo_bucket").getPublicUrl(fileName);
    return data?.publicUrl || null;
}

function buildAgentStorageFileName(agentId, originalName) {
    const extensionMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
    const baseName = originalName
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);

    const safeBaseName = baseName || "agent";
    return `agents/${agentId}/${Date.now()}-${safeBaseName}${extension}`;
}

export default function EditAgentsClient() {
    const router = useRouter();
    const { userId, loading: userLoading } = useCurrentUserId();

    const [agents, setAgents] = useState([]);
    const [originalById, setOriginalById] = useState({});
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [addingRow, setAddingRow] = useState(false);
    const [photoAgent, setPhotoAgent] = useState(null);
    const [photoWorking, setPhotoWorking] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
    const [photoFile, setPhotoFile] = useState(null);
    const photoInputRef = useRef(null);

    // On mount, check if user is authorized to view this page and load agents if so. Redirect if not authorized.
    useEffect(() => {
        let active = true;

        // Check authorization and load agents if authorized
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

            const { data, error: agentsError } = await supabase
                .from("agents")
                .select("id,name,email,phone,license,dre_num,photo_file_name")
                .order("name", { ascending: true });

            if (!active) {
                return;
            }

            if (agentsError) {
                setError(agentsError.message || "Unable to load agents.");
            } else {
                const loaded = data || [];
                setAgents(loaded);
                setOriginalById(Object.fromEntries(loaded.map((item) => [item.id, normalizeAgent(item)])));
            }

            setLoading(false);
        }

        loadPage();

        return () => {
            active = false;
        };
    }, [router, userId, userLoading]);

    function updateField(id, field, value) {
        setAgents((prev) =>
            prev.map((item) => {
                if (item.id !== id) {
                    return item;
                }

                return { ...item, [field]: value };
            })
        );
    }

    // Mark a row dirty if it has unsaved changes
    // Compare current values to originals from the database
    function isRowDirty(item) {
        const original = originalById[item.id];
        if (!original) {
            return false;
        }

        const current = normalizeAgent(item);
        return EDITABLE_FIELDS.some((field) => current[field] !== original[field]);
    }

    const hasUnsavedChanges = agents.some((item) => isRowDirty(item));

    // Register this component's unsaved state with the centralized handler to avoid duplicate prompts
    const _unsavedId = useRef(null);
    if (_unsavedId.current === null) _unsavedId.current = String(Math.random());

    useEffect(() => {
        setComponentUnsaved(_unsavedId.current, hasUnsavedChanges);
        return () => setComponentUnsaved(_unsavedId.current, false);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        return () => {
            if (photoPreviewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(photoPreviewUrl);
            }
        };
    }, [photoPreviewUrl]);

    function openPhotoModal(item) {
        setPhotoAgent(item);
        setPhotoError("");
        setPhotoFile(null);
        setPhotoPreviewUrl("");

        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
    }

    function closePhotoModal() {
        if (photoPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreviewUrl);
        }

        setPhotoAgent(null);
        setPhotoWorking(false);
        setPhotoError("");
        setPhotoFile(null);
        setPhotoPreviewUrl("");

        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
    }

    function handlePhotoFileChange(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (photoPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreviewUrl);
        }

        setPhotoFile(file);
        setPhotoPreviewUrl(URL.createObjectURL(file));
        setPhotoError("");
    }

    async function saveAgentPhoto() {
        if (!photoAgent || !photoFile || photoWorking) {
            return;
        }

        setPhotoWorking(true);
        setPhotoError("");

        const storageFileName = buildAgentStorageFileName(photoAgent.id, photoFile.name);
        const { error: uploadError } = await supabase.storage
            .from("photo_bucket")
            .upload(storageFileName, photoFile, { upsert: false });

        if (uploadError) {
            setPhotoError(uploadError.message || "Unable to upload agent photo.");
            setPhotoWorking(false);
            return;
        }

        const previousFileName = photoAgent.photo_file_name || null;
        const { error: updateError } = await supabase
            .from("agents")
            .update({ photo_file_name: storageFileName })
            .eq("id", photoAgent.id);

        if (updateError) {
            await supabase.storage.from("photo_bucket").remove([storageFileName]);
            setPhotoError(updateError.message || "Unable to save agent photo.");
            setPhotoWorking(false);
            return;
        }

        if (previousFileName && previousFileName !== storageFileName) {
            await supabase.storage.from("photo_bucket").remove([previousFileName]);
        }

        setAgents((prev) =>
            prev.map((agent) =>
                agent.id === photoAgent.id
                    ? { ...agent, photo_file_name: storageFileName }
                    : agent
            )
        );

        closePhotoModal();
    }

    // Helper functions for changes to an agent via DB request
    async function saveAgent(item) {
        setSavingId(item.id);
        setError("");

        const payload = {
            name: toNullableText(item.name),
            email: toNullableText(item.email),
            phone: toNullableText(item.phone),
            license: toNullableText(item.license),
            dre_num: toNullableText(item.dre_num),
        };

        const { error: updateError } = await supabase
            .from("agents")
            .update(payload)
            .eq("id", item.id);

        if (updateError) {
            setError(updateError.message || "Unable to save agent.");
        } else {
            setOriginalById((prev) => ({
                ...prev,
                [item.id]: normalizeAgent(item),
            }));
        }

        setSavingId(null);
    }

    async function addAgentRow() {
        if (addingRow) {
            return;
        }

        setAddingRow(true);
        setError("");

        const { data, error: insertError } = await supabase
            .from("agents")
            .insert({
                id: createAgentId(),
                name: null,
                email: null,
                phone: null,
                license: null,
                dre_num: null,
                photo_file_name: null,
            })
            .select("id,name,email,phone,license,dre_num,photo_file_name")
            .single();

        if (insertError || !data) {
            setError(insertError?.message || "Unable to add a new agent row.");
            setAddingRow(false);
            return;
        }

        setAgents((prev) => [...prev, data]);
        setOriginalById((prev) => ({
            ...prev,
            [data.id]: normalizeAgent(data),
        }));

        setAddingRow(false);
    }

    async function deleteAgent(item) {
        if (!item?.id || deletingId) {
            return;
        }

        const shouldDelete = window.confirm("Delete this row?");
        if (!shouldDelete) {
            return;
        }

        setDeletingId(item.id);
        setError("");

        const previousFileName = item.photo_file_name || null;

        const { error: deleteError } = await supabase.from("agents").delete().eq("id", item.id);

        if (deleteError) {
            setError(deleteError.message || "Unable to delete agent.");
            setDeletingId(null);
            return;
        }

        // Remove photo from storage if present. If storage removal fails, report it but
        // the agent row has already been removed from the DB.
        if (previousFileName) {
            const { error: storageError } = await supabase.storage.from("photo_bucket").remove([previousFileName]);
            if (storageError) {
                setError(storageError.message || "Agent deleted but failed to remove photo from storage.");
            }
        }

        setAgents((prev) => prev.filter((agent) => agent.id !== item.id));
        setOriginalById((prev) => {
            const next = { ...prev };
            delete next[item.id];
            return next;
        });
        setDeletingId(null);
    }

    if (userLoading || loading) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <p className="text-sm text-gray-600">Loading agents...</p>
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
            
            <div className="my-4 flex items-center justify-between">
                <div className="flex-1" />
                <h2 className="heading-dashboard-section my-0">Agents</h2>
                <div className="flex flex-1 justify-end">
                <button
                    type="button"
                    onClick={addAgentRow}
                    disabled={addingRow}
                    className="btn-add-entry"
                    aria-label="Add New Agent Row"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="text-edit-table">Name</th>
                            <th className="text-edit-table">Email</th>
                            <th className="text-edit-table">Phone</th>
                            <th className="text-edit-table">License</th>
                            <th className="text-edit-table">DRE #</th>
                            <th className="text-edit-table w-10">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((item) => {
                            const rowDirty = isRowDirty(item);

                            return (
                                <tr key={item.id}>
                                    <td className="text-edit-table">
                                        <input
                                            type="text"
                                            value={item.name || ""}
                                            placeholder="Name"
                                            onChange={(event) => updateField(item.id, "name", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="email"
                                            value={item.email || ""}
                                            placeholder="Email"
                                            onChange={(event) => updateField(item.id, "email", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="text"
                                            value={item.phone || ""}
                                            placeholder="Phone"
                                            onChange={(event) => updateField(item.id, "phone", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="text"
                                            value={item.license || ""}
                                            placeholder="License Type"
                                            onChange={(event) => updateField(item.id, "license", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="text"
                                            value={item.dre_num || ""}
                                            placeholder="DRE License Number"
                                            onChange={(event) => updateField(item.id, "dre_num", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openPhotoModal(item)}
                                                disabled={deletingId === item.id || savingId === item.id}
                                                className="btn-secondary-blue py-1 px-1 text-xs justify-center flex"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => saveAgent(item)}
                                                aria-label={savingId === item.id ? "Saving..." : "Save"}
                                                disabled={savingId === item.id || !rowDirty || deletingId === item.id}
                                                className="btn-save"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteAgent(item)}
                                                disabled={deletingId === item.id || savingId === item.id}
                                                className="btn-delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {photoAgent ? (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4"
                    onClick={closePhotoModal}
                >
                    <div
                        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div>
                                <h2 className="heading-modal">Agent Photo</h2>
                                <p className="text-sm text-gray-600">{photoAgent.name || "Unnamed agent"}</p>
                            </div>
                            <button type="button" onClick={closePhotoModal} className="btn-close">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[68vh] overflow-y-auto px-5 py-4 space-y-4">
                            {photoError ? (
                                <p className="banner-error mb-4">{photoError}</p>
                            ) : null}

                            <div className="card-modal-section space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:w-56">
                                        {photoPreviewUrl || photoAgent.photo_file_name ? (
                                            <img
                                                src={photoPreviewUrl || getAgentPhotoPublicUrl(photoAgent.photo_file_name)}
                                                alt={photoAgent.name || "Agent photo"}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                                                No photo selected
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Upload Agent Photo</p>
                                            <p className="mt-1 text-sm text-slate-600">
                                                Uploading a new photo replaces the existing one.
                                            </p>
                                        </div>

                                        <label className="btn-secondary-blue inline-flex items-center rounded-full">
                                            <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                            </svg>
                                            <span>Upload</span>
                                            </div>
                                            <input
                                                ref={photoInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
                            <button type="button" onClick={closePhotoModal} className="btn-secondary-blue py-1 px-2">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveAgentPhoto}
                                disabled={!photoFile || photoWorking}
                                className="btn-primary py-1 px-2"
                            >
                                {photoWorking ? "Uploading..." : "Save Photo"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
