import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PropertyDetailView } from "@/components/property/PropertyDetailView";
import { getCategoryBySlug } from "@/lib/locations/catalog";
import { getLocationSlugForCity, resolvePropertyPath } from "@/lib/locations";
import { buildListingMetadata } from "@/lib/locations/seo";
import { fetchPublicProperty } from "@/lib/queries";
import { propertyPathFromParts } from "@/lib/urls";
import type { AppPageProps } from "@/types";

/**
 * Canonical property detail route: /{city}/{category}/{slug}/
 *
 * e.g. /kaithal/flats/2-bhk-flat-civil-lines-a1b2c3d4/
 *
 * This is the only indexable property URL. /property/[id], /properties/[id] and
 * /properties/[id]/[slug] are 308 redirect stubs pointing here, and a listing
 * whose city/category changed self-heals to the correct path.
 */
export const dynamic = "force-dynamic";

type Params = { location: string; segment: string; slug: string };

/** Load the listing, or 404. Returns the path this listing should live at. */
async function resolve(params: Promise<Params>) {
  const { location, segment, slug } = await params;

  // The 2nd segment must be a real category. An area or child location here
  // means this is not a property URL.
  if (!getCategoryBySlug(segment)) notFound();

  const property = await fetchPublicProperty(slug);
  if (!property) notFound();

  const [canonicalPath, citySlug] = await Promise.all([
    resolvePropertyPath(property),
    getLocationSlugForCity(property.city),
  ]);

  // Self-heal: the owner changed the city or property type after this URL was
  // published, so the incoming path is stale -> permanent redirect to the real one.
  const incoming = propertyPathFromParts(location, segment, property.slug || property.id);
  if (incoming !== canonicalPath) permanentRedirect(canonicalPath);

  return { property, canonicalPath, citySlug };
}

export async function generateMetadata(props: AppPageProps<Params>): Promise<Metadata> {
  const { segment, slug } = await props.params;
  if (!getCategoryBySlug(segment)) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const property = await fetchPublicProperty(slug);
  if (!property) {
    return { title: "Property not found", robots: { index: false, follow: false } };
  }
  return buildListingMetadata(property, await resolvePropertyPath(property));
}

export default async function PropertyPage(props: AppPageProps<Params>) {
  const { property, canonicalPath, citySlug } = await resolve(props.params);
  return (
    <PropertyDetailView
      property={property}
      canonicalPath={canonicalPath}
      citySlug={citySlug}
    />
  );
}
