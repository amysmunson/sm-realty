// Property Photo Gallery Component
// When gallery button pressed, opens a modal with a scrollable photo gallery. Photos are loaded in batches, could be faster.
// Look into optimizing.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function PropertyGalleryModal({ photos = [], address }) {
    const [isOpen, setIsOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(18);
    const scrollContainerRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);

    // Memoized list of photos to display based on the current batch size (visibleCount)
    const visiblePhotos = useMemo(
        () => photos.slice(0, visibleCount),
        [photos, visibleCount]
    );

    // When the modal opens, prevent background scrolling and set up an event listener for the Escape key to close the modal
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function onKeyDown(event) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        window.addEventListener("keydown", onKeyDown);

        // Clean up on unmount/when the modal closes.
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen]);

    // When the modal opens, reset the visible photo count to the initial batch size
    // Ensures that each time the gallery is opened, it starts with a consistent number of photos displayed
    // May need to change in the future
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        // Resets the batch size each time the modal opens
        setVisibleCount(18);
    }, [isOpen]);

    // Counterpart to setting up an initial batch size
    // IntersectionObserver used to implement infinite scrolling
    // When the user scrolls near the bottom of the photos, load more photos by increasing visibleCount
    useEffect(() => {
        if (!isOpen || visibleCount >= photos.length) {
            return;
        }

        const root = scrollContainerRef.current;
        const target = loadMoreSentinelRef.current;
        if (!root || !target) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry?.isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + 12, photos.length));
                }
            },
            {
                root,
                rootMargin: "300px 0px",
                threshold: 0.01,
            }
        );

        observer.observe(target);
        return () => {
            observer.disconnect();
        };
    }, [isOpen, photos.length, visibleCount]);

    if (!photos.length) {
        return null;
    }

    return (
        <>
        {/* Appears in bottom of main page's smaller gallery */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="bg-black/60 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-black/70 cursor-pointer"
            >
                Gallery
            </button>

            {/* Open the full gallery if button is pressed */}
            {isOpen ? (
                <div
                    className="fixed inset-0 z-100 flex items-start justify-center bg-black/80 p-6 pt-18 sm:p-10 sm:pt-22"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="mx-auto flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded bg-white"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {address ? `${address} Photos` : "Property Photos"}
                            </h2>
                            {/* Close button */}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>

                            </button>
                        </div>

                        <div ref={scrollContainerRef} className="overflow-y-auto p-4 sm:p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {visiblePhotos.map((photo, index) => (
                                    <div
                                        key={`${photo.src}-${index}`}
                                        className="relative aspect-4/3 overflow-hidden rounded bg-gray-100"
                                    >
                                        <img
                                            src={photo.src}
                                            alt={photo.alt}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>

                            {visibleCount < photos.length ? (
                                <div ref={loadMoreSentinelRef} className="py-6 text-center text-sm text-gray-500">
                                    Loading more photos...
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
