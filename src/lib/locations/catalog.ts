import type { PropertyPurpose, PropertyType } from "@/types";

/**
 * SEO category registry for location pages.
 *
 * Each category maps to real property filters (purpose / property type) so the
 * category pages show only genuinely matching listings. The slugs here are the
 * second path segment on location pages, e.g. /kaithal/rooms-for-rent.
 */
export interface LocationCategory {
  slug: string;
  legacySlugs?: string[];
  label: string;
  purpose?: PropertyPurpose;
  type?: PropertyType;
}

export const LOCATION_CATEGORIES: LocationCategory[] = [
  // Generic buckets. These are also the fallback for property types that have no
  // dedicated category for a given purpose (e.g. a room listed "for sale").
  { slug: "properties-for-rent", label: "Properties for Rent", purpose: "rent" },
  { slug: "properties-for-sale", label: "Properties for Sale", purpose: "sale" },
  { slug: "pg", label: "PG", legacySlugs: ["paying-guest"], type: "pg" },
  { slug: "rooms", label: "Rooms for Rent", legacySlugs: ["rooms-for-rent"], purpose: "rent", type: "room" },
  { slug: "flats", label: "Flats for Rent", legacySlugs: ["flats-for-rent"], purpose: "rent", type: "flat" },
  { slug: "flats-for-sale", label: "Flats for Sale", purpose: "sale", type: "flat" },
  { slug: "houses", label: "Houses for Rent", legacySlugs: ["houses-for-rent"], purpose: "rent", type: "house" },
  { slug: "houses-for-sale", label: "Houses for Sale", purpose: "sale", type: "house" },
  { slug: "shops", label: "Shops for Rent", legacySlugs: ["shops-for-rent"], purpose: "rent", type: "shop" },
  { slug: "shops-for-sale", label: "Shops for Sale", purpose: "sale", type: "shop" },
  { slug: "offices-for-rent", label: "Office Spaces for Rent", purpose: "rent", type: "office" },
  { slug: "offices-for-sale", label: "Office Spaces for Sale", purpose: "sale", type: "office" },
  { slug: "plots-for-sale", label: "Plots for Sale", purpose: "sale", type: "plot" },
  // BHK landing pages. These exist because the BHK property types below have no
  // category in the list above, and because they are the money keywords
  // ("1 BHK flat rent Kaithal", "3 BHK house sale in Kurukshetra").
  { slug: "1-bhk-for-rent", label: "1 BHK for Rent", purpose: "rent", type: "1 bhk" },
  { slug: "1-bhk-for-sale", label: "1 BHK for Sale", purpose: "sale", type: "1 bhk" },
  { slug: "2-bhk-for-rent", label: "2 BHK for Rent", purpose: "rent", type: "2 bhk" },
  { slug: "2-bhk-for-sale", label: "2 BHK for Sale", purpose: "sale", type: "2 bhk" },
  { slug: "3-bhk-for-rent", label: "3 BHK for Rent", purpose: "rent", type: "3 bhk" },
  { slug: "3-bhk-for-sale", label: "3 BHK for Sale", purpose: "sale", type: "3 bhk" },
];

/** Fallback slug used when a property type has no category at all. */
const DEFAULT_CATEGORY_SLUG = "properties-for-rent";

/**
 * Resolve the URL category segment for a single property row.
 *
 * This is the one place that decides "which /city/<category>/ page does this
 * listing belong on", so property URLs and category pages can never disagree.
 *
 * Resolution order:
 *   1. a category matching BOTH the property type and purpose
 *   2. the generic bucket for the purpose (type exists, but not for this purpose)
 *   3. any category for the type
 *   4. the generic rent bucket
 *
 * Accepts raw strings because the DB columns are `text` and admin/dashboard rows
 * are not narrowed to the union types. Unrecognised values safely degrade to a
 * generic bucket instead of producing a broken URL.
 */
export function propertyCategorySlug(
  type: PropertyType | string,
  purpose: PropertyPurpose | string
): string {
  const exact = LOCATION_CATEGORIES.find((c) => c.type === type && c.purpose === purpose);
  if (exact) return exact.slug;

  // No category for this (type, purpose) pair — e.g. a "room" listed for sale.
  // Fall back to the purpose-only bucket rather than a mismatched category page.
  const generic = LOCATION_CATEGORIES.find((c) => !c.type && c.purpose === purpose);
  if (generic) return generic.slug;

  const byType = LOCATION_CATEGORIES.find((c) => c.type === type);
  return byType?.slug ?? DEFAULT_CATEGORY_SLUG;
}

export function getCategoryBySlug(slug: string): LocationCategory | undefined {
  const normalized = slug.trim().toLowerCase();
  return LOCATION_CATEGORIES.find((category) => category.slug === normalized || category.legacySlugs?.includes(normalized));
}