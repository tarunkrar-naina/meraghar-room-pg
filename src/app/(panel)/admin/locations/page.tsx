import { fetchAllLocations } from "@/lib/admin-queries";
import { AdminLocations } from "@/components/admin/AdminLocations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Locations",
};

export const revalidate = 0;

export default async function AdminLocationsPage() {
  const rows = await fetchAllLocations();
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-slate-900">Locations</h2>
      <p className="mb-4 text-sm text-slate-500">
        Cities and towns here get their own SEO landing pages (<code>/kaithal</code>,{" "}
        <code>/kaithal/pg</code>, <code>/kaithal/rooms-for-rent</code>) automatically. Add a new city once and all
        category pages plus the sitemap update.
      </p>
      <AdminLocations rows={rows} />
    </div>
  );
}