"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  Building2,
  CheckCircle2,
  Heart,
  KeyRound,
  Loader2,
  MailCheck,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { formatINR, timeAgo } from "@/lib/utils";
import { type PropertyListItem, type RequirementRow } from "@/types";
import { PropertyCard } from "@/components/PropertyCard";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { deleteProperty, setPropertyStatus } from "@/lib/actions/property";
import { updateProfile } from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { propertyPath } from "@/lib/urls";

type DashboardProps = {
  user: { id: string; name: string; phone: string; email?: string; avatar_url?: string | null };
  properties: { id: string; title: string; purpose: string; property_type: string; price: number; status: string; created_at: string; is_featured: boolean; is_verified: boolean; city: string; locality?: string | null; image_url?: string | null; bhk?: number | null; furnishing: string; rent_period?: string | null }[];
  favorites: PropertyListItem[];
  requirements: RequirementRow[];
};

const tabs = ["listings", "saved", "requirements", "profile"] as const;
type Tab = (typeof tabs)[number];

export function Dashboard({ user, properties, favorites, requirements }: DashboardProps) {
  const [tab, setTab] = useState<Tab>("listings");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">My Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your listings, saved properties and account.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/add-property">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> Post property
            </Button>
          </Link>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} label="My listings" value={String(properties.length)} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active listings" value={String(properties.filter((p) => p.status === "approved").length)} />
        <StatCard icon={<Heart className="h-5 w-5" />} label="Saved" value={String(favorites.length)} />
        <StatCard icon={<MailCheck className="h-5 w-5" />} label="Requirements" value={String(requirements.length)} />
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px text-sm font-medium text-slate-500">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 transition-colors sm:px-4",
              tab === t ? "border-teal-600 text-teal-700" : "border-transparent hover:text-slate-700"
            )}
          >
            {t === "listings" && "My Properties"}
            {t === "saved" && "Saved"}
            {t === "requirements" && "Requirements"}
            {t === "profile" && "Profile"}
          </button>
        ))}
      </div>

      {/* tab panels */}
      {tab === "listings" && <MyPropertiesPanel properties={properties} />}
      {tab === "saved" && (
        favorites.length === 0
          ? <EmptyCard title="No saved properties" description="Save properties from the listings page to see them here." />
          : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map(p => <PropertyCard key={p.id} property={p} saved isLoggedIn />)}</div>
      )}
      {tab === "requirements" && <RequirementsPanel requirements={requirements} />}
      {tab === "profile" && <ProfilePanel user={user} />}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">{icon}</span>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function MyPropertiesPanel({ properties }: { properties: DashboardProps["properties"] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pendingId, startTransition] = useTransition();

  function mark(id: string, status: string) {
    startTransition(async () => {
      const s = status === "rented" ? "rented" : status === "sold" ? "sold" : "approved";
      const result = await setPropertyStatus(id, s);
      if (result.ok) { toast("Status updated", "success"); router.refresh(); }
      else toast(result.error ?? "Update failed", "error");
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this listing permanently?")) return;
    startTransition(async () => {
      const result = await deleteProperty(id);
      if (result.ok) { toast("Listing deleted", "success"); router.refresh(); }
      else toast(result.error ?? "Delete failed", "error");
    });
  }

  if (properties.length === 0) return <EmptyCard title="You haven't posted any properties yet." description="Click 'Post property' to list your first property on MeraGhar." />;

  return (
    <div className="space-y-3">
      {properties.map((p) => (
        <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image_url && <img src={p.image_url} alt={p.title} className="h-20 w-24 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-slate-900">{p.title}</h3>
              {p.status !== "approved" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-800">{p.status}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{p.city} · {formatINR(p.price)} · Posted {timeAgo(p.created_at)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link href={`/edit-property/${p.id}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
                <Settings className="h-3.5 w-3.5" /> Edit
              </Link>
              {p.status === "approved" && (
                <>
                  <button disabled={!!pendingId} onClick={() => mark(p.id, "rented")} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100">
                    Mark rented
                  </button>
                  <button disabled={!!pendingId} onClick={() => mark(p.id, "sold")} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
                    Mark sold
                  </button>
                </>
              )}
              <button disabled={!!pendingId} onClick={() => remove(p.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
          <Link href={propertyPath(p)} className="hidden text-slate-400 hover:text-teal-600 sm:block"><ArrowUpRight className="h-5 w-5" /></Link>
        </div>
      ))}
    </div>
  );
}

function RequirementsPanel({ requirements }: { requirements: RequirementRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Your requirements</h3>
        <Link href="/post-requirement" className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
          <Plus className="h-3.5 w-3.5" /> Post requirement
        </Link>
      </div>
      {requirements.length === 0
        ? <EmptyCard title="No requirements posted yet." description="Looking for a specific property? Post your requirement and let owners find you." />
        : requirements.map(r => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-semibold text-slate-900">{r.title}</h4>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">{r.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{[r.city, r.locality].filter(Boolean).join(", ")}</p>
            {r.description && <p className="mt-1.5 text-sm text-slate-600">{r.description}</p>}
            <p className="mt-2 text-xs text-slate-400">Posted {timeAgo(r.created_at)}</p>
          </div>
        ))
      }
    </div>
  );
}

function ProfilePanel({ user }: { user: DashboardProps["user"] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name: name.trim(), phone: phone.trim() });
      if (result.ok) { toast("Profile updated", "success"); router.refresh(); }
      else toast(result.error ?? "Update failed", "error");
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-2xl font-bold text-white">
          {user.name?.charAt(0)?.toUpperCase() ?? "U"}
        </span>
        <div>
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email ?? user.phone}</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <Field label="Name">
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))} inputMode="numeric" required />
        </Field>
        <Button type="submit" loading={pending}>Save changes</Button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Security</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/update-password" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <KeyRound className="h-4 w-4" /> Change password
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await signOut();
        toast("Logged out", "success");
        router.replace("/");
        router.refresh();
      })}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Logout
    </button>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Bookmark className="mx-auto h-8 w-8 text-slate-300" />
      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}