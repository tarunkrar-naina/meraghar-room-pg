import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { getChildLocations, getLocationBySlug, getNearbyLocations, getLocalitiesForCity, locationPath, resolvePropertyPath } from "@/lib/locations";
import { buildLocationMetadata, locationPageTitle } from "@/lib/locations/seo";
import { fetchCityStats, fetchPublicProperties } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth";
import { fetchFavoriteIds } from "@/lib/queries";
import { Breadcrumb } from "@/components/Navigation/Breadcrumb";
import { CitySelector } from "@/components/CitySelector";
import { LocationLandingContent } from "@/components/locations/LocationLandingContent";
import { JsonLd } from "@/components/JsonLd";
import { generateSchemaMarkup } from "@/lib/seo";
import type { AppPageProps } from "@/types";

export const dynamic = "force-dynamic";

const LISTING_LIMIT = 9;

export async function generateMetadata(props: AppPageProps): Promise<Metadata> {
  const { location: slug } = await props.params;
  const location = await getLocationBySlug(slug);
  if (!location) return {};
  const stats = await fetchCityStats(location.name);
  return buildLocationMetadata(location, stats);
}

export default async function LocationLandingPage(props: AppPageProps) {
  const { location: slug } = await props.params;
  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const [stats, nearby, childLocations, localities, user] = await Promise.all([
    fetchCityStats(location.name),
    getNearbyLocations(location),
    getChildLocations(location.slug),
    getLocalitiesForCity(location.name),
    getAuthUser(),
  ]);
  const favoriteIds = user ? await fetchFavoriteIds(user.id) : [];

  const result = await fetchPublicProperties({
    cityVariants: [location.name, location.name.toLowerCase()],
    page: 1,
    pageSize: LISTING_LIMIT,
    sort: "newest",
  });

  const areas = Array.from(
    new Set([...(location.areas ?? []), ...localities.map((l) => l.locality)])
  );

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumb items={[{ name: location.name, href: locationPath(location.slug) }]} />
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {locationPageTitle(location)}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Search rooms, PGs, flats, houses and shops for rent and sale in {location.name}.
        {stats.total > 0
          ? ` ${stats.total} verified listing${stats.total === 1 ? "" : "s"} available right now.`
          : " New listings are added by owners every day."}
      </p>

      <div className="mt-8">
        <LocationLandingContent
          location={location}
          stats={stats}
          listings={result.properties}
          total={result.count}
          favoriteIds={favoriteIds}
          isLoggedIn={Boolean(user)}
          nearby={nearby}
          childLocations={childLocations}
          areas={areas}
        />
      </div>

      <CitySelector className="mt-12 border-t border-slate-200 pt-10" heading={`More cities near ${location.name}`} />
      <JsonLd
        data={generateSchemaMarkup("ItemList", {
          // Must be the canonical /{city}/{category}/{slug}/ path. Advertising
          // /properties/{id} here would point crawlers at a 308 redirect stub.
          items: await Promise.all(
            result.properties.map(async (property) => ({
              name: property.title,
              url: await resolvePropertyPath(property),
            }))
          ),
        })}
      />
      <JsonLd
        data={generateSchemaMarkup("LocalBusiness", {
          name: `MeraGhar - Properties in ${location.name}`,
          cities: [location.name],
        })}
      />
    </Container>
  );
}