import type { LocationRow, PropertyWithImages } from "@/types";
import { slugify } from "@/lib/utils";
import { APP_NAME, ADMIN_CONTACT_EMAIL, ADMIN_CONTACT_PHONE_INTL } from "@/lib/constants";
import type { LocationCategory } from "@/lib/locations/catalog";
import type { LocationStats } from "@/lib/locations/seo";

export interface Crumb {
  name: string;
  url: string;
}

/**
 * Global Organization schema — rendered once in the root layout so every page
 * is linked back to the same entity (@id is shared by all other schemas).
 */
export function organizationJsonLd(siteUrl: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    telephone: ADMIN_CONTACT_PHONE_INTL,
    email: ADMIN_CONTACT_EMAIL,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: ADMIN_CONTACT_PHONE_INTL,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  };
}

/**
 * LocalBusiness schema.
 * - Homepage: one business covering all served cities.
 * - City pages: a scoped business instance named "MeraGhar - Properties in [City]".
 */
export function localBusinessJsonLd({
  siteUrl,
  name = APP_NAME,
  cities,
  location,
}: {
  siteUrl: string;
  name?: string;
  cities?: string[];
  location?: LocationRow;
}) {
  const served = location ? [location.name] : (cities ?? []);
  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#business${location ? `-${location.slug}` : ""}`,
    name,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    telephone: ADMIN_CONTACT_PHONE_INTL,
    email: ADMIN_CONTACT_EMAIL,
    priceRange: "₹₹",
    image: `${siteUrl}/favicon.ico`,
    areaServed: served.map((city) => ({ "@type": "City", name: city })),
    address: {
      "@type": "PostalAddress",
      addressLocality: location?.name ?? "Kaithal",
      addressRegion: location?.state ?? "Haryana",
      addressCountry: location?.country ?? "IN",
    },
  };
  return business;
}

/** FAQPage schema — pairs with the visually-rendered FAQ accordions. */
export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * CollectionPage + ItemList + AggregateOffer for category pages.
 * Prices come from real listing stats (low/high/offerCount), never fabricated.
 */
export function categoryPageJsonLd({
  siteUrl,
  url,
  name,
  description,
  category,
  location,
  stats,
  listings,
}: {
  siteUrl: string;
  url: string;
  name: string;
  description: string;
  category: LocationCategory;
  location: LocationRow;
  stats: LocationStats;
  /** Each listing must carry its absolute canonical `url` (see propertyPath). */
  listings: { url: string; title: string }[];
}) {
  const isSale = category.purpose === "sale";
  const lowPrice = isSale ? stats.minSale : stats.minRent;
  const highPrice = isSale ? stats.maxSale : stats.maxRent;

  const page: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}${url}#page`,
    name,
    url: `${siteUrl}${url}`,
    description,
    isPartOf: { "@id": `${siteUrl}/#website` },
    inLanguage: "en-IN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listings.length,
      itemListElement: listings.map((listing, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: listing.url,
        name: listing.title,
      })),
    },
  };

  if (stats.total > 0 && (lowPrice != null || highPrice != null)) {
    page.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      ...(lowPrice != null ? { lowPrice } : {}),
      ...(highPrice != null ? { highPrice } : {}),
      offerCount: stats.total,
      availability: "https://schema.org/InStock",
      areaServed: { "@type": "City", name: location.name },
      seller: { "@id": `${siteUrl}/#organization` },
    };
  }

  return page;
}

export function websiteJsonLd(siteUrl: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name,
    url: siteUrl,
    description: "Find rooms, PG, flats, houses and shops for rent or sale in Haryana.",
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/properties?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function itemListJsonLd(items: { url: string; title: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.url,
      name: it.title,
    })),
  };
}

function propertyPrice(property: PropertyWithImages): number {
  return Number(property.price) || 0;
}

/** Factual RealEstateListing schema built only from real property data. */
export function realEstateListingJsonLd(
  property: PropertyWithImages,
  siteUrl: string,
  /** Canonical root-relative path (/{city}/{category}/{slug}/). Falls back to the legacy id URL. */
  path = `/properties/${property.id}`
) {
  const price = propertyPrice(property);
  const sold = property.status === "rented" || property.status === "sold";
  const canonicalUrl = `${siteUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const image =
    property.images?.[0]?.image_url
      ? [...(property.images ?? [])]
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((i) => i.image_url)
      : undefined;

  const listing: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${canonicalUrl}#listing`,
    name: property.title,
    url: canonicalUrl,
    description: (property.description ?? "").slice(0, 500),
    datePosted: property.created_at,
    dateModified: property.updated_at,
    image,
    address: {
      "@type": "PostalAddress",
      streetAddress: [property.locality, property.address].filter(Boolean).join(", ") || undefined,
      addressLocality: property.city,
      addressRegion: "Haryana",
      postalCode: property.pincode || undefined,
      addressCountry: "IN",
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "INR",
      availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  };

  if (property.bhk != null) {
    listing.numberOfRooms = property.bhk;
  }
  if (property.bathrooms != null) {
    listing.numberOfBathroomsTotal = property.bathrooms;
  }
  if (property.latitude != null && property.longitude != null) {
    listing.geo = {
      "@type": "GeoCoordinates",
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }
  if (property.area_sqft != null) {
    listing.floorSize = {
      "@type": "QuantitativeValue",
      value: Number(property.area_sqft),
      unitCode: "FTK",
    };
  }
  if (property.furnishing) {
    listing["additionalProperty"] = [
      {
        "@type": "PropertyValue",
        name: "furnishing",
        value: property.furnishing.replace(/_/g, " "),
      },
    ];
  }
  if (property.amenities?.length) {
    listing.amenityFeature = property.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    }));
  }

  return listing;
}

/** SEO slug for a locality display name — shared with the route lookup. */
export function localitySlug(displayName: string): string {
  return slugify(displayName);
}