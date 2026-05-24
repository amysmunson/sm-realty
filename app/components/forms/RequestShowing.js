// Form to Request a Showing on a Property Page.
// Dynamic slot UI lives client-side; submission goes through a server action
// for Turnstile + Resend + database

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { submitShowingRequest } from "./requestShowingAction";
import TurnstileWidget from "./TurnstileWidget";

// Formats date and time to be readable 
function formatLocalDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildTimeOptions(stepMinutes = 30) {
    const options = [];

    for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += stepMinutes) {
        const hours24 = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const value = `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

        const hours12 = hours24 % 12 || 12;
        const meridiem = hours24 < 12 ? "AM" : "PM";
        const label = `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;

        options.push({ value, label });
    }

    return options;
}

export default function RequestShowing({ propertyId, propertyAddress }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [view, setView] = useState("form");
    const [showingSlots, setShowingSlots] = useState([
        { date: "", startTime: "", endTime: "" },
    ]);
    const [state, formAction] = useActionState(submitShowingRequest, {});
    const timeOptions = useMemo(() => buildTimeOptions(30), []);

    // After successful submission, reset the form to its initial state and show a success message. 
    // Form is still present in the DOM, just hidden
    const { minDate, maxDate } = useMemo(() => {
        const current = new Date();
        const upperBound = new Date(current);
        upperBound.setMonth(upperBound.getMonth() + 1);

        return {
            minDate: formatLocalDateInputValue(current),
            maxDate: formatLocalDateInputValue(upperBound),
        };
    }, []);

    useEffect(() => {
        if (state?.success) {
            setView("success");
            setShowingSlots([{ date: "", startTime: "", endTime: "" }]);
        }
    }, [state]);

    // Helper functions for managing the dynamic showing slots UI
    function updateShowingSlot(index, field, value) {
        setShowingSlots((prevSlots) =>
            prevSlots.map((slot, slotIndex) => {
                if (slotIndex !== index) {
                    return slot;
                }

                if (field === "startTime" && slot.endTime && slot.endTime < value) {
                    return {
                        ...slot,
                        startTime: value,
                        endTime: "",
                    };
                }

                return {
                    ...slot,
                    [field]: value,
                };
            })
        );
    }

    function addShowingSlot() {
        setShowingSlots((prevSlots) => [
            ...prevSlots,
            { date: "", startTime: "", endTime: "" },
        ]);
    }

    function removeShowingSlot(index) {
        setShowingSlots((prevSlots) => {
            if (prevSlots.length === 1) {
                return prevSlots;
            }

            return prevSlots.filter((_, slotIndex) => slotIndex !== index);
        });
    }

    // Successful submission 
    if (view === "success") {
        return (
            <div className="card-form">
                <h2 className="text-lg font-bold mb-2">Success</h2>
                <p className="mb-4 text-sm text-gray-700">
                    Your showing request has been submitted. We will contact you soon.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setView("form");
                        setIsExpanded(true);
                    }}
                    className="btn-primary"
                >
                    Request Another Showing
                </button>
            </div>
        );
    }

    // Default submission form
    return (
        <div className="card-form">
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="mb-4 flex w-full items-center justify-between text-left"
                aria-expanded={isExpanded}
                aria-controls="request-showing-form"
            >
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Request a Showing</h2>
                <span className="rounded-md p-1.5 text-sm font-medium text-slate-600">
                    {isExpanded ?
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        </svg>
                        :
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>}
                </span>
            </button>
            {isExpanded ? (
                <form id="request-showing-form" action={formAction} className="space-y-4">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <input type="hidden" name="propertyAddress" value={propertyAddress ?? ""} />
                    <input type="hidden" name="slots" value={JSON.stringify(showingSlots)} />
                    {state?.error ? (
                        <p className="rounded-sm bg-red-100 px-4 py-3 text-sm text-red-800">{state.error}</p>
                    ) : null}
                    <div>
                        <label className="label-form" htmlFor="name">Name</label>
                        <input type="text" name="name" id="name" required className="input-form" />
                    </div>
                    <div>
                        <label className="label-form" htmlFor="email">Email</label>
                        <input type="email" name="email" id="email" required className="input-form" />
                    </div>
                    <div>
                        <label className="label-form" htmlFor="phone">Phone</label>
                        <input type="tel" name="phone" id="phone" required className="input-form" />
                    </div>
                    <div className="space-y-3">
                        <label className="label-form">Preferred Dates and Times</label>
                        {showingSlots.map((slot, index) => (
                            <div key={`slot-${index}`} className="grid gap-2 sm:grid-cols-3">
                                <input
                                    type="date"
                                    min={minDate}
                                    max={maxDate}
                                    required
                                    value={slot.date}
                                    onChange={(event) => updateShowingSlot(index, "date", event.target.value)}
                                    className="input-form"
                                />
                                <select
                                    required
                                    value={slot.startTime}
                                    onChange={(event) => updateShowingSlot(index, "startTime", event.target.value)}
                                    className="input-form"
                                >
                                    <option value=""></option>
                                    {timeOptions.map((option) => (
                                        <option key={`start-${option.value}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex gap-2 sm:col-span-1">
                                    <select
                                        required
                                        value={slot.endTime}
                                        onChange={(event) => updateShowingSlot(index, "endTime", event.target.value)}
                                        className="input-form"
                                    >
                                        <option value=""></option>
                                        {timeOptions.map((option) => (
                                            <option
                                                key={`end-${option.value}`}
                                                value={option.value}
                                                disabled={Boolean(slot.startTime) && option.value <= slot.startTime}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeShowingSlot(index)}
                                        disabled={showingSlots.length === 1}
                                        className="btn-secondary-delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addShowingSlot}
                            className="input-add"
                        >
                            + Add another time range
                        </button>
                    </div>
                    <div>
                        <label className="label-form" htmlFor="notes">Notes</label>
                        <textarea name="notes" id="notes" rows="4" className="input-form"></textarea>
                    </div>
                    <TurnstileWidget
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                        label="Submit Request"
                    />
                </form>
            ) : null}
        </div>
    );
}
