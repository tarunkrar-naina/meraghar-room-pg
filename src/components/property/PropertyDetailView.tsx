import Link from "next/link";
import { PropertyDetails } from "@/components/PropertyDetails";
import { RelatedProperties } from "@/components/RelatedProperties";
import { TrackViews } from "@/components/TrackViews";
import { JsonLd } from "@/components/JsonLd";
import { Container } from "@/components/ui";
import { Breadcrumb } from "@/components/Navigation/Breadcrumb";
import { getAuthUser } from "@/lib/auth";
import { fetchFavoriteIds, fetchPublicOwner, fetchPublicProperties } from "@/lib/queries";
import { realEstateListingJsonLd } from "@/lib/locations/structured-data";
import { getSeoBaseUrl } from "@/lib/seo";
import { categoryCityPath, cityPath } from "@/lib/urls";
import { getCategoryBySlug, propertyCategorySlug } from "@/lib/locations/catalog";
import { APP_NAME } from "@/lib/constants";
import type { PropertyWithImages } from "@/types";

/**
 * Renders a single property detail page.
 *
 * Lives outside the route tree so every property URL shape (currently only
 * /{city}/{category}/{slug}/) renders from exactly one implementation.
 */
export async function PropertyDetailView({
  property,
  canonicalPath,
  citySlug,
}: {
  property: PropertyWithImages;
  /** Root-relative path this page is canonicalised to. */
  canonicalPath: string;
  /** Locations-table slug for the property's city (may differ from the city name). */
  citySlug: string;
}) {
  const user = await getAuthUser();
  const isLoggedIn = Boolean(user);
  const userIsOwner = user?.id === property.owner_id;
  const saved = user ? (await fetchFavoriteIds(user.id)).includes(property.id) : false;
  const owner = await fetchPublicOwner(property.owner_id);

  // Related listings: same city, excluding the current property.
  const related = await fetchPublicProperties({ city: property.city, pageSize: 4 });
  const notSelf = related.properties.filter((p) => p.id !== property.id).slice(0, 3);

  const cityUrl = cityPath(citySlug);
  const categorySlug = propertyCategorySlug(property.property_type, property.purpose);
  const categoryUrl = categoryCityPath(citySlug, categorySlug);
  const categoryLabel = getCategoryBySlug(categorySlug)?.label ?? "Properties";

  return (
    <>
      <TrackViews id={property.id} />
      {/* RealEstateListing: price, address, geo, floor size, amenities, dates. */}
      <JsonLd data={realEstateListingJsonLd(property, getSeoBaseUrl(), canonicalPath)} />
      <Container className="py-6 sm:py-8">
        <Breadcrumb
          items={[
            { name: property.city, href: cityUrl },
            { name: categoryLabel, href: categoryUrl },
            { name: property.title, href: canonicalPath },
          ]}
        />

        <PropertyDetails
          property={property}
          owner={owner}
          isLoggedIn={isLoggedIn}
          saved={saved}
          userIsOwner={userIsOwner}
        />

        <RelatedProperties properties={notSelf} city={property.city} isLoggedIn={isLoggedIn} />

        {/* Internal links: pull crawl equity back up to the hub pages. */}
        <nav aria-label="Related searches" className="mt-10 border-t border-slate-200 pt-6 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            More listings
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link className="text-slate-700 underline underline-offset-4 hover:text-teal-700" href={cityUrl}>
                Properties in {property.city}
              </Link>
            </li>
            <li>
              <Link className="text-slate-700 underline underline-offset-4 hover:text-teal-700" href={categoryUrl}>
                {categoryLabel} in {property.city}
              </Link>
            </li>
            <li>
              <Link className="text-slate-700 underline underline-offset-4 hover:text-teal-700" href="/properties/">
                All properties on {APP_NAME}
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
    </>
  );
}
