import Image from "next/image";
import Link from "next/link";

export default function PropertyCard({ property, photoUrl }) {
  return (
    <Link
      href={`/properties/${property.p_id}`}
      className="flex items-center overflow-hidden gap-4 p-4 lg:pl-0 bg-white border-gray-200 border b rounded-lg shadow-md hover:bg-gray-100 transition cursor-pointer"
    >
      <div className="flex-none flex items-center justify-center relative aspect-4/3 h-32 sm:h-40 lg:h-60 rounded-md lg:rounded-l-lg lg:rounded-r-md overflow-hidden bg-gray-300">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={property.address}
            fill
            sizes="(max-width: 768px) 38vw, 50vw"
            quality={[100, 75]}
            className="object-cover"
            loading="eager"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-1/2 h-1/2 text-zinc-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        )}
      </div>

      <div aria-label="Property Information" className="flex-1 min-w-0 flex items-center h-full">
        <div className="w-full text-left"> 
          {/* p-4 pb-8 */}
          <div className="text-lg font-semibold">{property.address}</div>
          <div className="text-sm pb-4">{property.city}, CA</div>
          <div className="w-full flex items-center justify-start gap-4">
            <div className="text-sm">{property.beds || "—"} Beds</div>
            <div className="text-sm">{property.baths || "—"} Baths</div>
            <div className="text-sm">{property.sqft || "—"} sqft</div>
          </div>
          <div className="text-sm">${property.monthly_rent || "—"}/mo</div>
        </div>
      </div>
    </Link>
  );
}
