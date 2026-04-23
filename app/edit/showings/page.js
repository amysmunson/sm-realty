// Page to edit all showing requests. Shows all entries, even if closed.

import EditShowingsClient from "@/app/components/EditShowingsClient";

export const metadata = {
	title: "Edit Showing Requests | Amelia Huimin Shen",
};

export default function EditShowingsPage() {
	return (
		<div>
			<main>
				<div className="relative w-full mb-10 p-4 pt-20">
					<h1 className="justify-center text-center text-black text-4xl font-bold">Edit Showing Requests</h1>
				</div>

				<EditShowingsClient />
			</main>
		</div>
	);
}
