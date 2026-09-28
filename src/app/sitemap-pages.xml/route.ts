import sitemap from "@/app/sitemap";
import { sitemapResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await sitemap();
  return sitemapResponse(entries.filter((entry) => {
    const path = new URL(entry.url).pathname;
    return path === "/" || path === "/about/" || path === "/contact/" || path === "/how-it-works/" || path === "/help/" || path === "/properties/" || path === "/requirements/";
  }));
}
