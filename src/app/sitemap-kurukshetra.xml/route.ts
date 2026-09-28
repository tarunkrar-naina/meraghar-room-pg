import sitemap from "@/app/sitemap";
import { sitemapResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await sitemap();
  return sitemapResponse(entries.filter((entry) => new URL(entry.url).pathname.startsWith("/kurukshetra/")));
}
