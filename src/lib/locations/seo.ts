import type { Metadata } from "next";
import type { LocationCategory } from "@/lib/locations/catalog";
import { categoryPath, locationPath, areaPath } from "@/lib/locations";
import type { LocationRow, PropertyWithImages } from "@/types";
import { APP_NAME } from "@/lib/constants";
import { propertyTypeLabel } from "@/lib/utils";
import { buildCanonicalUrl, getSeoBaseUrl, truncateText } from "@/lib/seo";
import { SEO_SITE } from "@/lib/seo-config";

export function siteUrl(): string {
  return getSeoBaseUrl();
}

export function abs(path: string): string {
  return buildCanonicalUrl(path);
}

export interface LocationStats {
  total: number;
  rent: number;
  sale: number;
  byType: Record<string, number>;
  minRent: number | null;
  maxRent: number | null;
  minSale: number | null;
  maxSale: number | null;
  lastUpdated: string | null;
}

export const EMPTY_STATS: LocationStats = {
  total: 0,
  rent: 0,
  sale: 0,
  byType: {},
  minRent: null,
  maxRent: null,
  minSale: null,
  maxSale: null,
  lastUpdated: null,
};

function joinAreaNames(location: LocationRow): string {
  const areas = (location.areas ?? []).slice(0, 4);
  if (areas.length === 0) return `${location.name}, ${location.state}`;
  return `${areas.join(", ")}, ${location.name}`;
}

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

/** Title for the city/town landing page. Root layout appends " | MeraGhar". */
export function locationPageTitle(location: LocationRow): string {
  return `Properties in ${location.name}${location.state ? `, ${location.state}` : ""}`;
}

/** Title for a category page, e.g. "Rooms for Rent in Kaithal". */
export function categoryPageTitle(category: LocationCategory, location: LocationRow): string {
  if (category.slug === "pg") {
    return `PG in ${location.name} | Affordable PG & Paying Guest Rooms`;
  }
  return `${category.label} in ${location.name}`;
}

/** Title for an area page, e.g. "Properties in City Centre, Kaithal". */
export function areaPageTitle(area: string, location: LocationRow): string {
  return `Properties in ${area}, ${location.name}`;
}

function baseDescription(): string {
  return (
    `Rooms, PGs, flats, houses and shops for rent and sale in Haryana. ` +
    `Owners list properties free on ${APP_NAME}; search verified listings with photos, price and contact.`
  );
}

export function locationPageDescription(location: LocationRow, stats: LocationStats): string {
  if (stats.total > 0) {
    return (
      `Search ${stats.total} verified ${stats.total === 1 ? "property" : "properties"} for rent and sale in ${location.name}, ${location.state} on ${APP_NAME}. ` +
      `Popular areas: ${joinAreaNames(location)}.`
    );
  }
  return (
    `Looking for a room, PG, flat or house in ${location.name}, ${location.state}? ` +
    `${APP_NAME} lets local owners list properties free in ${joinAreaNames(location)}.`
  );
}

export function categoryPageDescription(
  category: LocationCategory,
  location: LocationRow,
  stats: LocationStats
): string {
  const label = category.label.toLowerCase();
  const city = location.name;
  if (stats.total > 0) {
    const price = category.purpose === "sale" ? stats.minSale : stats.minRent;
    const pricePart = price != null ? ` starting at ${inr(price)}` : "";
    return (
      `Find ${stats.total} ${label} in ${city}, ${location.state}${pricePart}. ` +
      `Browse photos, rent and owner details on ${APP_NAME} — popular areas: ${joinAreaNames(location)}.`
    );
  }
  return (
    `Browse ${label} in ${city}, ${location.state}. Owners list ${label} free on ${APP_NAME} — ` +
    `check back for new listings in ${joinAreaNames(location)}.`
  );
}

export function areaPageDescription(area: string, location: LocationRow, stats: LocationStats): string {
  if (stats.total > 0) {
    return `Find ${stats.total} verified properties for rent and sale in ${area}, ${location.name}, ${location.state} on ${APP_NAME}. Photos, prices and owner contact.`;
  }
  return `Looking for a property in ${area}, ${location.name}, ${location.state}? ${APP_NAME} lets local owners list rooms, flats and houses free.`;
}

/** Metadata for the homepage — absolute title to opt out of the " | MeraGhar" template. */
export function buildHomeMetadata(): Metadata {
  const canonical = abs("/");
  const title = `${APP_NAME} - Rooms, PG, Flats & Shops in Haryana`;
  const description =
    `Find rooms, PG, flats, houses and shops for rent or sale in Kaithal, ` +
    `Kurukshetra, Pundri and Narwana, Haryana. Verified listings with real photos — ` +
    `post your property free on MeraGhar.`;
  return {
    title: { absolute: title },
    description,
    keywords: [
      "property in Haryana",
      "room on rent Kaithal",
      "PG Kurukshetra",
      "flat rent Kaithal",
      "property for sale Narwana",
      "shop rent Kurukshetra",
      "paying guest Pundri",
      "house rent Kaithal",
      "property dealer Haryana",
      "affordable rooms Kaithal",
    ],
    alternates: { canonical },
    openGraph: {
      siteName: APP_NAME,
      type: "website",
      locale: "en_IN",
      title: `${title} | ${APP_NAME}`,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${APP_NAME}`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

/** Shared tail of every location page metadata object. */
function withSeo(meta: Metadata, { pathname, description, ogTitle }: { pathname: string; description: string; ogTitle: string }): Metadata {
  const canonical = abs(pathname);
  return {
    ...meta,
    description,
    keywords: [
      ...(Array.isArray(meta.keywords) ? meta.keywords : []),
      "MeraGhar",
      "property Haryana",
    ],
    alternates: { canonical },
    // og:image must be set here explicitly. A page that exports its own
    // `openGraph` object REPLACES the root layout's object wholesale, so simply
    // omitting images does not inherit the default — and it does not fall back
    // to app/opengraph-image.tsx either. Omitting it shipped these routes with
    // no og:image at all, so shared links had no preview card.
    openGraph: {
      siteName: APP_NAME,
      type: "website",
      locale: "en_IN",
      title: ogTitle,
      description,
      url: canonical,
      images: [{ url: `${siteUrl()}${SEO_SITE.defaultImage}`, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [`${siteUrl()}${SEO_SITE.defaultImage}`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
  };
}

export function buildLocationMetadata(location: LocationRow, stats: LocationStats): Metadata {
  const title = locationPageTitle(location);
  const pathname = locationPath(location.slug);
  return withSeo({ title }, {
    pathname,
    description: locationPageDescription(location, stats),
    ogTitle: `${title} | ${APP_NAME}`,
  });
}

export function buildCategoryMetadata(
  category: LocationCategory,
  location: LocationRow,
  stats: LocationStats
): Metadata {
  const title = categoryPageTitle(category, location);
  const pathname = categoryPath(location.slug, category.slug);
  return withSeo({ title }, {
    pathname,
    description: categoryPageDescription(category, location, stats),
    ogTitle: `${title} | ${APP_NAME}`,
  });
}

export function buildAreaMetadata(
  area: string,
  location: LocationRow,
  stats: LocationStats
): Metadata {
  const title = areaPageTitle(area, location);
  const pathname = areaPath(location.slug, area);
  return withSeo({ title }, {
    pathname,
    description: areaPageDescription(area, location, stats),
    ogTitle: `${title} | ${APP_NAME}`,
  });
}

/** Metadata for a location page that has no real listing data yet. */
export function buildEmptyLocationMetadata(location: LocationRow): Metadata {
  const title = locationPageTitle(location);
  const pathname = locationPath(location.slug);
  return withSeo({ title }, {
    pathname,
    description: locationPageDescription(location, EMPTY_STATS),
    ogTitle: `${title} | ${APP_NAME}`,
  });
}

/**
 * PROPERTY_TYPE_LABELS already renders the BHK types as "1 BHK" / "2 BHK" /
 * "3 BHK", so prefixing `${bhk} BHK` again produced titles like
 * "1 BHK 1 BHK in City Centre, Kaithal". Only add the size when the type label
 * does not already carry it.
 */
function listingSizeLabel(property: PropertyWithImages): string {
  if (!property.bhk || property.bhk <= 0) return "";
  return propertyTypeLabel(property.property_type).toLowerCase().includes("bhk")
    ? ""
    : `${property.bhk} BHK `;
}

/** "2 BHK Flat in Kaithal, Civil Lines - Rs 12,000/month" */
export function listingPageTitle(property: PropertyWithImages): string {
  const type = propertyTypeLabel(property.property_type);
  const size = listingSizeLabel(property);
  const place = property.locality ? `${property.locality}, ${property.city}` : property.city;
  const price = inr(Number(property.price) || 0);
  const period = property.purpose === "rent" ? "/month" : "";
  return `${size}${type} in ${place} - ${price}${period}`;
}

/** Meta description built from real listing facts, never padded with filler. */
export function listingPageDescription(property: PropertyWithImages): string {
  // Lowercase the label for mid-sentence grammar, but keep the BHK labels
  // uppercase so descriptions do not read "1 bhk for rent" (those are acronyms).
  const rawLabel = propertyTypeLabel(property.property_type);
  const type = rawLabel.toLowerCase().includes("bhk") ? rawLabel : rawLabel.toLowerCase();
  const size = listingSizeLabel(property);
  const intent = property.purpose === "rent" ? "for rent" : "for sale";
  const price = inr(Number(property.price) || 0);
  const where = property.locality
    ? `${property.locality}, ${property.city}`
    : property.city;
  const bits = [
    `${size}${type} ${intent} in ${where} at ${price}`,
    property.area_sqft ? `${Number(property.area_sqft)} sq ft` : null,
    property.amenities.length ? property.amenities.slice(0, 3).join(", ") : null,
  ].filter(Boolean);

  const lead = `${bits.join(", ")}. Contact the owner directly on ${APP_NAME}.`;
  return truncateText(lead, 155);
}

/**
 * Metadata for a property detail page.
 *
 * `path` must be the canonical root-relative path (/{city}/{category}/{slug}/).
 * The first listing photo is used as og:image so shared links show the actual
 * property instead of the generic site card.
 */
export function buildListingMetadata(
  property: PropertyWithImages,
  path: string
): Metadata {
  const title = listingPageTitle(property);
  const description = listingPageDescription(property);
  const canonical = abs(path);
  const photo = [...(property.images ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((image) => image.image_url)
    .find((url) => Boolean(url) && !/\.svg(?:$|[?#])/i.test(url as string));
  // Use the listing photo when it is a real raster image, otherwise fall back to
  // the site default. Never leave this unset: a page-level `openGraph` object
  // replaces the root layout's, so an omitted image means no og:image at all.
  // SVG is skipped on purpose: WhatsApp, Facebook and X do not render SVG, so an
  // SVG og:image shows a blank card in shared links.
  const ogImage = photo ? buildCanonicalUrl(photo) : `${siteUrl()}${SEO_SITE.defaultImage}`;
  const ogAlt = `${title} | ${APP_NAME}`;

  return {
    title: { absolute: title },
    description,
    keywords: [
      propertyTypeLabel(property.property_type),
      property.property_type,
      `${property.property_type} rent ${property.city}`,
      `${property.property_type} ${property.purpose} ${property.city}`,
      property.locality ? `${property.property_type} in ${property.locality}` : null,
      property.city,
      property.city === "Haryana" ? "property in Haryana" : `property in ${property.city}, Haryana`,
    ].filter((k): k is string => Boolean(k)),
    alternates: { canonical },
    openGraph: {
      siteName: APP_NAME,
      type: "article",
      locale: "en_IN",
      title: `${title} | ${APP_NAME}`,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${APP_NAME}`,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    other: {
      ...(property.created_at ? { "article:published_time": property.created_at } : {}),
      ...(property.updated_at ? { "article:modified_time": property.updated_at } : {}),
      "article:author": APP_NAME,
    },
  };
}

export { baseDescription };