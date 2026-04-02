// Home Page for Amelia Shen

import Image from "next/image";
import Link from "next/link";
import { supabase } from '@/lib/supabase'

export const metadata = {
  title: "Amelia Huimin Shen, Broker",
  description: "Broker Amelia Huimin Shen's Home Page",
};

export default async function Home() {
  // grab subabase data
  const { data: property_data, error } = await supabase
    .from('properties')
    .select('*')
    // .where()

  if (error) {
    console.error(error)
  }

  console.log(property_data)

  return (
    <div>
      <main>
        <div className="relative w-full h-125">
          <Image
            src="/placeholder_home_image.jpg"
            alt="Home Background"
            fill
            className="object-cover"
            loading="eager"
          />
          <div className="absolute w-full top-1/2 -translate-y-1/2 h-32 bg-black opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-white text-4xl font-bold p-4 rounded">
              Amelia Shen
            </h1>
          </div>
        </div>
        <h1>About</h1>
        <p>We help clients rent and sell properties.</p>
        <h1>Properties</h1>
          <ul>
              {property_data?.map(property => (
                <li key={property.p_id}>
                  <Link href={`/properties/${property.p_id}`}>{property.address}</Link>
                </li>
              ))}
          </ul>
      </main>
    </div>
  );
}
