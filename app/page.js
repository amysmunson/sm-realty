import Image from "next/image";
import { supabase } from '@/lib/supabase'

export default async function Home() {
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
            <li key={property.p_id}>{property.address}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
