import { fetchAllLocalities } from "@/lib/admin-queries";
import { AdminLocalities } from "@/components/admin/AdminLocalities";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Localities",
};

export default async function AdminLocalitiesPage() {
  const rows = await fetchAllLocalities();
  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">Localities</h2>
      <p className="mb-4 text-sm text-slate-500">
        Localities power the popular-locations section and are used in filters and dashboards.
      </p>
      <AdminLocalities rows={rows} />
    </div>
  );
}