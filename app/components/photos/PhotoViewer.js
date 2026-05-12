// Fullscreen photo viewer (lightbox).
// Parent owns selectedIndex and pass onClose to dismiss.
// Renders via a portal to <body> so it covers the fixed site header regardless despite being nested inside the page component.

"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Need array of photos so you can scroll through them all with next/prev
export default function PhotoViewer({ photos = [], selectedIndex, onClose, onChangeIndex }) {
    // The viewer is open if selectedIndex is a valid number. We allow selectedIndex to be null or undefined to indicate "no photo selected" for flexibility in the parent component's state management.
    const isOpen = selectedIndex !== null && selectedIndex !== undefined;

    // Track whether we're on the client. Portals can't render during SSR because document doesn't exist on the server.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Handlers to show next/previous photos, wrapping around at the ends of the list
    const showPrev = useCallback(() => {
        if (!isOpen || photos.length === 0) return;
        const next = (selectedIndex - 1 + photos.length) % photos.length;
        onChangeIndex(next);
    }, [isOpen, photos.length, selectedIndex, onChangeIndex]);

    const showNext = useCallback(() => {
        if (!isOpen || photos.length === 0) return;
        const next = (selectedIndex + 1) % photos.length;
        onChangeIndex(next);
    }, [isOpen, photos.length, selectedIndex, onChangeIndex]);

    // Keyboard handling of esc and arrow key navigation.
    useEffect(() => {
        if (!isOpen) return;

        function onKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            } else if (event.key === "ArrowLeft") {
                showPrev();
            } else if (event.key === "ArrowRight") {
                showNext();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose, showPrev, showNext]);

    // Lock body scroll while viewer is open (gallery too)
    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;
    if (!mounted) return null;

    const photo = photos[selectedIndex];
    if (!photo) return null;

    const viewer = (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 p-4 sm:p-8"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Full screen photo viewer"
        >
            {/* Close button */}
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
                className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 cursor-pointer"
                aria-label="Close full screen photo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Photo counter */}
            <div className="absolute top-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                {selectedIndex + 1} / {photos.length}
            </div>

            {/* Previous button - hidden when only one photo */}
            {photos.length > 1 ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        showPrev();
                    }}
                    className="absolute left-4 z-10 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 cursor-pointer"
                    aria-label="Previous photo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>
            ) : null}

            {/* The photo itself */}
            <img
                src={photo.src}
                alt={photo.alt}
                className="max-h-full max-w-full object-contain cursor-auto"
                onClick={(event) => event.stopPropagation()}
            />

            {/* Next button hidden when only one photo */}
            {photos.length > 1 ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        showNext();
                    }}
                    className="absolute right-4 z-10 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 cursor-pointer"
                    aria-label="Next photo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            ) : null}
        </div>
    );

    // Render the viewer in a portal to body so it can overlay the entire page including the header, even though this component is nested inside the page component.
    return createPortal(viewer, document.body);
}
