/* eslint-disable @typescript-eslint/no-explicit-any */
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EMPTY_STATS, type LocationStats } from "@/lib/locations/seo";
import type { PropertyWithImages, PropertyListItem, PropertyPurpose, PropertyType, RequirementRow } from "@/types";

export type DashboardRequirement = RequirementRow & { user_name?: string; user_phone?: string };

export interface PublicPropertiesQuery {
  city?: string;
  /** Case-insensitive city match — a list of name variants to `.in()` against. */
  cityVariants?: string[];
  locality?: string;
  purpose?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  bhk?: string;
  furnishing?: string;
  availableImmediately?: boolean;
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}

export interface PublicPropertiesResult {
  properties: PropertyListItem[];
  count: number;
}

const LIST_SELECT = `
  id, slug, title, purpose, property_type, price, rent_period, city, locality,
  bhk, furnishing, status, is_verified, is_featured, created_at,
  available_from, amenities, latitude, longitude, images:property_images(image_url, display_order)
`;

function toListItem(row: any): PropertyListItem {
  const firstImage = (row.images ?? [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)[0];
  return {
    ...row,
    image_url: firstImage?.image_url ?? null,
  } as unknown as PropertyListItem;
}

/**
 * Fetch approved public properties with filters + pagination.
 * Returns empty list + count 0 when Supabase is not configured.
 */
export async function fetchPublicProperties(
  query: PublicPropertiesQuery = {}
): Promise<PublicPropertiesResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { properties: [], count: 0 };

  const pageSize = Math.min(Math.max(query.pageSize ?? 12, 1), 48);
  const page = Math.max(query.page ?? 1, 1);

  const builder: any = supabase
    .from("properties")
    .select(LIST_SELECT, { count: "exact" })
    .eq("status", "approved");

  if (query.cityVariants?.length) builder.in("city", query.cityVariants);
  else if (query.city) builder.eq("city", query.city);
  if (query.locality) builder.eq("locality", query.locality);
  if (query.purpose) builder.eq("purpose", query.purpose);
  if (query.type) builder.eq("property_type", query.type);
  if (query.furnishing) builder.eq("furnishing", query.furnishing);

  if (query.bhk) {
    if (query.bhk === "5+") {
      builder.gte("bhk", 5);
    } else {
      builder.eq("bhk", Number(query.bhk));
    }
  }

  if (query.minPrice !== undefined && query.minPrice > 0) {
    builder.gte("price", query.minPrice);
  }
  if (query.maxPrice !== undefined && query.maxPrice > 0) {
    builder.lte("price", query.maxPrice);
  }

  if (query.availableImmediately) {
    builder.or(`available_from.is.null,available_from.lte.${todayIso()}`);
  }

  if (query.verifiedOnly) builder.eq("is_verified", true);
  if (query.featuredOnly) builder.eq("is_featured", true);

  const sort = query.sort ?? "newest";
  if (sort === "price_asc") builder.order("price", { ascending: true });
  else if (sort === "price_desc") builder.order("price", { ascending: false });
  else builder.order("created_at", { ascending: false });

  builder.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await builder;
  if (error) return { properties: [], count: 0 };

  return {
    properties: (data ?? []).map(toListItem) as PropertyListItem[],
    count: count ?? 0,
  };
}

export interface PublicSitemapProperty {
  id: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
  city: string;
  purpose: PropertyPurpose;
  property_type: PropertyType;
}

export async function fetchPublicPropertySitemap(): Promise<PublicSitemapProperty[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, created_at, updated_at, is_featured, city, purpose, property_type")
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .range(0, 4999);
  if (error || !data) return [];
  return data as PublicSitemapProperty[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Common case variants of a city name used for case-insensitive `.in()` matching. */
export function cityNameVariants(city: string): string[] {
  const trimmed = city.trim();
  const variants = new Set<string>([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase()]);
  variants.add(
    trimmed
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
  variants.add(
    trimmed
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
  return Array.from(variants);
}

/** Aggregate stats for a location's approved listings (single DB query). */
export const fetchCityStats = cache(async (city: string): Promise<LocationStats> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return EMPTY_STATS;

  const { data, error } = await supabase
    .from("properties")
    .select("id, purpose, property_type, price, created_at")
    .eq("status", "approved")
    .in("city", cityNameVariants(city));

  if (error || !data) return EMPTY_STATS;

  let total = 0;
  let rent = 0;
  let sale = 0;
  let minRent: number | null = null;
  let maxRent: number | null = null;
  let minSale: number | null = null;
  let maxSale: number | null = null;
  let lastUpdated: string | null = null;
  const byType: Record<string, number> = {};

  for (const row of data) {
    total += 1;
    const purpose = row.purpose as PropertyListItem["purpose"];
    if (purpose === "rent") rent += 1;
    else sale += 1;

    const key = String(row.property_type ?? "other");
    byType[key] = (byType[key] ?? 0) + 1;

    const price = Number(row.price);
    if (Number.isFinite(price)) {
      if (purpose === "rent") {
        if (minRent === null || price < minRent) minRent = price;
        if (maxRent === null || price > maxRent) maxRent = price;
      } else {
        if (minSale === null || price < minSale) minSale = price;
        if (maxSale === null || price > maxSale) maxSale = price;
      }
    }

    if (!lastUpdated || row.created_at > lastUpdated) lastUpdated = row.created_at;
  }

  return { total, rent, sale, byType, minRent, maxRent, minSale, maxSale, lastUpdated };
});

export const fetchCategoryStats = cache(async (city: string, purpose: PropertyPurpose, type: string): Promise<LocationStats> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return EMPTY_STATS;

  let builder: any = supabase
    .from("properties")
    .select("id, purpose, property_type, price, created_at")
    .eq("status", "approved")
    .in("city", cityNameVariants(city))
    .eq("purpose", purpose);
  if (type) builder = builder.eq("property_type", type);

  const { data, error } = await builder;
  if (error || !data) return EMPTY_STATS;

  let total = 0;
  let rent = 0;
  let sale = 0;
  let minRent: number | null = null;
  let maxRent: number | null = null;
  let minSale: number | null = null;
  let maxSale: number | null = null;
  let lastUpdated: string | null = null;
  const byType: Record<string, number> = {};

  for (const row of data) {
    total += 1;
    const rowPurpose = row.purpose as PropertyListItem["purpose"];
    if (rowPurpose === "rent") rent += 1;
    else sale += 1;
    const key = String(row.property_type ?? "other");
    byType[key] = (byType[key] ?? 0) + 1;
    const price = Number(row.price);
    if (Number.isFinite(price)) {
      if (rowPurpose === "rent") {
        if (minRent === null || price < minRent) minRent = price;
        if (maxRent === null || price > maxRent) maxRent = price;
      } else {
        if (minSale === null || price < minSale) minSale = price;
        if (maxSale === null || price > maxSale) maxSale = price;
      }
    }
    if (!lastUpdated || row.created_at > lastUpdated) lastUpdated = row.created_at;
  }

  return { total, rent, sale, byType, minRent, maxRent, minSale, maxSale, lastUpdated };
});

/**
 * Fetch one approved property by id or slug with its images.
 *
 * Wrapped in React `cache()` because both generateMetadata and the page body
 * need it — without this every request fetches the same row twice.
 */
export const fetchPublicProperty = cache(
  async (key: string): Promise<PropertyWithImages | null> => {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

    let builder: any = supabase
      .from("properties")
      .select("*, images:property_images(image_url, display_order)")
      .eq("status", "approved")
      .limit(1);

    builder = isId ? builder.eq("id", key) : builder.eq("slug", key);

    const { data, error } = await builder;
    if (error || !data || data.length === 0) return null;

    const row = data[0];
    return {
      ...row,
      images: (row.images ?? [])
        .slice()
        .sort((a: any, b: any) => a.display_order - b.display_order),
    } as PropertyWithImages;
  }
);

/**
 * Canonical site path for a property row: /{city}/{category}/{slug}/
 *
 * Re-exported from @/lib/locations so there is exactly one implementation and
 * so callers can import it from either module.
 */
export { resolvePropertyPath as propertyCanonicalPath } from "@/lib/locations";


/** Owner/admin view of a single property (any status). */
export async function fetchPropertyForOwner(id: string, userId: string): Promise<PropertyWithImages | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("properties")
    .select("*, images:property_images(image_url, display_order)")
    .eq("id", id)
    .limit(1)
    .returns<any[]>();

  if (error || !data || data.length === 0) return null;
  const row = data[0];
  if (row.owner_id !== userId && !(await isAdminUser(supabase, userId))) return null;

  return {
    ...row,
    images: (row.images ?? [])
      .slice()
      .sort((a: any, b: any) => a.display_order - b.display_order),
  } as PropertyWithImages;
}

export async function fetchPublicOwner(ownerId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("public_owners")
    .select("*")
    .eq("id", ownerId)
    .maybeSingle();
  return data ?? null;
}

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("favorites").select("property_id").eq("user_id", userId);
  return (data ?? []).map((f) => f.property_id);
}

export async function fetchLocalities(): Promise<{ id: string; city: string; locality: string }[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("localities").select("*").order("city").order("locality");
  if (error) return [];
  return data ?? [];
}

export async function fetchCities(): Promise<string[]> {
  const localities = await fetchLocalities();
  return Array.from(new Set(localities.map((l) => l.city)));
}

async function isAdminUser(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

/** All of the user's own properties (any status), newest first. */
export async function fetchUserProperties(userId: string): Promise<PropertyWithImages[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("properties")
    .select("*, images:property_images(image_url, display_order)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    ...row,
    images: (row.images ?? []).slice().sort((a: any, b: any) => a.display_order - b.display_order),
  })) as PropertyWithImages[];
}

/** Full card data of the user's saved properties. */
export async function fetchFavoriteProperties(userId: string): Promise<PropertyListItem[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select("property:properties(*, images:property_images(image_url, display_order))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? [])
    .filter((row: any) => row.property && row.property.status === "approved")
    .map((row: any) => toListItem(row.property)) as PropertyListItem[];
}

export async function fetchUserRequirements(userId: string): Promise<DashboardRequirement[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("requirements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as RequirementRow[];
}

/** Public requirements board — any row is fine for an MVP, ordered by newest. */
export async function fetchRequirements(): Promise<DashboardRequirement[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("requirements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as unknown as DashboardRequirement[];
}