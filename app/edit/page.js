// Page to edit all tables. Shows all entries, even if closed.

import EditAgentsClient from "@/app/components/edits/EditAgentsClient";
import EditPropertiesClient from "@/app/components/edits/EditPropertiesClient";
import EditShowingsClient from "@/app/components/edits/EditShowingsClient";
import EditApplicationsClient from "@/app/components/edits/EditApplicationsClient";
import EditContactsClient from "@/app/components/edits/EditContactsClient";
import EditHomepage from "@/app/components/edits/EditHomepage";
import EditNavigationBar from "@/app/components/edits/EditNavigationBar";

export const metadata = {
	title: "Edit Dashboard | Shen Munson Realty",
};

export default function EditPage() {
	return (
		<div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-50 pb-16">
			<main className="mx-auto w-full max-w-375 px-4 pt-20 sm:px-6 lg:px-8">
				<h1 className="heading-page">Edit Dashboard</h1>
				<section className="card-intro">
					<div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-200/60 blur-2xl" />
					<div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-cyan-200/50 blur-2xl" />

					<div className="relative p-6 sm:p-8">
						<p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
							Update all tables in one place. Each section saves independently, so you can safely make changes across
							multiple sections and save when you are ready.
						</p>

						<div className="mt-5 flex flex-wrap gap-2">
							<a href="#homepage" className="btn-nav-pill">Homepage</a>
							<a href="#properties" className="btn-nav-pill">Properties</a>
							<a href="#contacts" className="btn-nav-pill">Contacts</a>
							<a href="#showings" className="btn-nav-pill">Showings</a>
							<a href="#applications" className="btn-nav-pill">Applications</a>
							<a href="#agents" className="btn-nav-pill">Agents</a>
						</div>

						<div className="mt-6 rounded-xl">
							<EditNavigationBar />
						</div>
					</div>
				</section>

        <div id="homepage" className="card-edit-table">
          <h2 className="heading-dashboard-section">Homepage Photos</h2>
          <EditHomepage />
        </div>

        <div id="properties" className="card-edit-table">
          <EditPropertiesClient />
        </div>

        <div id="contacts" className="card-edit-table">
          <h2 className="heading-dashboard-section">Contacts</h2>
          <EditContactsClient />
        </div>

		<div id="applications" className="card-edit-table">
          <h2 className="heading-dashboard-section">Property-Specific Contact Requests</h2>
          <EditApplicationsClient />
        </div>

        <div id="showings" className="card-edit-table">
          <h2 className="heading-dashboard-section">Showings</h2>
          <EditShowingsClient />
        </div>

        <div id="agents" className="card-edit-table">
          <EditAgentsClient />
        </div>
			</main>
		</div>
	);
}