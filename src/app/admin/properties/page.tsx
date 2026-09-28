import Link from "next/link";
import { fetchAdminProperties } from "@/lib/admin-queries";
import { AdminPropertiesTable } from "@/components/admin/AdminProperties";
import { cn } from "@/lib/utils";
import type { AppPageProps } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Properties",
};

const statuses = ["all", "pending", "approved", "rejected", "rented", "sold"] as const;

export default async function AdminPropertiesPage(
  props: AppPageProps<Record<string, never>, { status?: string }>
) {
  const searchParams = await props.searchParams;
  const active = statuses.includes(searchParams.status as (typeof statuses)[number])
    ? (searchParams.status as string)
    : "all";
  const rows = await fetchAdminProperties(active === "all" ? undefined : active);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Properties</h2>
        <div className="flex gap-1 overflow-x-auto text-xs font-medium">
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/admin/properties?status=${s}`}
              className={cn(
                "rounded-full px-3 py-1.5 capitalize transition-colors",
                active === s ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>
      <AdminPropertiesTable rows={rows} />
    </div>
  );
}