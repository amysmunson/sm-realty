// Page to edit all rental applications. Shows all entries, even if closed.

import EditApplicationsClient from "@/app/components/EditApplicationsClient";

export const metadata = {
  title: "Edit Rental Applications | Amelia Huimin Shen",
};

export default function EditApplicationsPage() {
  return (
    <div>
      <main>
        <div className="relative w-full mb-10 p-4 pt-20">
          <h1 className="justify-center text-center text-black text-4xl font-bold">Edit Rental Applications</h1>
        </div>

        <EditApplicationsClient />
      </main>
    </div>
  );
}
