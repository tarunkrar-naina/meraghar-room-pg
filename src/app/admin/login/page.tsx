import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginCard } from "@/components/admin/AdminLogin";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Standalone admin login. It sits outside the /admin layout on purpose - the
 * layout would redirect back here before the form could render.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <Suspense fallback={null}>
        <AdminLoginCard />
      </Suspense>
    </div>
  );
}