// Page to display all listings
import Image from "next/image";
import Link from "next/link";
import { supabase } from '@/lib/supabase'

export const metadata = {
  title: "Properties | Amelia Huimin Shen",
};

export default async function Properties() {
  // grab subabase data
  const { data: property_data, error } = await supabase
    .from('properties')
    .select('*')

  if (error) {
    console.error(error)
  }

  console.log(property_data)

  return (
    <div>
      <main>  {/* className="" */}
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
