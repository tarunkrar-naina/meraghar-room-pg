import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Container, EmptyState } from "@/components/ui";
import { PropertyCard } from "@/components/PropertyCard";
import { getAuthUser } from "@/lib/auth";
import { fetchFavoriteProperties } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved Properties",
  description: "Properties you have saved on MeraGhar in Kaithal, Kurukshetra, Pundri and Narwana.",
};

export default async function FavoritesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/favorites");

  // Broker model: favorites is admin-only. Customers are sent back home.
  if (user.profile?.role !== "admin") redirect("/");

  const properties = await fetchFavoriteProperties(user.id);

  return (
    <Container className="py-8">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900">Saved properties</h1>
      <p className="mb-6 text-sm text-slate-500">
        {properties.length > 0
          ? `${properties.length} saved listing${properties.length === 1 ? "" : "s"}`
          : "No properties saved yet."}
      </p>

      {properties.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-7 w-7" />}
          title="No saved properties"
          description="Tap the heart on any listing to save it here for later."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} saved isLoggedIn />
          ))}
        </div>
      )}
    </Container>
  );
}