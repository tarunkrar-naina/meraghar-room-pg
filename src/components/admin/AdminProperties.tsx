"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Flame, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { cn, formatINR, timeAgo } from "@/lib/utils";
import { propertyPath } from "@/lib/urls";
import { useToast } from "@/components/Toast";
import {
  adminDeleteProperty,
  adminSetPropertyStatus,
  adminToggleFeatured,
  adminToggleVerified,
} from "@/lib/actions/admin";
import type { AdminPropertyRow } from "@/lib/admin-queries";

export function AdminPropertiesTable({ rows }: { rows: AdminPropertyRow[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, label: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) { toast(`${label} done`, "success"); router.refresh(); }
      else toast(res.error ?? "Action failed", "error");
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm text-slate-600">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No properties found.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800 line-clamp-1">{r.title}</p>
                <p className="text-xs text-slate-400">{r.city} · {r.purpose} · {r.property_type} · {timeAgo(r.created_at)}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">{formatINR(r.price)}</td>
              <td className="px-4 py-3">
                <p className="text-sm text-slate-700">{r.owner_name ?? "—"}</p>
                <p className="text-xs text-slate-400">{r.owner_phone ?? ""}</p>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  r.status === "approved" && "bg-emerald-50 text-emerald-700",
                  r.status === "pending" && "bg-amber-50 text-amber-700",
                  r.status === "rejected" && "bg-red-50 text-red-700",
                  r.status === "rented" && "bg-blue-50 text-blue-700",
                  r.status === "sold" && "bg-purple-50 text-purple-700",
                )}>
                  {r.status}
                </span>
                {r.is_verified && <ShieldCheck className="ml-1 inline h-4 w-4 text-teal-600" />}
                {r.is_featured && <Flame className="ml-1 inline h-4 w-4 text-amber-500" />}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <a href={propertyPath(r)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    <Eye className="h-3.5 w-3.5" /> View
                  </a>
                  {r.status !== "approved" && (
                    <button disabled={pending} onClick={() => act(() => adminSetPropertyStatus(r.id, "approved"), "Approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button disabled={pending} onClick={() => act(() => adminSetPropertyStatus(r.id, "rejected"), "Rejected")} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                      Reject
                    </button>
                  )}
                  <button disabled={pending} onClick={() => act(() => adminToggleVerified(r.id, !r.is_verified), r.is_verified ? "Unverified" : "Verified")} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50">
                    {r.is_verified ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {r.is_verified ? "Unverify" : "Verify"}
                  </button>
                  <button disabled={pending} onClick={() => act(() => adminToggleFeatured(r.id, !r.is_featured), r.is_featured ? "Unfeatured" : "Featured")} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                    <Flame className="h-3.5 w-3.5" /> {r.is_featured ? "Unfeature" : "Feature"}
                  </button>
                  <button disabled={pending} onClick={() => {
                    if (!confirm("Delete this listing permanently?")) return;
                    act(() => adminDeleteProperty(r.id), "Deleted");
                  }} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}