import { fetchAdminReports } from "@/lib/admin-queries";
import { AdminReportsTable } from "@/components/admin/AdminReports";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports",
};

export default async function AdminReportsPage() {
  const rows = await fetchAdminReports();
  const open = rows.filter((r) => r.status === "open").length;

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">Reports</h2>
      <p className="mb-4 text-sm text-slate-500">
        {open > 0 ? `${open} open report${open === 1 ? "" : "s"} need review.` : "No open reports. Nice!"}
      </p>
      <AdminReportsTable rows={rows} />
    </div>
  );
}