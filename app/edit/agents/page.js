// Page to edit all agent entries.

import EditAgentsClient from "@/app/components/EditAgentsClient";

export const metadata = {
	title: "Edit Agents | Amelia Huimin Shen",
};

export default function EditAgentsPage() {
	return (
		<div>
			<main>
				<div className="relative w-full mb-10 p-4 pt-20">
					<h1 className="justify-center text-center text-black text-4xl font-bold">Edit Agents</h1>
				</div>

				<EditAgentsClient />
			</main>
		</div>
	);
}
