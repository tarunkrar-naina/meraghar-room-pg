import type { Metadata } from "next";
import { Home } from "lucide-react";
import { Container, EmptyState } from "@/components/ui";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyGrid } from "@/components/PropertyGrid";
import { Pagination } from "@/components/Pagination";
import { JsonLd } from "@/components/JsonLd";
import { generateMetadata as buildSeoMetadata, generateSchemaMarkup } from "@/lib/seo";
import { fetchCities, fetchFavoriteIds, fetchLocalities, fetchPublicProperties } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth";
import { strParam } from "@/lib/utils";
import type { AppPageProps, PropertyFilters as Filters } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function generateMetadata(props: AppPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const city = strParam(searchParams.city);
  const purpose = strParam(searchParams.purpose);
  const parts: string[] = [];
  if (city) parts.push(`${city} properties`);
  if (purpose === "rent") parts.push("for rent");
  if (purpose === "sale") parts.push("for sale");
  const title = parts.length ? `${parts.join(" ")} in Haryana` : "Properties for Rent & Sale in Haryana";
  const hasFilters = Object.keys(searchParams).some((key) => !["view"].includes(key));
  return {
    ...buildSeoMetadata("static", {
      title,
      description: `Search ${title}. Browse rooms, PGs, flats, houses, shops and plots with local owner contact on MeraGhar.`,
      path: "/properties/",
      keywords: ["property Haryana", city || "property in Haryana", purpose === "rent" ? "property for rent" : "property for sale"],
    }),
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function PropertiesPage(props: AppPageProps) {
  const searchParams = await props.searchParams;
  const page = Math.max(Number(strParam(searchParams.page)) || 1, 1);
  const listView = strParam(searchParams.view) === "list";

  const user = await getAuthUser();
  const favoriteIds = user ? await fetchFavoriteIds(user.id) : [];

  const [cities, localities, result] = await Promise.all([
    fetchCities(),
    fetchLocalities(),
    fetchPublicProperties({
      city: strParam(searchParams.city),
      locality: strParam(searchParams.locality),
      purpose: strParam(searchParams.purpose),
      type: strParam(searchParams.type),
      minPrice: Number(strParam(searchParams.minPrice)) || undefined,
      maxPrice: Number(strParam(searchParams.maxPrice)) || undefined,
      bhk: strParam(searchParams.bhk),
      furnishing: strParam(searchParams.furnishing),
      availableImmediately: strParam(searchParams.available) === "1",
      verifiedOnly: strParam(searchParams.verified) === "1",
      sort: (strParam(searchParams.sort) as Filters["sort"]) || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(Math.ceil(result.count / PAGE_SIZE), 1);

  const filterSummary = [
    strParam(searchParams.city),
    strParam(searchParams.locality),
    strParam(searchParams.purpose) === "rent" ? "Rent" : strParam(searchParams.purpose) === "sale" ? "Sale" : null,
    strParam(searchParams.type)?.toUpperCase(),
  ].filter(Boolean);

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {filterSummary.length ? filterSummary.join(" · ") : "All Properties"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {result.count > 0
            ? `${result.count} listing${result.count === 1 ? "" : "s"} found in ${strParam(searchParams.city) || "Kaithal, Kurukshetra, Pundri & Narwana"}`
            : "No listings match your search"}
        </p>
      </div>

      {/* Toolbar + filters */}
      <div className="mb-8">
        <PropertyFilters cities={cities} localities={localities} />
      </div>

      <div>
        {result.properties.length === 0 ? (
          <EmptyState
            icon={<Home className="h-7 w-7" />}
            title="No properties found in this location."
            description="Try changing the city, locality or price filters. New listings are added by owners every day."
          />
        ) : (
          listView ? (
            <div className="grid grid-cols-1 gap-5">
              {result.properties.map((p) => (
                <PropertyCard key={p.id} property={p} saved={favoriteIds.includes(p.id)} isLoggedIn={Boolean(user)} layout="list" />
              ))}
            </div>
          ) : (
            <PropertyGrid properties={result.properties} savedIds={favoriteIds} isLoggedIn={Boolean(user)} />
          )
        )}

        <Pagination page={page} totalPages={totalPages} />
      </div>
      <JsonLd
        data={generateSchemaMarkup("ItemList", {
          items: result.properties.map((property) => ({ name: property.title, url: `/properties/${property.id}` })),
        })}
      />
    </Container>
  );
}