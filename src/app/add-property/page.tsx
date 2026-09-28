import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PropertyForm } from "@/components/PropertyForm";
import { fetchCities, fetchLocalities } from "@/lib/queries";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Post a Property",
  description: "Add a property listing on MeraGhar in Kaithal, Kurukshetra, Pundri and Narwana.",
};

export default async function AddPropertyPage() {
  const user = await requireAdmin();
  const [cities, localities] = await Promise.all([fetchCities(), fetchLocalities()]);

  return (
    <Container className="max-w-3xl py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Post your property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fill in the details below. Save karte hi aapki property MeraGhar par live ho jayegi aur home
        page par card ki form me dikhegi.
      </p>
      <div className="mt-6">
        <PropertyForm userId={user.id} cities={cities} localities={localities} />
      </div>
    </Container>
  );
}