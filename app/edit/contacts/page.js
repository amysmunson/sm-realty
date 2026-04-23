// Page to edit all contact requests. Shows all entries, even if closed.

import EditContactsClient from "@/app/components/EditContactsClient";

export const metadata = {
	title: "Edit Contact Requests | Amelia Huimin Shen",
};

export default function EditContactsPage() {
	return (
		<div>
			<main>
				<div className="relative w-full mb-10 p-4 pt-20">
					<h1 className="justify-center text-center text-black text-4xl font-bold">Edit Contact Requests</h1>
				</div>

				<EditContactsClient />
			</main>
		</div>
	);
}
