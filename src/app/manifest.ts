import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/constants";

/** PWA manifest — also surfaced by search engines as a site identity signal. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} - Rooms, PG, Flats & Properties in Haryana`,
    short_name: APP_NAME,
    description:
      "Find rooms, PG, flats, houses and shops for rent or sale in Kaithal, Kurukshetra, Pundri and Narwana, Haryana.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0d9488",
    lang: "en-IN",
    categories: ["business", "lifestyle", "shopping"],
    icons: [
      {
        src: "/brand/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
