import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertAdmin } from "@/lib/admin-access";
import { fetchCities, fetchLocalities } from "@/lib/queries";
import { PropertyForm } from "@/components/PropertyForm";

export const metadata: Metadata = { title: "Nayi Property" };

export const dynamic = "force-dynamic";

export default async function AdminNewPropertyPage() {
  const guard = await assertAdmin();
  if (!guard.ok) notFound();

  const [cities, localities] = await Promise.all([fetchCities(), fetchLocalities()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/properties"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Properties par wapas
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
        Nayi property add karein
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Details bharein, photos upload karein, aur status chunein. Approved status par property
        turant public site par live ho jati hai.
      </p>
      <div className="mt-6">
        <PropertyForm
          userId={guard.user.id}
          cities={cities}
          localities={localities}
          adminMode
          initialStatus="approved"
          successHref="/admin/properties"
        />
      </div>
    </div>
  );
}