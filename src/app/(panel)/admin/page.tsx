import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Building2, CheckCircle2, Clock, FileText, MapPin, PhoneCall, Users } from "lucide-react";
import { fetchAdminStats } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const stats = await fetchAdminStats();

  const cards = [
    { label: "Total properties", value: stats.properties, icon: Building2, href: "/admin/properties" },
    { label: "Pending review", value: stats.pendingProperties, icon: Clock, href: "/admin/properties?status=pending", accent: "bg-amber-50 text-amber-600" },
    { label: "Live listings", value: stats.approvedProperties, icon: CheckCircle2, href: "/admin/properties?status=approved" },
    { label: "Registered users", value: stats.users, icon: Users, href: "/admin/users" },
    { label: "Contact leads", value: stats.leads, icon: PhoneCall, href: "/admin/leads", accent: "bg-emerald-50 text-emerald-600" },
    { label: "Open requirements", value: stats.openRequirements, icon: FileText, href: "/admin/requirements", accent: "bg-indigo-50 text-indigo-600" },
    { label: "Open reports", value: stats.reportsOpen, icon: Bell, href: "/admin/reports", accent: "bg-red-50 text-red-600" },
    { label: "Localities", value: stats.localities, icon: MapPin, href: "/admin/localities" },
  ];

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">Overview</h2>
      <p className="mb-6 text-sm text-slate-500">A quick look at your marketplace.</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.accent ?? "bg-teal-50 text-teal-600"}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{c.value}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      {stats.pendingProperties > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-amber-900">{stats.pendingProperties} propert{stats.pendingProperties === 1 ? "y" : "ies"} waiting for review</h3>
              <p className="text-sm text-amber-700">Approve or reject them so owners can start getting leads.</p>
            </div>
            <Link href="/admin/properties?status=pending" className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Review now
            </Link>
          </div>
        </div>
      )}

      {stats.openRequirements > 0 && (
        <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-indigo-900">
                {stats.openRequirements} new requirement{stats.openRequirements === 1 ? "" : "s"} — posters waiting for owners
              </h3>
              <p className="text-sm text-indigo-700">
                Poster ka naam aur phone aapko hi dikhta hai. Matching property owner dhoondhkar inhe milwaayein.
              </p>
            </div>
            <Link href="/admin/requirements" className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              View now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}