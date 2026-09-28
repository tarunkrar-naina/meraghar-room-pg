import type { MetadataRoute } from "next";
import { getSeoBaseUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = getSeoBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/favorites",
          "/login",
          "/signup",
          "/add-property",
          "/edit-property",
          "/post-requirement",
          "/settings",
          "/_next/",
        ],
      },
    ],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/sitemap-pages.xml`,
      `${base}/sitemap-properties.xml`,
      `${base}/sitemap-kaithal.xml`,
      `${base}/sitemap-kurukshetra.xml`,
      `${base}/sitemap-pundri.xml`,
      `${base}/sitemap-narwana.xml`,
    ],
  };
}
