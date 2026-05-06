// Page to edit all tables. Shows all entries, even if closed.

import EditAgentsClient from "@/app/components/EditAgentsClient";
import EditPropertiesClient from "@/app/components/EditPropertiesClient";
import EditShowingsClient from "@/app/components/EditShowingsClient";
import EditApplicationsClient from "@/app/components/EditApplicationsClient";
import EditContactsClient from "@/app/components/EditContactsClient";
import EditHomepage from "@/app/components/EditHomepage";
import EditNavigationBar from "@/app/components/EditNavigationBar";

export const metadata = {
	title: "Edit Dashboard | Shen Munson Realty",
};

export default function EditPage() {
	return (
		<div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-50 pb-16">
			<main className="mx-auto w-full max-w-375 px-4 pt-20 sm:px-6 lg:px-8">
				<section className="relative mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-200/40 blur-2xl" />
					<div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-cyan-200/40 blur-2xl" />

					<div className="relative p-6 sm:p-8">
						<h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Edit Dashboard</h1>
						<p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-700 sm:text-base">
							Update all tables in one place. Each section saves independently, so you can safely make changes across
							multiple sections and save when you are ready.
						</p>

						<div className="mt-5 flex flex-wrap gap-2">
							<a href="#homepage" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Homepage</a>
							<a href="#properties" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Properties</a>
							<a href="#contacts" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Contacts</a>
							<a href="#showings" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Showings</a>
							<a href="#applications" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Applications</a>
							<a href="#agents" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Agents</a>
						</div>

						<div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
							<EditNavigationBar />
						</div>
					</div>
				</section>

        <div id="homepage" className="mb-8 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Homepage Photos</h2>
          <EditHomepage />
        </div>

        <div id="properties" className="mb-8 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Properties</h2>
          <EditPropertiesClient />
        </div>

        <div id="contacts" className="mb-8 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Contacts</h2>
          <EditContactsClient />
        </div>

        <div id="showings" className="mb-8 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Showings</h2>
          <EditShowingsClient />
        </div>

        <div id="applications" className="mb-8 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Rental Applications</h2>
          <EditApplicationsClient />
        </div>

        <div id="agents" className="mb-40 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
          <h2 className="justify-center text-center text-black text-2xl font-bold m-4">Agents</h2>
          <EditAgentsClient />
        </div>
			</main>
		</div>
	);
}