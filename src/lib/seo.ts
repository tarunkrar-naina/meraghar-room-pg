import type { Metadata } from "next";
import { getPublicEnv } from "@/lib/env";
import { APP_NAME, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { SEO_CATEGORIES, SEO_CITIES, SEO_PRIMARY_KEYWORDS, SEO_SITE } from "@/lib/seo-config";
import type { BreadcrumbItem, Category, City, OpenGraphTags, PropertyListing, SchemaType, SeoPage } from "@/types/seo";

const DEFAULT_DESCRIPTION =
  "Find rooms, PG, flats, houses and shops for rent or sale in Kaithal, Kurukshetra, Pundri and Narwana, Haryana.";

const CITY_LABELS: Record<string, string> = {
  kaithal: "Kaithal",
  kurukshetra: "Kurukshetra",
  pundri: "Pundri",
  narwana: "Narwana",
  haryana: "Haryana",
};

const CATEGORY_LABELS: Record<string, string> = {
  rooms: "Rooms on Rent",
  room: "Rooms on Rent",
  pg: "Paying Guest",
  flats: "Flats for Rent",
  flat: "Flats for Rent",
  shops: "Shops for Rent",
  shop: "Shops for Rent",
  property: "Properties",
  properties: "Properties",
};

export function getSeoBaseUrl(): string {
  const configured = getPublicEnv().siteUrl.trim();
  const value = !configured || configured.includes("localhost") ? SEO_SITE.url : configured;
  return value.replace(/\/+$/, "");
}

export function buildCanonicalUrl(path = "/", baseUrl = getSeoBaseUrl()): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    url.search = "";
    url.hash = "";
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  }

  const [pathname = "/"] = path.split(/[?#]/);
  const normalized = `/${pathname}`.replace(/\/{2,}/g, "/");
  const url = new URL(normalized, `${cleanBase}/`);
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  const looksLikeFile = /\.[a-z0-9]{2,8}$/i.test(url.pathname);
  if (url.pathname !== "/" && !url.pathname.endsWith("/") && !looksLikeFile) url.pathname += "/";
  return url.toString();
}

export function truncateText(value: string, maxLength = 155): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const cutoff = text.slice(0, maxLength - 1);
  const lastSpace = cutoff.lastIndexOf(" ");
  return `${cutoff.slice(0, lastSpace > 0 ? lastSpace : maxLength - 1).trim()}…`;
}

function listingTypeLabel(listing: PropertyListing): string {
  return PROPERTY_TYPE_LABELS[listing.type as keyof typeof PROPERTY_TYPE_LABELS] ?? titleCase(listing.type);
}

function listingSizeLabel(listing: PropertyListing): string {
  return listing.bhk && !listingTypeLabel(listing).toLowerCase().includes("bhk") ? `${listing.bhk} BHK ` : "";
}

function validDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeSlug(value: string): string {
  return safeDecode(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getCitySeo(city: string): City {
  const slug = normalizeSlug(city);
  const known = SEO_CITIES.find((item) => item.slug === slug);
  if (known) return known;
  const name = CITY_LABELS[slug] ?? titleCase(slug || "Haryana");
  return {
    name,
    slug: slug || "haryana",
    description: `Find rooms, PG, flats, houses and shops for rent or sale in ${name}, Haryana.`,
    latitude: 0,
    longitude: 0,
    areas: [],
    keywords: [`property in ${name}`, `rooms in ${name}`, `flats in ${name}`, `property dealer ${name}`],
  };
}

export function getCategorySeo(category: string): Category {
  const slug = normalizeSlug(category);
  const known = SEO_CATEGORIES.find((item) => item.slug === slug || item.propertyType === slug);
  if (known) return known;
  const name = CATEGORY_LABELS[slug] ?? titleCase(slug || "Properties");
  return {
    name,
    slug: slug || "properties",
    icon: "building",
    purpose: "rent",
    propertyType: "other",
    description: `Browse ${name.toLowerCase()} in Haryana with local property details and owner contact.`,
    keywords: [name.toLowerCase(), `property ${name.toLowerCase()} Haryana`],
  };
}

export function getCityKeywords(city: City): string[] {
  return uniqueStrings([
    ...SEO_PRIMARY_KEYWORDS.filter((keyword) => keyword.toLowerCase().includes(city.name.toLowerCase())),
    ...city.keywords,
    `property in ${city.name}`,
    `property ${city.name} Haryana`,
    `${city.name} real estate`,
  ]);
}

export function getCategoryKeywords(category: Category, city?: City): string[] {
  const location = city ? city.name : "Haryana";
  return uniqueStrings([
    ...category.keywords,
    `${category.name} ${location}`,
    `${category.name.toLowerCase()} ${location}`,
    `property ${location} ${category.propertyType}`,
  ]);
}

export function getPageDescription(page: SeoPage, data: Record<string, unknown> = {}): string {
  if (typeof data.description === "string" && data.description.trim()) return truncateText(data.description, 155);
  if (page === "home") return DEFAULT_DESCRIPTION;

  if (page === "city") {
    const city = (data.city as City | undefined) ?? getCitySeo(String(data.citySlug ?? "haryana"));
    return truncateText(city.description || DEFAULT_DESCRIPTION, 155);
  }

  if (page === "category") {
    const city = (data.city as City | undefined) ?? getCitySeo(String(data.citySlug ?? "haryana"));
    const category = (data.category as Category | undefined) ?? getCategorySeo(String(data.categorySlug ?? "properties"));
    return truncateText(`${category.description} Explore ${category.name.toLowerCase()} in ${city.name}, Haryana.`, 155);
  }

  if (page === "listing") {
    const listing = data.listing as PropertyListing | undefined;
    if (listing) {
      const propertyType = listingTypeLabel(listing);
      const size = listingSizeLabel(listing);
      const rent = listing.purpose === "rent" ? "for rent" : "for sale";
      return truncateText(`${size}${propertyType} ${rent} in ${listing.area || listing.city}, ${listing.city}. ${listing.description}`, 155);
    }
  }

  return DEFAULT_DESCRIPTION;
}

export function getPageTitle(page: SeoPage, data: Record<string, unknown> = {}): string {
  if (typeof data.title === "string" && data.title.trim()) return data.title.trim();
  if (page === "home") return "MeraGhar - Rooms, PG, Flats & Properties in Haryana";

  if (page === "city") {
    const city = (data.city as City | undefined) ?? getCitySeo(String(data.citySlug ?? "haryana"));
    return `Property in ${city.name} - Rooms, PG, Flats & Shops | MeraGhar`;
  }

  if (page === "category") {
    const city = (data.city as City | undefined) ?? getCitySeo(String(data.citySlug ?? "haryana"));
    const category = (data.category as Category | undefined) ?? getCategorySeo(String(data.categorySlug ?? "properties"));
    return `${category.name} in ${city.name} | MeraGhar`;
  }

  if (page === "listing") {
    const listing = data.listing as PropertyListing | undefined;
    if (listing) {
      const propertyType = listingTypeLabel(listing);
      const size = listingSizeLabel(listing);
      const period = listing.purpose === "rent" ? "/month" : "";
      return `${size}${propertyType} in ${listing.city} - ₹${listing.price.toLocaleString("en-IN")}${period} | MeraGhar`;
    }
  }

  return "MeraGhar - Local Property Marketplace";
}

export function buildMetadata({
  title,
  description,
  keywords,
  path,
  image,
  ogType = "website",
  publishedTime,
  modifiedTime,
  author,
}: {
  title: string;
  description: string;
  keywords?: string[];
  path: string;
  image?: string | null;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}): Metadata {
  const canonical = buildCanonicalUrl(path);
  const cleanDescription = truncateText(description, 155);
  const imageUrl = image ? buildCanonicalUrl(image) : `${getSeoBaseUrl()}${SEO_SITE.defaultImage}`;
  const cleanKeywords = uniqueStrings(keywords ?? []);
  return {
    title: { absolute: title },
    description: cleanDescription,
    keywords: cleanKeywords,
    alternates: { canonical },
    openGraph: {
      type: ogType,
      siteName: APP_NAME,
      locale: SEO_SITE.locale,
      title,
      description: cleanDescription,
      url: canonical,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanDescription,
      images: [imageUrl],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    ...(publishedTime || modifiedTime || author
      ? {
          other: {
            ...(publishedTime ? { "article:published_time": publishedTime } : {}),
            ...(modifiedTime ? { "article:modified_time": modifiedTime } : {}),
            ...(author ? { author } : {}),
          },
        }
      : {}),
  };
}

export function generateMetadata(
  page: SeoPage,
  data: {
    city?: City;
    citySlug?: string;
    category?: Category;
    categorySlug?: string;
    listing?: PropertyListing | null;
    path?: string;
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string | null;
  } = {},
): Metadata {
  const city = data.city ?? (data.citySlug ? getCitySeo(data.citySlug) : undefined);
  const category = data.category ?? (data.categorySlug ? getCategorySeo(data.categorySlug) : undefined);
  const listing = data.listing ?? undefined;
  const title = getPageTitle(page, { ...data, city, category, listing });
  const description = getPageDescription(page, { ...data, city, category, listing });
  const path = data.path ?? (page === "home" ? "/" : page === "city" ? `/${city?.slug ?? "haryana"}/` : page === "category" ? `/${city?.slug ?? "haryana"}/${category?.slug ?? "properties"}/` : page === "listing" && listing ? `/properties/${listing.id}/` : "/");
  const keywords = data.keywords ?? (page === "city" && city ? getCityKeywords(city) : page === "category" && category ? getCategoryKeywords(category, city) : page === "listing" && listing ? uniqueStrings([listing.type, listing.city, listing.area, ...(listing.amenities ?? [])]) : uniqueStrings(SEO_PRIMARY_KEYWORDS));
  return buildMetadata({
    title,
    description,
    keywords,
    path,
    image: data.image ?? listing?.images?.[0],
    ogType: page === "listing" ? "article" : "website",
    publishedTime: validDate(listing?.createdAt),
    modifiedTime: validDate(listing?.createdAt),
  });
}

export function generateCityPageMetadata(citySlug: string): Metadata {
  const city = getCitySeo(citySlug);
  return generateMetadata("city", { city, path: `/${city.slug}/` });
}

export function generateCategoryPageMetadata(citySlug: string, categorySlug: string): Metadata {
  const city = getCitySeo(citySlug);
  const category = getCategorySeo(categorySlug);
  return generateMetadata("category", { city, category, path: `/${city.slug}/${category.slug}/` });
}

export function generateListingMetadata(listing: PropertyListing): Metadata {
  return generateMetadata("listing", { listing, path: `/properties/${listing.id}/` });
}

export function buildOpenGraphTags(page: SeoPage, data: Record<string, unknown> = {}): OpenGraphTags {
  const title = getPageTitle(page, data);
  const description = getPageDescription(page, data);
  const path = typeof data.path === "string" ? data.path : page === "home" ? "/" : "/";
  const url = buildCanonicalUrl(path);
  const image = typeof data.image === "string" ? buildCanonicalUrl(data.image) : `${getSeoBaseUrl()}${SEO_SITE.defaultImage}`;
  return {
    "og:title": title,
    "og:description": description,
    "og:image": image,
    "og:type": page === "listing" ? "article" : "website",
    "og:url": url,
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": image,
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function generateSchemaMarkup(type: SchemaType, data: Record<string, unknown> = {}): Record<string, unknown> {
  const siteUrl = getSeoBaseUrl();
  const logo = `${siteUrl}${SEO_SITE.logo}`;
  const defaultImage = `${siteUrl}${SEO_SITE.defaultImage}`;
  const name = typeof data.name === "string" ? data.name : APP_NAME;
  const description = typeof data.description === "string" ? data.description : DEFAULT_DESCRIPTION;

  if (type === "Organization") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name,
      url: siteUrl,
      logo,
      email: "tarunnaian41@gmail.com",
      contactPoint: { "@type": "ContactPoint", telephone: "+91-98120-80406", contactType: "customer service", areaServed: "IN" },
    };
  }

  if (type === "WebSite") {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name,
      url: siteUrl,
      description,
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: { "@type": "SearchAction", target: `${siteUrl}/properties?q={search_term_string}`, "query-input": "required name=search_term_string" },
    };
  }

  if (type === "LocalBusiness") {
    const cities = stringArray(data.cities);
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${siteUrl}/#localbusiness`,
      name,
      url: siteUrl,
      description,
      image: defaultImage,
      logo,
      telephone: "+91-98120-80406",
      email: "tarunnaian41@gmail.com",
      priceRange: "₹₹",
      currenciesAccepted: "INR",
      areaServed: cities.map((city) => ({ "@type": "City", name: city })),
      address: { "@type": "PostalAddress", addressLocality: "Kaithal", addressRegion: "Haryana", addressCountry: "IN" },
    };
  }

  if (type === "Breadcrumb") {
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => {
        const entry = recordValue(item);
        const itemUrl = typeof entry.url === "string" ? entry.url : typeof entry.href === "string" ? buildCanonicalUrl(entry.href) : undefined;
        return {
          "@type": "ListItem",
          position: index + 1,
          name: typeof entry.name === "string" ? entry.name : "Page",
          ...(itemUrl ? { item: itemUrl } : {}),
        };
      }),
    };
  }

  if (type === "ItemList") {
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: items.map((item, index) => {
        const entry = recordValue(item);
        return {
          "@type": "ListItem",
          position: index + 1,
          name: typeof entry.name === "string" ? entry.name : "Property",
          url: typeof entry.url === "string" ? entry.url : buildCanonicalUrl("/properties"),
        };
      }),
    };
  }

  if (type === "FAQPage") {
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => {
        const entry = recordValue(faq);
        return {
          "@type": "Question",
          name: typeof entry.question === "string" ? entry.question : "Question",
          acceptedAnswer: { "@type": "Answer", text: typeof entry.answer === "string" ? entry.answer : "Answer" },
        };
      }),
    };
  }

  if (type === "CollectionPage") {
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name,
      description,
      url: typeof data.url === "string" ? data.url : siteUrl,
      isPartOf: { "@id": `${siteUrl}/#website` },
      mainEntity: generateSchemaMarkup("ItemList", { items }),
    };
  }

  if (type === "Apartment" || type === "RealEstateListing") {
    const images = stringArray(data.images).map((image) => buildCanonicalUrl(image));
    const address = recordValue(data.address);
    const offer = recordValue(data.offer);
    const owner = recordValue(data.owner);
    return {
      "@context": "https://schema.org",
      "@type": type === "RealEstateListing" ? "RealEstateListing" : ["Apartment", "RealEstateListing"],
      "@id": typeof data.id === "string" ? data.id : `${siteUrl}/properties`,
      name: name,
      description,
      url: typeof data.url === "string" ? data.url : siteUrl,
      ...(images.length > 0 ? { image: images } : {}),
      ...(typeof data.numberOfRooms === "number" ? { numberOfRooms: data.numberOfRooms } : {}),
      ...(typeof data.numberOfBathroomsTotal === "number" ? { numberOfBathroomsTotal: data.numberOfBathroomsTotal } : {}),
      ...(typeof data.areaSqft === "number" ? { floorSize: { "@type": "QuantitativeValue", value: data.areaSqft, unitCode: "FTK" } } : {}),
      ...(typeof data.datePosted === "string" ? { datePosted: data.datePosted } : {}),
      address: { "@type": "PostalAddress", ...address },
      ...(owner.name
        ? { seller: { "@type": "Person", name: owner.name, ...(owner.url ? { url: owner.url } : {}) } }
        : {}),
      offers: {
        "@type": "Offer",
        price: offer.price ?? data.price,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        ...(offer.url ? { url: offer.url } : {}),
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    offerCount: typeof data.offerCount === "number" ? data.offerCount : 0,
    lowPrice: typeof data.lowPrice === "number" ? data.lowPrice : undefined,
    highPrice: typeof data.highPrice === "number" ? data.highPrice : undefined,
    ...(Array.isArray(data.offers) ? { offers: data.offers } : {}),
  };
}

export function generateBreadcrumb(path: string): BreadcrumbItem[] {
  const cleanPath = path.split(/[?#]/)[0] || "/";
  const segments = cleanPath.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: "Home", href: "/" }];
  let current = "";
  for (const rawSegment of segments) {
    const segment = safeDecode(rawSegment);
    current += `/${segment}`;
    const slug = normalizeSlug(segment);
    const name = CITY_LABELS[slug] ?? CATEGORY_LABELS[slug] ?? (segment === "properties" ? "Properties" : titleCase(segment));
    items.push({ name, href: current, url: buildCanonicalUrl(current) });
  }
  return items;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return generateSchemaMarkup("Breadcrumb", { items: items.map((item) => ({ ...item, url: item.url ?? (item.href ? buildCanonicalUrl(item.href) : undefined) })) });
}

export function buildPropertyImageAlt(
  property: {
    title?: string;
    type?: string;
    property_type?: string;
    bhk?: number | null;
    city?: string;
    area?: string;
    locality?: string;
  },
  imageIndex = 0,
): string {
  const type = property.property_type ?? property.type ?? "property";
  const label = PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? titleCase(type);
  const size = property.bhk ? `${property.bhk} BHK ` : "";
  const place = [property.area ?? property.locality, property.city].filter(Boolean).join(", ");
  const view = imageIndex > 0 ? ` view ${imageIndex + 1}` : "";
  return truncateText(`${size}${label} in ${place || "Haryana"}${view}`, 140);
}
