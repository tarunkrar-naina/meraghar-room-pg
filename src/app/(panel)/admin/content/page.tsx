import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { assertAdmin } from "@/lib/admin-access";
import { fetchSettingsForAdmin } from "@/lib/site-settings";
import { SETTING_GROUPS } from "@/lib/site-settings";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const metadata: Metadata = { title: "Site Content" };

export const dynamic = "force-dynamic";

const PREVIEW_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default async function AdminContentPage() {
  const guard = await assertAdmin();
  if (!guard.ok) notFound();

  const fields = await fetchSettingsForAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">Site Content</h2>
        <p className="text-sm text-slate-500">
          Website ka text yahin se badal sakte hain - code chhune ki zaroorat nahi. Save karte hi
          pages turant update ho jaate hain.
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Content settings table nahi mili</p>
            <p className="mt-1">
              Ye tabhi kaam karega jab{" "}
              <code className="rounded bg-amber-100 px-1">20260925000000_admin_panel.sql</code>{" "}
              migration Supabase me apply ho. Tab tak site apne hardcoded text par chal rahi hai.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ContentEditor fields={fields} groups={SETTING_GROUPS} />
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <span className="text-sm text-slate-500">Preview:</span>
            {PREVIEW_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {link.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}