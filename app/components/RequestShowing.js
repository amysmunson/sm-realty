// Form to Request Showing on Property Page
// With ability to select dates and times within the next month

"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// Extracts detailed supabase errors instead of undefined
function getSupabaseErrorText(error, fallbackText) {
    if (!error) {
        return fallbackText;
    }

    return [error.message, error.details, error.hint, error.code]
        .filter(Boolean)
        .join(" | ") || fallbackText;
}

export default function RequestShowing({ propertyId }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showingSlots, setShowingSlots] = useState([
        { date: "", startTime: "", endTime: "" },
    ]);

    // Calculate min and max dates for the date input, as well as the current time for validation and setting min time on the current date
    // useMemo is used to avoid recalculating on every render since it's not needed unless the component is re-mounted
    const { minDate, maxDate, now } = useMemo(() => {
        const current = new Date();
        const upperBound = new Date(current);
        upperBound.setMonth(upperBound.getMonth() + 1);

        return {
            minDate: current.toISOString().split("T")[0],
            maxDate: upperBound.toISOString().split("T")[0],
            now: current,
        };
    }, []);

    function getMinTimeForDate(dateValue) {
        if (dateValue !== minDate) {
            return undefined;
        }

        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    // Updates an availability slot's individual field. Ensures if the start time is updated to be after the end time, the end time is cleared
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

    // Adds a new empty availability slot
    function addShowingSlot() {
        setShowingSlots((prevSlots) => [
            ...prevSlots,
            { date: "", startTime: "", endTime: "" },
        ]);
    }

    // Remove a specific slot
    function removeShowingSlot(index) {
        setShowingSlots((prevSlots) => {
            if (prevSlots.length === 1) {
                return prevSlots;
            }

            return prevSlots.filter((_, slotIndex) => slotIndex !== index);
        });
    }

    // Submit the form with checks for valid dates and times
    async function handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const name = formData.get("name");
        const email = formData.get("email");
        const phone = formData.get("phone");
        const notes = formData.get("notes") || "";
        const maxDateTime = new Date(now);
        maxDateTime.setMonth(maxDateTime.getMonth() + 1);

        if (
            showingSlots.length === 0 ||
            showingSlots.some((slot) => !slot.date || !slot.startTime || !slot.endTime)
        ) {
            alert("Please complete at least one preferred date and time range.");
            return;
        }

        const normalizedSlots = showingSlots.map((slot) => {
            const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
            const endDateTime = new Date(`${slot.date}T${slot.endTime}`);

            return {
                ...slot,
                startDateTime,
                endDateTime,
            };
        });

        const hasInvalidSlot = normalizedSlots.some(({ startDateTime, endDateTime }) => {
            return (
                Number.isNaN(startDateTime.getTime()) ||
                Number.isNaN(endDateTime.getTime()) ||
                startDateTime < now ||
                startDateTime > maxDateTime ||
                endDateTime > maxDateTime ||
                endDateTime <= startDateTime
            );
        });

        if (hasInvalidSlot) {
            alert("Please choose valid date and time ranges within the next month.");
            return;
        }

        const { data: showingRequest, error: requestError } = await supabase
            .from("showing_reqs")
            .insert({
                p_id: propertyId,
                name,
                email,
                phone,
                notes: notes.trim() || null,
            })
            .select("showing_id")
            .single();

        if (requestError) {
            alert("Error submitting request: " + getSupabaseErrorText(requestError, "Unknown error"));
            return;
        }

        const availabilityRows = normalizedSlots.map(({ date, startDateTime, endDateTime }) => ({
            showing_id: showingRequest.showing_id,
            available_date: date,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
        }));

        const { error: availabilityError } = await supabase
            .from("availability")
            .insert(availabilityRows);

        if (availabilityError) {
            alert(
                "Request was created, but availability could not be saved: " +
                getSupabaseErrorText(availabilityError, "Unknown error")
            );
        } else {
            alert("Showing request submitted successfully!");
            event.target.reset();
            setShowingSlots([{ date: "", startTime: "", endTime: "" }]);
        }
    }

    return (
        <div className="bg-gray-100 p-6 rounded shadow-md">
            {/* By default, the form is collapsed. The button allows you to expand it since otherwise it takes up a lot of space */}
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="mb-4 flex w-full items-center justify-between text-left"
                aria-expanded={isExpanded}
                aria-controls="request-showing-form"
            >
                <h2 className="text-lg font-bold">Request a Showing</h2>
                <span className="text-sm font-medium text-gray-600">
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
                <form id="request-showing-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
                        <input type="text" name="name" id="name" required className="w-full border border-gray-300 rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
                        <input type="email" name="email" id="email" required className="w-full border border-gray-300 rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="phone">Phone</label>
                        <input type="tel" name="phone" id="phone" required className="w-full border border-gray-300 rounded px-3 py-2" />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium mb-1">Preferred Dates and Times</label>
                        {showingSlots.map((slot, index) => (
                            <div key={`slot-${index}`} className="grid gap-2 sm:grid-cols-3">
                                <input
                                    type="date"
                                    name={`showingDate-${index}`}
                                    min={minDate}
                                    max={maxDate}
                                    required
                                    value={slot.date}
                                    onChange={(event) => updateShowingSlot(index, "date", event.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                />
                                <input
                                    type="time"
                                    name={`showingStartTime-${index}`}
                                    min={getMinTimeForDate(slot.date)}
                                    required
                                    value={slot.startTime}
                                    onChange={(event) => updateShowingSlot(index, "startTime", event.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                />
                                <div className="flex gap-2 sm:col-span-1">
                                    <input
                                        type="time"
                                        name={`showingEndTime-${index}`}
                                        min={slot.startTime || getMinTimeForDate(slot.date)}
                                        required
                                        value={slot.endTime}
                                        onChange={(event) => updateShowingSlot(index, "endTime", event.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeShowingSlot(index)}
                                        disabled={showingSlots.length === 1}
                                        className="px-2 py-2 border border-gray-300 rounded text-sm disabled:opacity-50"
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
                            className="text-sm font-medium text-blue-950 hover:text-blue-800"
                        >
                            + Add another time range
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="notes">Notes</label>
                        <textarea name="notes" id="notes" rows="4" className="w-full border border-gray-300 rounded px-3 py-2"></textarea>
                    </div>
                    <button type="submit" className="bg-blue-950 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded">
                        Submit Request
                    </button>
                </form>
            ) : null}
        </div>
    );
}
