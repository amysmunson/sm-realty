// Page-level photo display: main photo + small side grid + gallery modal button
// Client component because it requires state to click any photo (main or side grid) needs to open the shared PhotoViewer lightbox

"use client";

import { useState } from "react";
import Image from "next/image";
import PhotoViewer from "./PhotoViewer";
import PropertyGalleryModal from "./PropertyGalleryModal";

export default function PropertyPhotos({ photos = [], address }) {
    // Index of the photo currently shown full-screen, or null when closed.
    // Indexes correspond to positions in `photos` so prev/next walks the full list.
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

    // Display placeholder if no photos
    if (photos.length === 0) {
        return (
            <div className="relative w-full mx-auto h-88 md:h-136 bg-gray-200 mb-6 flex items-center justify-center overflow-hidden">
                <span className="text-gray-500">No photos available.</span>
            </div>
        );
    }

    const mainPhoto = photos[0];
    const gridPhotos = photos.slice(1, 5);

    return (
        <div className="relative w-full mx-auto">
            {photos.length === 1 ? (
                // Single photo: show it by itself
                <button
                    type="button"
                    onClick={() => setSelectedPhotoIndex(0)}
                    className="relative w-full h-88 md:h-136 overflow-hidden block cursor-pointer"
                    aria-label={`View ${mainPhoto.alt} full screen`}
                >
                    <Image
                        src={mainPhoto.src}
                        alt={mainPhoto.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1152px"
                        className="object-cover"
                        loading="eager"
                        quality={[100, 75]}
                    />
                </button>
            ) : (
                // Multiple photos: hero on the left, up to 4 small ones in a column on the right
                // There should only be a side gallery for screens big enough
                <div className="grid w-full grid-cols-1 md:grid-cols-12 gap-3 md:items-start">
                    <button
                        type="button"
                        onClick={() => setSelectedPhotoIndex(0)}
                        className="relative h-88 md:h-120 overflow-hidden md:col-span-10 block cursor-pointer"
                        aria-label={`View photo 1 of ${address || "property"} full screen`}
                    >
                        <Image
                            src={mainPhoto.src}
                            alt={mainPhoto.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 78vw, 980px"
                            className="object-cover"
                            loading="eager"
                            quality={[100, 75]}
                        />
                    </button>

                    <div className="hidden md:grid md:col-span-2 w-full max-w-56 md:justify-self-center h-88 md:h-120 grid-rows-4 gap-2">
                        {gridPhotos.map((photo, index) => {
                            // photoIndex is the photo's position in the full `photos` array.
                            // gridPhotos starts at photos[1], so index 0 here = photos[1], etc.
                            const photoIndex = index + 1;
                            return (
                                <button
                                    type="button"
                                    key={`${photo.src}-${photoIndex}`}
                                    onClick={() => setSelectedPhotoIndex(photoIndex)}
                                    className="relative overflow-hidden block cursor-pointer"
                                    aria-label={`View photo ${photoIndex + 1} of ${address || "property"} full screen`}
                                >
                                    <Image
                                        src={photo.src}
                                        alt={photo.alt}
                                        fill
                                        sizes="(max-width: 768px) 96vw, (max-width: 1280px) 16vw, 220px"
                                        className="object-cover"
                                        loading="lazy"
                                        quality={[100, 75]}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Gallery Modal Button in the lower right of the 4 photo column */}
            <div className="absolute bottom-0 right-0 z-10 cursor-pointer">
                <PropertyGalleryModal photos={photos} address={address} />
            </div>

            {/* Fullscreen viewer for photos on the property page. The gallery modal has
                its own internal viewer for grid clicks inside the modal. */}
            <PhotoViewer
                photos={photos}
                selectedIndex={selectedPhotoIndex}
                onClose={() => setSelectedPhotoIndex(null)}
                onChangeIndex={setSelectedPhotoIndex}
            />
        </div>
    );
}
