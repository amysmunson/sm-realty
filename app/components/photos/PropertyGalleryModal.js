// Property Photo Gallery Component
// When gallery button pressed, opens a modal with a scrollable photo gallery
// Clicking a photo opensthe shared PhotoViewer lightbox for a fullscreen view

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PhotoViewer from "./PhotoViewer";

export default function PropertyGalleryModal({ photos = [], address }) {
    const [isOpen, setIsOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(18);
    // Index of photo currently shown full-screen; null means no photo is open
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    // Whether the SiteHeader is in the viewport when the modal opens. When
    // the user has scrolled the header offscreen we don't want extra top
    // padding reserving space for it.
    const [headerVisible, setHeaderVisible] = useState(true);
    const scrollContainerRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);

    // Memoized list of photos to display based on the current batch size (visibleCount)
    const visiblePhotos = useMemo(
        () => photos.slice(0, visibleCount),
        [photos, visibleCount]
    );

    const isViewerOpen = selectedPhotoIndex !== null;

    // Lock body scroll while the modal is open. The PhotoViewer also locks scroll when it is open
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    // Esc closes the modal when the viewer isn't open
    // When the viewer is open, PhotoViewer's own Escape handler runs first and calls onClose, which clears selectedPhotoIndex
    useEffect(() => {
        if (!isOpen) return;

        function onKeyDown(event) {
            // Check that the viewer isn't open
            if (event.key === "Escape" && !isViewerOpen) {
                setIsOpen(false);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, isViewerOpen]);

    // Reset state each time the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setVisibleCount(18);
        setSelectedPhotoIndex(null);

        // Measure whether the SiteHeader (rendered by the root layout) is
        // still in view. Body scroll is locked below, so this value remains
        // accurate for the lifetime of this open.
        const header = document.querySelector("header");
        if (header) {
            setHeaderVisible(header.getBoundingClientRect().bottom > 0);
        } else {
            setHeaderVisible(false);
        }
    }, [isOpen]);

    // IntersectionObserver for infinite scroll through the gallery instead of pages
    useEffect(() => {
        // Don't set up the observer if the modal isn't open or we've already shown all photos
        if (!isOpen || visibleCount >= photos.length) return;

        const root = scrollContainerRef.current;
        const target = loadMoreSentinelRef.current;
        if (!root || !target) return;

        // When the sentinel comes into view, increase the batch size to show more photos, up to the total number of photos available
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
        // Clean up the observer when the modal closes or when we've shown all photos
        return () => observer.disconnect();
    }, [isOpen, photos.length, visibleCount]);

    if (!photos.length) return null;

    return (
        <>
            {/* Gallery button on main page photos */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="bg-black/60 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-black/70 cursor-pointer"
            >
                Gallery
            </button>

            {/* Full gallery popup */}
            {isOpen ? (
                <div
                    className={`fixed inset-0 z-100 flex items-start justify-center bg-black/80 p-6 sm:p-10 ${headerVisible ? "pt-20 sm:pt-20" : "pt-14 sm:pt-14"}`}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="mx-auto flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded bg-white cursor-auto"
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
                                className="px-3 py-1 text-sm text-gray-700 cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* overscroll-contain stops scroll from chaining out to the page behind */}
                        <div ref={scrollContainerRef} className="overflow-y-auto overscroll-contain p-4 sm:p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {visiblePhotos.map((photo, index) => (
                                    <button
                                        type="button"
                                        key={`${photo.src}-${index}`}
                                        onClick={() => setSelectedPhotoIndex(index)}
                                        // content-visibility:auto skips rendering work for off-screen items
                                        // contain-intrinsic-size reserves layout space so scrollbar/scroll position stays stable while items are skipped
                                        // contain:strict isolates each tile so paints/layouts don't ripple across the grid
                                        style={{
                                            contentVisibility: "auto",
                                            containIntrinsicSize: "400px 300px",
                                            contain: "strict",
                                        }}
                                        className="relative aspect-4/3 overflow-hidden rounded bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        aria-label={`View ${photo.alt} full screen`}
                                    >
                                        {/* width/height attributes give the browser an intrinsic ratio.
                                            transform:translateZ(0) + will-change promotes each image to its own
                                            GPU layer to reduce re-rasterization on scroll. */}
                                        <img
                                            src={photo.src}
                                            alt={photo.alt}
                                            width="800"
                                            height="600"
                                            loading="lazy"
                                            decoding="async"
                                            style={{
                                                transform: "translateZ(0)",
                                                willChange: "transform",
                                                backfaceVisibility: "hidden",
                                            }}
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
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

            {/* Fullscreen viewer of an individual photo */}
            <PhotoViewer
                photos={photos}
                selectedIndex={selectedPhotoIndex}
                onClose={() => setSelectedPhotoIndex(null)}
                onChangeIndex={setSelectedPhotoIndex}
            />
        </>
    );
}
