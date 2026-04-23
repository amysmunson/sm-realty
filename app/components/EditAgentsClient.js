// Client component for editing agents table (admin only)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/app/components/CurrentUserId";

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
                .select("id,name,email,phone,license,dre_num")
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

    // Warn the user if they try to leave with unsaved changes, either by navigating within the app or closing the tab/window
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

        const { error: deleteError } = await supabase.from("agents").delete().eq("id", item.id);

        if (deleteError) {
            setError(deleteError.message || "Unable to delete agent.");
            setDeletingId(null);
            return;
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

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2">Name</th>
                            <th className="border border-gray-300 p-2">Email</th>
                            <th className="border border-gray-300 p-2">Phone</th>
                            <th className="border border-gray-300 p-2">License</th>
                            <th className="border border-gray-300 p-2">DRE #</th>
                            <th className="border border-gray-300 p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((item) => {
                            const rowDirty = isRowDirty(item);

                            return (
                                <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            value={item.name || ""}
                                            onChange={(event) => updateField(item.id, "name", event.target.value)}
                                            className="w-44 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="email"
                                            value={item.email || ""}
                                            onChange={(event) => updateField(item.id, "email", event.target.value)}
                                            className="w-56 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            value={item.phone || ""}
                                            onChange={(event) => updateField(item.id, "phone", event.target.value)}
                                            className="w-40 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            value={item.license || ""}
                                            onChange={(event) => updateField(item.id, "license", event.target.value)}
                                            className="w-40 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            value={item.dre_num || ""}
                                            onChange={(event) => updateField(item.id, "dre_num", event.target.value)}
                                            className="w-32 rounded p-1"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => saveAgent(item)}
                                                disabled={savingId === item.id || !rowDirty || deletingId === item.id}
                                                className={`rounded px-3 py-1 text-white disabled:opacity-60 ${rowDirty ? "bg-blue-950 hover:bg-blue-800" : "bg-gray-400 cursor-not-allowed"
                                                    }`}
                                            >
                                                {savingId === item.id ? "Saving..." : "Save"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteAgent(item)}
                                                disabled={deletingId === item.id || savingId === item.id}
                                                className="rounded border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                {deletingId === item.id ? "Deleting..." : "Delete"}
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
