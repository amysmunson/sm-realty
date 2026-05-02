// Edit Applications Client Component
// Shows all rental applications/contact requests and allows editing and deleting them.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/app/components/CurrentUserId";

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

    // Warn user if they nav away with unsaved changes, but let them do it.
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
                                                className={`rounded px-3 py-1 text-white disabled:opacity-60 ${rowDirty ? "bg-blue-950 hover:bg-blue-800" : "bg-gray-400 cursor-not-allowed"
                                                    }`}
                                            >
                                                {savingId === item.form_id ? "Saving..." : "Save"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteApplication(item)}
                                                disabled={deletingId === item.form_id || savingId === item.form_id}
                                                className="rounded border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                {deletingId === item.form_id ? "Deleting..." : "Delete"}
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
