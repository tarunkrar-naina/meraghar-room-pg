"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Database,
  ExternalLink,
  Home,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareWarning,
  PhoneCall,
  Rocket,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/properties", label: "Properties", icon: Home },
  { href: "/admin/leads", label: "Contact Leads", icon: PhoneCall },
  { href: "/admin/requirements", label: "Requirements", icon: ListOrdered, badgeCount: "openRequirements" as const },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: MessageSquareWarning },
];

const CONTENT_NAV = [
  { href: "/admin/localities", label: "Localities", icon: MapPinned },
  { href: "/admin/locations", label: "SEO Locations", icon: Tag },
  { href: "/admin/content", label: "Site Content", icon: Settings2, isNew: true },
];

const TOOLS_NAV = [
  { href: "/admin/database", label: "Database", icon: Database, isNew: true },
  { href: "/admin/deploy", label: "Deploy Website", icon: Rocket, isNew: true },
];

export function AdminShell({
  children,
  openRequirements,
}: {
  children: React.ReactNode;
  openRequirements: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/admin/login");
    router.refresh();
  }

  function renderItem(
    item: (typeof NAV)[number] | (typeof CONTENT_NAV)[number] | (typeof TOOLS_NAV)[number]
  ) {
    const badge = "badgeCount" in item && item.badgeCount === "openRequirements" ? openRequirements : null;
    const isNew = "isNew" in item && item.isNew;
    const active = isActive(item.href, "exact" in item ? item.exact : undefined);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "group inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {isNew && (
          <span
            className={cn(
              "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              active ? "bg-white/20 text-white" : "bg-teal-500/20 text-teal-300"
            )}
          >
            New
          </span>
        )}
        {badge !== null && badge > 0 && (
          <span
            className={cn(
              "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
              active ? "bg-white/25 text-white" : "bg-indigo-500 text-white"
            )}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  }

  const navBody = (
    <>
      <nav className="flex flex-col gap-1">{NAV.map(renderItem)}</nav>

      <p className="mb-1.5 mt-6 px-3 text-[11px] uppercase tracking-wider text-slate-500">
        Website content
      </p>
      <nav className="flex flex-col gap-1">{CONTENT_NAV.map(renderItem)}</nav>

      <p className="mb-1.5 mt-6 px-3 text-[11px] uppercase tracking-wider text-slate-500">
        Tools
      </p>
      <nav className="flex flex-col gap-1">{TOOLS_NAV.map(renderItem)}</nav>

      <p className="mt-6 px-3 text-[11px] leading-relaxed text-slate-600">
        <span className="font-mono text-teal-600">Database</span> se koi bhi table
        dekh aur edit kar sakte hain.
      </p>
    </>
  );

  const topbar = (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 lg:hidden"
          aria-label="Toggle admin menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-bold tracking-tight text-white">
            MeraGhar <span className="font-normal text-slate-400">Admin Panel</span>
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white sm:inline-flex"
        >
          <ExternalLink className="h-4 w-4" />
          View website
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {topbar}

      <div className="mx-auto flex w-full max-w-[1500px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-slate-800 p-3 lg:block">
          {navBody}
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/70" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute bottom-0 left-0 top-0 w-64 overflow-y-auto bg-slate-900 p-3 pt-4">
              {navBody}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 bg-slate-100 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}