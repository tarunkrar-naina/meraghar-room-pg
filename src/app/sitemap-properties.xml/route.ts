import sitemap from "@/app/sitemap";
import { sitemapResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await sitemap();
  // Canonical listings are /{city}/{category}/{slug}/ — exactly three slug
  // segments. The old /properties/{id}/ form is a redirect stub and is excluded.
  return sitemapResponse(entries.filter((entry) => /^\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/$/i.test(new URL(entry.url).pathname)));
}
