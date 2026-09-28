export interface City {
  name: string;
  slug: string;
  description: string;
  latitude: number;
  longitude: number;
  areas: string[];
  keywords: string[];
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
  purpose: "rent" | "sale";
  propertyType: "room" | "pg" | "flat" | "shop" | "house" | "office" | "plot" | "other";
  description: string;
  keywords: string[];
}

export interface OwnerInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  profileImage?: string | null;
}

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  type: string;
  bhk: number;
  price: number;
  city: string;
  category: string;
  area: string;
  images: string[];
  amenities: string[];
  owner: OwnerInfo;
  createdAt: Date | string;
  purpose?: "rent" | "sale";
  postalCode?: string | null;
  address?: string | null;
  bathrooms?: number | null;
  areaSqft?: number | null;
  availableFrom?: string | null;
}

export interface MetadataProps {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: "website" | "article";
  ogUrl: string;
  twitterCard: "summary" | "summary_large_image";
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

export interface BreadcrumbItem {
  name: string;
  href?: string;
  url?: string;
}

export interface OpenGraphTags {
  "og:title": string;
  "og:description": string;
  "og:image": string;
  "og:type": "website" | "article";
  "og:url": string;
  "twitter:card": "summary" | "summary_large_image";
  "twitter:title": string;
  "twitter:description": string;
  "twitter:image": string;
}

export type SeoPage = "home" | "city" | "category" | "listing" | "static";

export type SchemaType =
  | "Organization"
  | "LocalBusiness"
  | "WebSite"
  | "Breadcrumb"
  | "ItemList"
  | "CollectionPage"
  | "FAQPage"
  | "Apartment"
  | "RealEstateListing"
  | "AggregateOffer";
