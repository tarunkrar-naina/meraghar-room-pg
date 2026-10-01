import { fetchAdminUsers } from "@/lib/admin-queries";
import { AdminUsersTable } from "@/components/admin/AdminUsers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Users",
};

export default async function AdminUsersPage() {
  const rows = await fetchAdminUsers();
  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">Users</h2>
      <p className="mb-4 text-sm text-slate-500">{rows.length} registered users.</p>
      <AdminUsersTable rows={rows} />
    </div>
  );
}