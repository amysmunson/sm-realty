// Edit Applications Client Component
// Shows all rental applications/contact requests and allows editing and deleting them.

"use client";

import { useEffect, useState, useRef } from "react";
import { setComponentUnsaved } from "@/lib/unsavedClient";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";

const EDITABLE_FIELDS = ["name", "email", "phone", "message", "open"];

function toNullableText(value) {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    return String(value);
}

function normalizeApplication(application) {
    return {
        name: toNullableText(application.name),
        email: toNullableText(application.email),
        phone: toNullableText(application.phone),
        message: toNullableText(application.message),
        open: Boolean(application.open),
    };
}

function formatTimestamp(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export default function EditApplicationsClient() {
    const router = useRouter();
    const { userId, loading: userLoading } = useCurrentUserId();

    const [applications, setApplications] = useState([]);
    const [originalById, setOriginalById] = useState({});
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Check user admin status and load applications
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

            const { data, error: applicationsError } = await supabase
                .from("rental_apps")
                .select("form_id,created_at,name,email,phone,message,open")
                .order("open", { ascending: false })
                .order("created_at", { ascending: false });

            if (!active) {
                return;
            }

            if (applicationsError) {
                setError(applicationsError.message || "Unable to load rental applications.");
            } else {
                const loaded = data || [];
                setApplications(loaded);
                setOriginalById(Object.fromEntries(loaded.map((item) => [item.form_id, normalizeApplication(item)])));
            }

            setLoading(false);
        }

        loadPage();

        return () => {
            active = false;
        };
    }, [router, userId, userLoading]);

    function updateField(formId, field, value) {
        setApplications((prev) =>
            prev.map((item) => {
                if (item.form_id !== formId) {
                    return item;
                }

                return { ...item, [field]: value };
            })
        );
    }

    // Mark rows dirty if there are unsaved changes different from original
    function isRowDirty(item) {
        const original = originalById[item.form_id];
        if (!original) {
            return false;
        }

        const current = normalizeApplication(item);
        return EDITABLE_FIELDS.some((field) => current[field] !== original[field]);
    }

    const hasUnsavedChanges = applications.some((item) => isRowDirty(item));

    // Register this component's unsaved state with global handler to avoid duplicates
    const _unsavedId = useRef(null);
    if (_unsavedId.current === null) _unsavedId.current = String(Math.random());

    useEffect(() => {
        setComponentUnsaved(_unsavedId.current, hasUnsavedChanges);
        return () => setComponentUnsaved(_unsavedId.current, false);
    }, [hasUnsavedChanges]);

    // Database helpers
    async function saveApplication(item) {
        setSavingId(item.form_id);
        setError("");

        const payload = {
            name: toNullableText(item.name),
            email: toNullableText(item.email),
            phone: toNullableText(item.phone),
            message: toNullableText(item.message),
            open: Boolean(item.open),
        };

        const { error: updateError } = await supabase
            .from("rental_apps")
            .update(payload)
            .eq("form_id", item.form_id);

        if (updateError) {
            setError(updateError.message || "Unable to save rental application.");
        } else {
            setOriginalById((prev) => ({
                ...prev,
                [item.form_id]: normalizeApplication(item),
            }));
        }

        setSavingId(null);
    }

    async function deleteApplication(item) {
        if (!item?.form_id || deletingId) {
            return;
        }

        const shouldDelete = window.confirm("Delete this row?");
        if (!shouldDelete) {
            return;
        }

        setDeletingId(item.form_id);
        setError("");

        const { error: deleteError } = await supabase.from("rental_apps").delete().eq("form_id", item.form_id);

        if (deleteError) {
            setError(deleteError.message || "Unable to delete rental application.");
            setDeletingId(null);
            return;
        }

        setApplications((prev) => prev.filter((application) => application.form_id !== item.form_id));
        setOriginalById((prev) => {
            const next = { ...prev };
            delete next[item.form_id];
            return next;
        });
        setDeletingId(null);
    }

    if (userLoading || loading) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <p className="text-sm text-gray-600">Loading rental applications...</p>
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
                            <th className="border border-gray-300 p-2">Submitted</th>
                            <th className="border border-gray-300 p-2">Name</th>
                            <th className="border border-gray-300 p-2">Email</th>
                            <th className="border border-gray-300 p-2">Phone</th>
                            <th className="border border-gray-300 p-2">Notes</th>
                            <th className="border border-gray-300 p-2">Open</th>
                            <th className="border border-gray-300 p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map((item) => {
                            const rowDirty = isRowDirty(item);

                            return (
                                <tr key={item.form_id} className={item.open ? "" : "bg-gray-50"}>
                                    <td className="border border-gray-300 p-2">{formatTimestamp(item.created_at)}</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            value={item.name || ""}
                                            onChange={(event) => updateField(item.form_id, "name", event.target.value)}
                                            className="w-40 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="email"
                                            value={item.email || ""}
                                            onChange={(event) => updateField(item.form_id, "email", event.target.value)}
                                            className="w-52 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            value={item.phone || ""}
                                            onChange={(event) => updateField(item.form_id, "phone", event.target.value)}
                                            className="w-36 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <textarea
                                            value={item.message || ""}
                                            onChange={(event) => updateField(item.form_id, "message", event.target.value)}
                                            rows={3}
                                            className="w-80 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(item.open)}
                                            onChange={(event) => updateField(item.form_id, "open", event.target.checked)}
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <div className="flex flex-col items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => saveApplication(item)}
                                                disabled={savingId === item.form_id || !rowDirty || deletingId === item.form_id}
                                                aria-label={savingId === item.form_id ? "Saving..." : "Save"}
                                                className="btn-save"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteApplication(item)}
                                                disabled={deletingId === item.form_id || savingId === item.form_id}
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
        </div>
    );
}
