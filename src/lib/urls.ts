import { propertyCategorySlug } from "@/lib/locations/catalog";
import { slugify } from "@/lib/utils";
import type { PropertyPurpose, PropertyType } from "@/types";

/**
 * Canonical URL builders — the single source of truth for every internal link,
 * <link rel="canonical">, Open Graph url, sitemap entry and revalidatePath call.
 *
 * Rules this module enforces:
 *  - every URL ends with a trailing slash (next.config.ts sets trailingSlash:true,
 *    so a slash-less canonical would cost an extra 308 hop on every page view)
 *  - query strings are never part of a canonical URL
 *  - property URLs are  /{city}/{category}/{slug}/  so the target keyword is
 *    visible in the URL instead of an opaque uuid
 *
 * This module must stay free of server-only imports (no supabase, no next/headers)
 * because client components (PropertyCard, Breadcrumb, SaveButton) build links too.
 */

/** Min fields needed to build a property URL. */
export interface PropertyUrlSource {
  id: string;
  /** SEO slug (title + short id). Falls back to the uuid when null. */
  slug?: string | null;
  city: string;
  /** Widened to string because the DB column is `text`. */
  property_type: PropertyType | string;
  purpose: PropertyPurpose | string;
}

/** City landing page, e.g. /kaithal/ */
export function cityPath(city: string): string {
  return `/${slugify(city)}/`;
}

/** Category landing page, e.g. /kaithal/flats/ */
export function categoryCityPath(city: string, categorySlug: string): string {
  return `${cityPath(city)}${slugify(categorySlug)}/`;
}

/** Area / locality landing page, e.g. /kaithal/civil-lines/ */
export function areaCityPath(city: string, area: string): string {
  return `${cityPath(city)}${slugify(area)}/`;
}

/** Browse/filter index, e.g. /properties/ */
export function browsePath(): string {
  return "/properties/";
}

/**
 * Build a property detail URL from its parts.
 * Use this when you already know the category (e.g. while rendering a category page).
 */
export function propertyPathFromParts(
  city: string,
  categorySlug: string,
  slug: string
): string {
  return `${categoryCityPath(city, categorySlug)}${slugify(slug)}/`;
}

/**
 * Canonical property detail URL: /{city}/{category}/{slug}/
 *
 * The category segment is derived from the property's own type + purpose, so a
 * listing can never produce a URL that disagrees with its category page.
 */
export function propertyPath(property: PropertyUrlSource): string {
  const category = propertyCategorySlug(property.property_type, property.purpose);
  return propertyPathFromParts(property.city, category, property.slug || property.id);
}
