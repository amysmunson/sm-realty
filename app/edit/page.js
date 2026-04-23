// Page to edit all tables. Shows all entries, even if closed.

import EditAgentsClient from "@/app/components/EditAgentsClient";
import EditPropertiesClient from "@/app/components/EditPropertiesClient";
import EditShowingsClient from "@/app/components/EditShowingsClient";
import EditApplicationsClient from "@/app/components/EditApplicationsClient";
import EditContactsClient from "@/app/components/EditContactsClient";

export const metadata = {
	title: "Edit Dashboard | Amelia Huimin Shen",
};

export default function EditPropertiesPage() {
	return (
		<div>
			<main>
				<div className="relative w-full mb-8 p-4 pt-20">
					<h1 className="justify-center text-center text-black text-4xl font-bold">Edit Dashboard</h1>
				</div>

        <div id="properties" className="mb-8 scroll-mt-24">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Properties</h2>
          <EditPropertiesClient />
        </div>

        <div id="contacts" className="mb-8 scroll-mt-24">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Contacts</h2>
          <EditContactsClient />
        </div>

        <div id="showings" className="mb-8 scroll-mt-24">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Showings</h2>
          <EditShowingsClient />
        </div>

        <div id="applications" className="mb-8 scroll-mt-24">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Rental Applications</h2>
          <EditApplicationsClient />
        </div>

        <div id="agents" className="mb-40 scroll-mt-24">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Agents</h2>
          <EditAgentsClient />
        </div>
			</main>
		</div>
	);
}