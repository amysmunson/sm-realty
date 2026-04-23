// Page to edit all properties. Shows all entries, even if closed.

import EditPropertiesClient from "@/app/components/EditPropertiesClient";

export const metadata = {
	title: "Edit Properties | Amelia Huimin Shen",
};

export default function EditPropertiesPage() {
	return (
		<div>
			<main>
				<div className="relative w-full mb-10 p-4 pt-20">
					<h1 className="justify-center text-center text-black text-4xl font-bold">Edit Properties</h1>
				</div>

				<EditPropertiesClient />
			</main>
		</div>
	);
}