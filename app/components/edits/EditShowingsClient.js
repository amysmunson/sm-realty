// Edit Showing Requests Component
// Will display and allow edits for availability table as well

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { setComponentUnsaved } from "@/lib/unsavedClient";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";

const EDITABLE_FIELDS = ["p_id", "name", "email", "phone", "notes", "availabilityText", "open"];

function toNullableText(value) {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    return String(value);
}

function toNullableNumber(value) {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function normalizeShowingRequest(request) {
    return {
        p_id: toNullableNumber(request.p_id),
        name: toNullableText(request.name),
        email: toNullableText(request.email),
        phone: toNullableText(request.phone),
        notes: toNullableText(request.notes),
        availabilityText: toNullableText(request.availabilityText),
        open: Boolean(request.open),
    };
}

function normalizeTimeInput(value) {
    if (!value) {
        return null;
    }

    const trimmed = String(value).trim();
    const withSeconds = /^\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;

    if (!/^\d{2}:\d{2}:\d{2}$/.test(withSeconds)) {
        return null;
    }

    return withSeconds;
}

// Helper to build a display string for availability based on availability rows for a showing request sorted by date and time as  "YYYY-MM-DD HH:MM-HH:MM" with each slot on a new line
// Returns an empty string if no valid rows, ignores rows with invalid or missing date/time values
function buildAvailabilityText(rows) {
    if (!rows || rows.length === 0) {
        return "";
    }

    return [...rows]
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .map((slot) => {
            const start = new Date(slot.start_time);
            const end = new Date(slot.end_time);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return "";
            }

            const date = start.toISOString().split("T")[0];
            const startTime = start.toTimeString().slice(0, 5);
            const endTime = end.toTimeString().slice(0, 5);
            return `${date} ${startTime}-${endTime}`;
        })
        .filter(Boolean)
        .join("\n");
}

// Helper to parse availability text input into rows for database insertion, with validation and error handling. Expects input as "YYYY-MM-DD HH:MM-HH:MM" on each line
// Returns an object with either a "rows" property containing the parsed availability rows or an "error" property with an error message if validation fails
// Validates date and time formats, ensures end time is after start time, and associates each row with the given showingId
function parseAvailabilityText(text, showingId) {
    const normalizedText = String(text || "").trim();
    if (!normalizedText) {
        return { rows: [] };
    }

    const lines = normalizedText.split("\n").map((line) => line.trim()).filter(Boolean);
    const rows = [];

    for (const line of lines) {
        const match = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s*-\s*(\d{2}:\d{2}(?::\d{2})?)$/);

        if (!match) {
            return {
                error: `Invalid availability format: "${line}". Use YYYY-MM-DD HH:MM-HH:MM`,
            };
        }

        const [, date, startRaw, endRaw] = match;
        const startTime = normalizeTimeInput(startRaw);
        const endTime = normalizeTimeInput(endRaw);

        if (!startTime || !endTime) {
            return {
                error: `Invalid time in availability row: "${line}".`,
            };
        }

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
            return {
                error: `Invalid date or time in availability row: "${line}".`,
            };
        }

        if (endDateTime <= startDateTime) {
            return {
                error: `End time must be after start time in row: "${line}".`,
            };
        }

        rows.push({
            showing_id: showingId,
            available_date: date,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
        });
    }

    return { rows };
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

export default function EditShowingsClient() {
    const router = useRouter();
    const { userId, loading: userLoading } = useCurrentUserId();

    const [requests, setRequests] = useState([]);
    const [properties, setProperties] = useState([]);
    const [originalById, setOriginalById] = useState({});
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Check user admin status and load showing requests, properties, and availability data
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

            // Reconsider ordering of showing requests and if we want to order by time/property id/open status
            const [{ data: showingsData, error: showingsError }, { data: propertiesData, error: propertiesError }, { data: availabilityData, error: availabilityError }] =
                await Promise.all([
                    supabase
                        .from("showing_reqs")
                        .select("showing_id,p_id,created_at,name,email,phone,notes,open")
                        .order("open", { ascending: false })
                        .order("created_at", { ascending: false }),
                    supabase.from("properties").select("p_id,address").order("address", { ascending: true }),
                    supabase.from("availability").select("avail_id,showing_id,available_date,start_time,end_time"),
                ]);

            if (!active) {
                return;
            }

            if (showingsError) {
                setError(showingsError.message || "Unable to load showing requests.");
            } else {
                const loaded = showingsData || [];
                const availabilityByShowingId = (availabilityData || []).reduce((acc, row) => {
                    const key = row.showing_id;
                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(row);
                    return acc;
                }, {});

                const loadedWithAvailability = loaded.map((item) => ({
                    ...item,
                    availabilityText: buildAvailabilityText(availabilityByShowingId[item.showing_id] || []),
                }));

                setRequests(loadedWithAvailability);
                setOriginalById(
                    Object.fromEntries(loadedWithAvailability.map((item) => [item.showing_id, normalizeShowingRequest(item)]))
                );
            }

            if (propertiesError) {
                setError((prev) => prev || propertiesError.message || "Unable to load properties.");
            } else {
                setProperties(propertiesData || []);
            }

            if (availabilityError) {
                setError((prev) => prev || availabilityError.message || "Unable to load availability.");
            }

            setLoading(false);
        }

        loadPage();

        return () => {
            active = false;
        };
    }, [router, userId, userLoading]);

    // Helper to update a specific field for a showing request in local state by showing_id
    const propertyOptions = useMemo(
        () => properties.map((property) => ({ value: String(property.p_id), label: property.address || `Property ${property.p_id}` })),
        [properties]
    );

    function updateField(showingId, field, value) {
        setRequests((prev) =>
            prev.map((item) => {
                if (item.showing_id !== showingId) {
                    return item;
                }

                return { ...item, [field]: value };
            })
        );
    }

    // Mark rows dirty if they've been updated so you can save
    function isRowDirty(item) {
        const original = originalById[item.showing_id];
        if (!original) {
            return false;
        }

        const current = normalizeShowingRequest(item);
        return EDITABLE_FIELDS.some((field) => current[field] !== original[field]);
    }

    // Check if any rows are dirty to prompt user about unsaved changes if they try to navigate away
    const hasUnsavedChanges = requests.some((item) => isRowDirty(item));

    // Register this component's unsaved state with global handler to avoid duplicates
    const _unsavedId = useRef(null);
    if (_unsavedId.current === null) _unsavedId.current = String(Math.random());

    useEffect(() => {
        setComponentUnsaved(_unsavedId.current, hasUnsavedChanges);
        return () => setComponentUnsaved(_unsavedId.current, false);
    }, [hasUnsavedChanges]);

    // DB helpers
    async function saveRequest(item) {
        setSavingId(item.showing_id);
        setError("");

        const parsedAvailability = parseAvailabilityText(item.availabilityText, item.showing_id);
        if (parsedAvailability.error) {
            setError(parsedAvailability.error);
            setSavingId(null);
            return;
        }

        const payload = {
            p_id: toNullableNumber(item.p_id),
            name: toNullableText(item.name),
            email: toNullableText(item.email),
            phone: toNullableText(item.phone),
            notes: toNullableText(item.notes),
            open: Boolean(item.open),
        };

        const { error: updateError } = await supabase
            .from("showing_reqs")
            .update(payload)
            .eq("showing_id", item.showing_id);

        if (updateError) {
            setError(updateError.message || "Unable to save showing request.");
            setSavingId(null);
            return;
        }

        const { error: deleteAvailabilityError } = await supabase
            .from("availability")
            .delete()
            .eq("showing_id", item.showing_id);

        if (deleteAvailabilityError) {
            setError(deleteAvailabilityError.message || "Unable to update availability.");
            setSavingId(null);
            return;
        }

        if (parsedAvailability.rows.length > 0) {
            const { error: insertAvailabilityError } = await supabase
                .from("availability")
                .insert(parsedAvailability.rows);

            if (insertAvailabilityError) {
                setError(insertAvailabilityError.message || "Unable to update availability.");
                setSavingId(null);
                return;
            }
        }

        const persistedAvailabilityText = buildAvailabilityText(parsedAvailability.rows);

        setRequests((prev) =>
            prev.map((request) => {
                if (request.showing_id !== item.showing_id) {
                    return request;
                }

                return {
                    ...request,
                    p_id: toNullableNumber(item.p_id),
                    name: toNullableText(item.name),
                    email: toNullableText(item.email),
                    phone: toNullableText(item.phone),
                    notes: toNullableText(item.notes),
                    availabilityText: persistedAvailabilityText,
                    open: Boolean(item.open),
                };
            })
        );

        setOriginalById((prev) => ({
            ...prev,
            [item.showing_id]: normalizeShowingRequest({
                ...item,
                availabilityText: persistedAvailabilityText,
            }),
        }));

        setSavingId(null);
    }

    async function deleteRequest(item) {
        if (!item?.showing_id || deletingId) {
            return;
        }

        const shouldDelete = window.confirm("Delete this row?");
        if (!shouldDelete) {
            return;
        }

        setDeletingId(item.showing_id);
        setError("");

        const { error: deleteAvailabilityError } = await supabase
            .from("availability")
            .delete()
            .eq("showing_id", item.showing_id);

        if (deleteAvailabilityError) {
            setError(deleteAvailabilityError.message || "Unable to delete availability.");
            setDeletingId(null);
            return;
        }

        const { error: deleteError } = await supabase
            .from("showing_reqs")
            .delete()
            .eq("showing_id", item.showing_id);

        if (deleteError) {
            setError(deleteError.message || "Unable to delete showing request.");
            setDeletingId(null);
            return;
        }

        setRequests((prev) => prev.filter((request) => request.showing_id !== item.showing_id));
        setOriginalById((prev) => {
            const next = { ...prev };
            delete next[item.showing_id];
            return next;
        });
        setDeletingId(null);
    }

    if (userLoading || loading) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <p className="text-sm text-gray-600">Loading showing requests and availability...</p>
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
                            <th className="text-edit-table w-28">Submitted</th>
                            <th className="text-edit-table w-40">Property</th>
                            <th className="text-edit-table min-w-40">Name</th>
                            <th className="text-edit-table min-w-48">Email</th>
                            <th className="text-edit-table w-32">Phone</th>
                            <th className="text-edit-table min-w-60">Notes</th>
                            <th className="text-edit-table w-48">Availability</th>
                            <th className="text-edit-table w-10">Open</th>
                            <th className="text-edit-table w-10">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((item) => {
                            const rowDirty = isRowDirty(item);

                            return (
                                <tr key={item.showing_id} className={item.open ? "" : "bg-gray-100"}>
                                    <td className="text-edit-table">{formatTimestamp(item.created_at)}</td>
                                    <td className="text-edit-table">
                                        <select
                                            value={item.p_id ?? ""}
                                            onChange={(event) => updateField(item.showing_id, "p_id", event.target.value)}
                                            className="w-full input-table"
                                        >
                                            <option className="text-gray-500" value=""></option>
                                            {propertyOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="text"
                                            value={item.name || ""}
                                            onChange={(event) => updateField(item.showing_id, "name", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="email"
                                            value={item.email || ""}
                                            onChange={(event) => updateField(item.showing_id, "email", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <input
                                            type="text"
                                            value={item.phone || ""}
                                            onChange={(event) => updateField(item.showing_id, "phone", event.target.value)}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <textarea
                                            value={item.notes || ""}
                                            onChange={(event) => updateField(item.showing_id, "notes", event.target.value)}
                                            rows={3}
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <textarea
                                            value={item.availabilityText || ""}
                                            onChange={(event) => updateField(item.showing_id, "availabilityText", event.target.value)}
                                            rows={3}
                                            placeholder="YYYY-MM-DD HH:MM-HH:MM"
                                            className="w-full input-table"
                                        />
                                    </td>
                                    <td className="text-edit-table text-center">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(item.open)}
                                            onChange={(event) => updateField(item.showing_id, "open", event.target.checked)}
                                        />
                                    </td>
                                    <td className="text-edit-table">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={() => saveRequest(item)}
                                                aria-label={savingId === item.showing_id ? "Saving..." : "Save"}
                                                disabled={savingId === item.showing_id || !rowDirty || deletingId === item.showing_id}
                                                className="btn-save"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteRequest(item)}
                                                disabled={deletingId === item.showing_id || savingId === item.showing_id}
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
