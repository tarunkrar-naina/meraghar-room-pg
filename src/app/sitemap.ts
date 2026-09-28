import type { MetadataRoute } from "next";
import { fetchActiveLocations, resolvePropertyPath } from "@/lib/locations";
import { cityNameVariants, fetchPublicPropertySitemap } from "@/lib/queries";
import { LOCATION_CATEGORIES } from "@/lib/locations/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCanonicalUrl } from "@/lib/seo";
import { SEO_CITIES } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  function addUrl(path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly", lastModified = now) {
    const url = buildCanonicalUrl(path);
    if (seen.has(url)) return;
    seen.add(url);
    urls.push({ url, lastModified, changeFrequency, priority });
  }

  addUrl("/", 1, "daily");
  addUrl("/properties/", 0.9, "daily");
  addUrl("/about/", 0.5, "monthly");
  addUrl("/contact/", 0.6, "monthly");
  addUrl("/how-it-works/", 0.5, "monthly");
  addUrl("/help/", 0.5, "monthly");
  addUrl("/requirements/", 0.6, "daily");

  // Only the canonical keyword path is indexable: /{city}/{category}/{slug}/.
  // /properties/{id}/ is a 308 redirect stub, so advertising it here would point
  // Google at a redirect instead of the real listing page.
  // resolvePropertyPath (not urls.propertyPath) because the city segment has to
  // be resolved through the locations table, exactly like the detail page does.
  const properties = await fetchPublicPropertySitemap();
  for (const property of properties) {
    const lastModified = new Date(property.updated_at || property.created_at);
    addUrl(
      await resolvePropertyPath(property),
      property.is_featured ? 0.8 : 0.7,
      "weekly",
      Number.isNaN(lastModified.getTime()) ? now : lastModified,
    );
  }

  const locations = await fetchActiveLocations();
  const locationBySlug = new Map(locations.map((location) => [location.slug.toLowerCase(), location]));
  const targetSlugs = new Set([...SEO_CITIES.map((city) => city.slug), ...locations.map((location) => location.slug.toLowerCase())]);

  const areaWithListings = new Set<string>();
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    for (const location of locations) {
      const { data } = await supabase
        .from("properties")
        .select("locality")
        .eq("status", "approved")
        .in("city", cityNameVariants(location.name))
        .limit(100);
      const areaSlugs = Array.from(new Set((data ?? []).map((row) => slugifySegment(String(row.locality ?? ""))).filter(Boolean)));
      for (const areaSlug of areaSlugs) areaWithListings.add(`${location.slug.toLowerCase()}/${areaSlug}`);
    }
  }

  for (const slug of targetSlugs) {
    const location = locationBySlug.get(slug);
    const lastModified = location?.created_at ? new Date(location.created_at) : now;
    addUrl(`/${slug}/`, 0.8, "weekly", Number.isNaN(lastModified.getTime()) ? now : lastModified);

    for (const category of LOCATION_CATEGORIES) {
      addUrl(`/${slug}/${category.slug}/`, 0.6, "weekly", lastModified);
    }

    for (const area of location?.areas ?? []) {
      const areaSlug = slugifySegment(area);
      if (areaSlug && areaWithListings.has(`${slug}/${areaSlug}`)) addUrl(`/${slug}/${areaSlug}/`, 0.5, "weekly", lastModified);
    }
  }

  return urls;
}
