import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryBySlug, propertyCategorySlug } from "@/lib/locations/catalog";
import {
  areaCityPath,
  categoryCityPath,
  cityPath,
  propertyPathFromParts,
  type PropertyUrlSource,
} from "@/lib/urls";
import { slugify } from "@/lib/utils";
import type { LocationRow } from "@/types";

/**
 * Location URL helpers.
 *
 * Thin aliases over @/lib/urls so there is exactly one place that knows the
 * trailing-slash + slug rules. Server-only (imports the Supabase client) — use
 * @/lib/urls directly from client components.
 */
export function locationPath(slug: string): string {
  return cityPath(slug);
}

export function categoryPath(locationSlug: string, categorySlug: string): string {
  return categoryCityPath(locationSlug, categorySlug);
}

export function areaPath(locationSlug: string, areaSlug: string): string {
  return areaCityPath(locationSlug, areaSlug);
}

/**
 * Minimal built-in registry used only when Supabase is not configured so the
 * location pages, sitemap and footer still work during local development and
 * builds. When the database is available, the `locations` table is the
 * source of truth (admin-managed).
 */
const FALLBACK_LOCATIONS: LocationRow[] = [
  { id: "fb-kaithal", name: "Kaithal", slug: "kaithal", state: "Haryana", country: "India", type: "city", parent_slug: null, nearby: ["pundri", "kurukshetra", "karnal", "panipat"], areas: ["City Centre", "Pehowa Road", "Kurukshetra Road", "Guhla Road", "Division Chowk"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-pundri", name: "Pundri", slug: "pundri", state: "Haryana", country: "India", type: "town", parent_slug: null, nearby: ["kaithal", "kurukshetra", "karnal"], areas: ["Main Bazaar", "Rajound Road", "Bus Stand Road", "Kaithal Road"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-narwana", name: "Narwana", slug: "narwana", state: "Haryana", country: "India", type: "city", parent_slug: null, nearby: ["kaithal", "pundri", "karnal"], areas: ["Business District", "Main Market", "Residential Area"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-kurukshetra", name: "Kurukshetra", slug: "kurukshetra", state: "Haryana", country: "India", type: "city", parent_slug: null, nearby: ["kaithal", "karnal", "ambala", "pundri"], areas: ["Railway Road", "Pipli Chowk", "Pehowa Chowk", "Ladwa Road", "Sarai Road"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-karnal", name: "Karnal", slug: "karnal", state: "Haryana", country: "India", type: "city", parent_slug: null, nearby: ["kaithal", "panipat", "kurukshetra"], areas: ["GT Road", "Ramlila Ground", "Mehra Road", "Railway Road", "Kunjpura Road"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-panipat", name: "Panipat", slug: "panipat", state: "Haryana", country: "India", type: "city", parent_slug: null, nearby: ["karnal", "ambala", "delhi"], areas: ["GT Road", "Krishna Colony", "Model Town", "Motilal Nehru Park", "Madina Chowk"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-ambala", name: "Ambala", slug: "ambala", state: "Haryana", country: "India", type: "city", parent_slug: null, nearby: ["kurukshetra", "chandigarh", "panipat"], areas: ["Ambala Cantt", "Civil Lines", "Mahesh Nagar", "Prem Nagar", "Barara"], is_active: true, created_at: new Date().toISOString() },
  { id: "fb-chandigarh", name: "Chandigarh", slug: "chandigarh", state: "Chandigarh", country: "India", type: "city", parent_slug: null, nearby: ["ambala", "panchkula", "mohali"], areas: ["Sector 17", "Sector 22", "Sector 35", "Industrial Area Phase 1", "Manimajra"], is_active: true, created_at: new Date().toISOString() },
];

/** All active locations from the database (deduped per request). */
export const fetchActiveLocations = cache(async (): Promise<LocationRow[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return FALLBACK_LOCATIONS;

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !data || data.length === 0) return FALLBACK_LOCATIONS;
  return data;
});

/** Resolve a location by slug (case-insensitive). */
export async function getLocationBySlug(slug: string): Promise<LocationRow | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  const all = await fetchActiveLocations();
  const found = all.find((l) => l.slug.toLowerCase() === key);
  return found ?? null;
}

/** Child locations whose parent is this location slug. */
export async function getChildLocations(parentSlug: string): Promise<LocationRow[]> {
  const all = await fetchActiveLocations();
  return all.filter((l) => l.parent_slug?.toLowerCase() === parentSlug.toLowerCase());
}

/** Resolve nearby slugs to full location objects (ordered as listed). */
export async function getNearbyLocations(location: LocationRow): Promise<LocationRow[]> {
  const all = await fetchActiveLocations();
  const bySlug = new Map(all.map((l) => [l.slug.toLowerCase(), l]));
  return (location.nearby ?? [])
    .map((s) => bySlug.get(s.toLowerCase()))
    .filter((l): l is LocationRow => Boolean(l));
}

/** All localities (city, locality) grouped for the current city. */
export async function getLocalitiesForCity(city: string): Promise<{ id: string; city: string; locality: string }[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("localities")
    .select("id, city, locality")
    .order("locality");
  if (error || !data) return [];
  return data.filter(
    (l) => l.city.trim().toLowerCase() === city.trim().toLowerCase()
  );
}

/** Resolve an area slug (locality or location.area) back to its display name. */
export async function resolveAreaBySlug(location: LocationRow, slug: string): Promise<string | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;

  const fromAreas = (location.areas ?? []).find(
    (a) => slugify(a) === key || a.toLowerCase() === key
  );
  if (fromAreas) return fromAreas;

  const localities = await getLocalitiesForCity(location.name);
  const match = localities.find((l) => slugify(l.locality).toLowerCase() === key);
  return match?.locality ?? null;
}

/** Short helper: is this segment a known location category? */
export function isCategorySegment(slug: string): boolean {
  return Boolean(getCategoryBySlug(slug.toLowerCase()));
}

/**
 * URL slug for a city name, resolved from the locations table.
 *
 * `properties.city` is free text while `locations.slug` is admin-managed, so the
 * two can drift (name "Kaithal" with slug "kaithal-haryana"). Property URLs are
 * built from the city *name*, so they must resolve back to the *location slug*
 * or the URL would 404 and the self-heal redirect would loop.
 */
export const getLocationSlugForCity = cache(async (city: string): Promise<string> => {
  const key = city.trim().toLowerCase();
  if (!key) return "haryana";
  const all = await fetchActiveLocations();
  const match =
    all.find((l) => l.name.trim().toLowerCase() === key) ??
    all.find((l) => l.slug.toLowerCase() === key) ??
    all.find((l) => key.includes(l.name.trim().toLowerCase()));
  return match?.slug ?? slugify(city);
});

/**
 * Canonical site path for a property: /{city}/{category}/{slug}/
 *
 * Server-side because resolving the city segment needs the locations table.
 * Every redirect stub and the detail page route through this so they can never
 * disagree about where a listing lives.
 */
export async function resolvePropertyPath(property: PropertyUrlSource): Promise<string> {
  const [citySlug, category] = await Promise.all([
    getLocationSlugForCity(property.city),
    Promise.resolve(propertyCategorySlug(property.property_type, property.purpose)),
  ]);
  return propertyPathFromParts(citySlug, category, property.slug || property.id);
}

export { slugify };
export type { LocationRow };