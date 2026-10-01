import { revalidatePath } from "next/cache";

/**
 * After a raw table edit, drop the caches that render the affected public pages.
 * Maps a table name to the routes whose output can contain that data.
 */
const TABLE_PATHS: Record<string, string[]> = {
  properties: ["/", "/properties", "/dashboard", "/add-property"],
  property_images: ["/", "/properties"],
  profiles: ["/", "/dashboard"],
  localities: ["/", "/properties"],
  locations: ["/", "/properties", "/sitemap.xml"],
  requirements: ["/requirements", "/", "/post-requirement"],
  contact_requests: ["/admin/leads"],
  reports: ["/admin/reports"],
  favorites: ["/favorites"],
  site_settings: ["/", "/about", "/contact", "/help", "/how-it-works"],
};

export function dbRevalidate(table: string): void {
  const paths = TABLE_PATHS[table];
  if (!paths) return;
  for (const path of paths) revalidatePath(path);
}