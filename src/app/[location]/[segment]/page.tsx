import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Home } from "lucide-react";
import { Container, EmptyState } from "@/components/ui";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyGrid } from "@/components/PropertyGrid";
import { Pagination } from "@/components/Pagination";
import { Breadcrumb } from "@/components/Navigation/Breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { LocationFaq } from "@/components/locations/LocationFaq";
import { LocationLandingContent } from "@/components/locations/LocationLandingContent";
import {
  areaPath,
  categoryPath,
  getChildLocations,
  getLocationBySlug,
  getNearbyLocations,
  getLocalitiesForCity,
  isCategorySegment,
  locationPath,
  resolveAreaBySlug,
} from "@/lib/locations";
import { getCategoryBySlug, LOCATION_CATEGORIES } from "@/lib/locations/catalog";
import {
  areaPageDescription,
  areaPageTitle,
  buildAreaMetadata,
  buildCategoryMetadata,
  buildLocationMetadata,
  categoryPageDescription,
  categoryPageTitle,
  locationPageTitle,
} from "@/lib/locations/seo";
import { categoryPageJsonLd } from "@/lib/locations/structured-data";
import { buildCanonicalUrl } from "@/lib/seo";
import { propertyPath } from "@/lib/urls";
import { fetchCities, fetchCategoryStats, fetchCityStats, fetchFavoriteIds, fetchLocalities, fetchPublicProperties } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth";
import { strParam } from "@/lib/utils";
import type { AppPageProps, LocationRow } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function generateMetadata(props: AppPageProps): Promise<Metadata> {
  const { location: locationSlug, segment } = await props.params;
  const location = await getLocationBySlug(locationSlug);
  if (!location) return {};

  const category = getCategoryBySlug(segment.toLowerCase());
  if (category) {
    const stats = await fetchCategoryStats(location.name, category.purpose ?? "rent", category.type ?? "");
    return buildCategoryMetadata(category, location, stats);
  }

  if (isCategorySegment(segment)) return {};

  const child = await getChildLocations(location.slug);
  const childMatch = child.find((c) => c.slug.toLowerCase() === segment.toLowerCase());
  if (childMatch) {
    const stats = await fetchCityStats(childMatch.name);
    return buildLocationMetadata(childMatch, stats);
  }

  const area = await resolveAreaBySlug(location, segment);
  if (area) {
    const stats = await fetchCityStats(location.name);
    return buildAreaMetadata(area, location, stats);
  }

  return {};
}

async function resolveSegment(location: LocationRow, segment: string) {
  const category = getCategoryBySlug(segment.toLowerCase());
  if (category) return { kind: "category" as const, category, child: null as LocationRow | null, area: null as string | null };

  const childLocations = await getChildLocations(location.slug);
  const child = childLocations.find((c) => c.slug.toLowerCase() === segment.toLowerCase());
  if (child) return { kind: "child" as const, category: null, child, area: null };

  const area = await resolveAreaBySlug(location, segment);
  if (area) return { kind: "area" as const, category: null, child: null, area };

  return null;
}

export default async function LocationSegmentPage(props: AppPageProps) {
  const { location: locationSlug, segment } = await props.params;
  const searchParams = await props.searchParams;
  const page = Math.max(Number(strParam(searchParams.page)) || 1, 1);

  const location = await getLocationBySlug(locationSlug);
  if (!location) notFound();

  const resolved = await resolveSegment(location, segment);
  if (!resolved) notFound();
  if (resolved.kind === "category") return <CategoryView location={location} categorySlug={resolved.category.slug} page={page} searchParams={searchParams} />;
  if (resolved.kind === "child") return <ChildView location={location} child={resolved.child} />;

  const stats = await fetchCityStats(location.name);
  return <AreaView location={location} area={resolved.area} stats={stats} page={page} />;
}

async function CategoryView({
  location,
  categorySlug,
  page,
  searchParams,
}: {
  location: LocationRow;
  categorySlug: string;
  page: number;
  searchParams: AppPageProps["searchParams"] extends Promise<infer S> ? S : never;
}) {
  const category = getCategoryBySlug(categorySlug) as NonNullable<ReturnType<typeof getCategoryBySlug>>;
  const [stats, cities, localities, user] = await Promise.all([
    fetchCategoryStats(location.name, category.purpose ?? "rent", category.type ?? ""),
    fetchCities(),
    fetchLocalities(),
    getAuthUser(),
  ]);
  const favoriteIds = user ? await fetchFavoriteIds(user.id) : [];

  const pageNum = page;
  const result = await fetchPublicProperties({
    cityVariants: [location.name, location.name.toLowerCase()],
    purpose: category.purpose,
    type: category.type,
    locality: strParam(searchParams.locality) || undefined,
    bhk: strParam(searchParams.bhk) || undefined,
    furnishing: strParam(searchParams.furnishing) || undefined,
    minPrice: Number(strParam(searchParams.minPrice)) || undefined,
    maxPrice: Number(strParam(searchParams.maxPrice)) || undefined,
    sort: (strParam(searchParams.sort) as undefined | "newest" | "price_asc" | "price_desc") || undefined,
    page: pageNum,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(Math.ceil(result.count / PAGE_SIZE), 1);

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumb
        items={[
          { name: location.name, href: locationPath(location.slug) },
          { name: category.label, href: categoryPath(location.slug, category.slug) },
        ]}
      />

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {categoryPageTitle(category, location)}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">{categoryPageDescription(category, location, stats)}</p>

      <div className="mt-6 p-4 rounded-2xl border border-slate-200 bg-white">
        <PropertyFilters cities={cities} localities={localities} />
      </div>

      <div className="mt-8">
        {result.properties.length === 0 ? (
          <EmptyState
            icon={<Home className="h-7 w-7" />}
            title={`No ${category.label.toLowerCase()} in ${location.name} yet.`}
            description="Owners add new listings every day. Check back soon or change the filters."
            action={
              <Link href="/post-requirement" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                Post a requirement →
              </Link>
            }
          />
        ) : (
          <PropertyGrid properties={result.properties} savedIds={favoriteIds} isLoggedIn={Boolean(user)} />
        )}

        <Pagination page={pageNum} totalPages={totalPages} />
      </div>

      <div className="mt-12 space-y-10">
        <section aria-labelledby="related-categories">
          <h2 id="related-categories" className="mb-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            More in {location.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {LOCATION_CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
              <Link
                key={c.slug}
                href={categoryPath(location.slug, c.slug)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-teal-300 hover:text-teal-700"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <LocationFaq location={location} category={category} areas={location.areas ?? []} />
      </div>

      <JsonLd
        data={categoryPageJsonLd({
          siteUrl: buildCanonicalUrl("/"),
          url: categoryPath(location.slug, category.slug),
          name: categoryPageTitle(category, location),
          description: categoryPageDescription(category, location, stats),
          category,
          location,
          stats,
          listings: result.properties.map((p) => ({
            url: buildCanonicalUrl(propertyPath(p)),
            title: p.title,
          })),
        })}
      />
    </Container>
  );
}

async function ChildView({ location, child }: { location: LocationRow; child: LocationRow }) {
  const [stats, nearby, grandchildren, localities, user] = await Promise.all([
    fetchCityStats(child.name),
    getNearbyLocations(child),
    getChildLocations(child.slug),
    getLocalitiesForCity(child.name),
    getAuthUser(),
  ]);
  const favoriteIds = user ? await fetchFavoriteIds(user.id) : [];

  const result = await fetchPublicProperties({
    cityVariants: [child.name, child.name.toLowerCase()],
    page: 1,
    pageSize: 9,
    sort: "newest",
  });

  const areas = Array.from(new Set([...(child.areas ?? []), ...localities.map((l) => l.locality)]));

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumb
        items={[
          { name: location.name, href: locationPath(location.slug) },
          { name: child.name, href: locationPath(child.slug) },
        ]}
      />
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {locationPageTitle(child)}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Rooms, PGs, flats and houses for rent and sale in {child.name}{child.state ? `, ${child.state}` : ""}.
      </p>

      <div className="mt-8">
        <LocationLandingContent
          location={child}
          stats={stats}
          listings={result.properties}
          total={result.count}
          favoriteIds={favoriteIds}
          isLoggedIn={Boolean(user)}
          nearby={nearby}
          childLocations={grandchildren}
          areas={areas}
        />
      </div>

    </Container>
  );
}

async function AreaView({
  location,
  area,
  stats,
  page,
}: {
  location: LocationRow;
  area: string;
  stats: Awaited<ReturnType<typeof fetchCityStats>>;
  page: number;
}) {
  const user = await getAuthUser();
  const favoriteIds = user ? await fetchFavoriteIds(user.id) : [];

  const result = await fetchPublicProperties({
    cityVariants: [location.name, location.name.toLowerCase()],
    locality: area,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(Math.ceil(result.count / PAGE_SIZE), 1);

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumb
        items={[
          { name: location.name, href: locationPath(location.slug) },
          { name: area, href: areaPath(location.slug, slugifySegment(area)) },
        ]}
      />
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{areaPageTitle(area, location)}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">{areaPageDescription(area, location, stats)}</p>

      <div className="mt-8">
        {result.properties.length === 0 ? (
          <EmptyState
            icon={<Home className="h-7 w-7" />}
            title={`No listings in ${area} yet.`}
            description="Owners add new listings regularly. Try the full location page below."
            action={
              <Link href={locationPath(location.slug)} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                Browse all of {location.name} →
              </Link>
            }
          />
        ) : (
          <PropertyGrid properties={result.properties} savedIds={favoriteIds} isLoggedIn={Boolean(user)} />
        )}

        <Pagination page={page} totalPages={totalPages} />
      </div>

      <div className="mt-12">
        <LocationFaq location={location} areas={[area, ...(location.areas ?? [])]} />
      </div>

    </Container>
  );
}

function slugifySegment(area: string): string {
  return area
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}