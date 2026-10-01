import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-access";
import { fetchOpenRequirementCount } from "@/lib/admin-queries";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDenied } from "@/components/admin/AdminDenied";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: {
    default: "MeraGhar Admin Panel",
    template: "%s | MeraGhar Admin",
  },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Gate for every /admin route.
 *
 * The layout is a convenience gate only - each page and each server action also
 * calls `assertAdmin()` on its own, because a layout alone does not stop a route
 * from rendering under App Router partial rendering, and because the data layer
 * must never depend on a page-level check.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const env = getPublicEnv();

  if (!env.isSupabaseConfigured) {
    return (
      <AdminDenied
        title="Supabase configure nahi hai"
        message="NEXT_PUBLIC_SUPABASE_URL aur NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local me daalein, phir site restart karein."
      />
    );
  }

  const guard = await assertAdmin();

  if (guard.ok) {
    const openRequirements = await fetchOpenRequirementCount();
    return <AdminShell openRequirements={openRequirements}>{children}</AdminShell>;
  }

  if (guard.reason === "not_configured") {
    return <AdminDenied title="Service key missing" message={guard.error} />;
  }

  // Signed out -> the dedicated admin login. Signed in but not an admin -> a page
  // that says so, rather than a silent redirect that looks like a broken site.
  if (guard.reason === "signed_out") {
    redirect("/admin/login");
  }

  // Password was accepted but the authenticator step was skipped or unfinished.
  // Sending them back to /admin/login is what actually completes the 2FA flow.
  if (guard.reason === "mfa_required") {
    return (
      <AdminDenied
        title="2FA adhoora hai"
        message="Aapka password verify ho gaya, lekin authenticator app ka code verify nahi hua. Dobara login karke 2FA complete karein."
        actionHref="/admin/login"
        actionLabel="Dobara login karein"
      />
    );
  }

  return (
    <AdminDenied
      title="Aap admin nahi hain"
      message={guard.error}
      actionHref="/login"
      actionLabel="Apne account se login karein"
    />
  );
}