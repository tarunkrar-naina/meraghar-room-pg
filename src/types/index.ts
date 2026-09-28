import type { Tables } from "@/types/database";

export type PropertyRow = Tables<"properties">;
export type PropertyImageRow = Tables<"property_images">;
export type ProfileRow = Tables<"profiles">;
export type PublicOwnerRow = { id: string; name: string; avatar_url: string | null };
export type FavoriteRow = Tables<"favorites">;
export type ReportRow = Tables<"reports">;
export type RequirementRow = Tables<"requirements">;
export type ContactRequestRow = Tables<"contact_requests">;
export type LocalityRow = Tables<"localities">;
export type LocationRow = Tables<"locations">;
export type LocationType = LocationRow["type"];
export type PropertyViewRow = Tables<"property_views">;
export type ContactRevealRow = Tables<"contact_reveals">;
export type PaymentRow = Tables<"payments">;
export type PaymentType = PaymentRow["type"];
export type PaymentStatus = PaymentRow["status"];

export interface PropertyAnalytics {
  total_views: number;
  unique_visitors: number;
  mobile_views: number;
  tablet_views: number;
  desktop_views: number;
  contact_reveals: number;
  daily: Array<{ day: string; count: number }>;
}

export type DeviceType = PropertyViewRow["device_type"];

export type PropertyPurpose = "rent" | "sale";
export type PropertyType =
  | "room"
  | "pg"
  | "1 bhk"
  | "2 bhk"
  | "3 bhk"
  | "flat"
  | "house"
  | "shop"
  | "office"
  | "plot"
  | "other";
export type Furnishing = "fully_furnished" | "semi_furnished" | "unfurnished";
export type PropertyStatus = "pending" | "approved" | "rejected" | "rented" | "sold";
export type UserRole = "user" | "admin";

export interface PropertyWithImages extends PropertyRow {
  images: PropertyImageRow[];
}

export interface PropertyListItem extends PropertyRow {
  images: Pick<PropertyImageRow, "id" | "image_url" | "display_order">[];
  image_url: string | null;
}

/** Search/Pagination query params shape for app pages. */
export type AppSearchParams = Record<string, string | string[] | undefined>;

/** Explicit props type for App Router page components (dynamic params as promises). */
export interface AppPageProps<P = Record<string, string>, Q = AppSearchParams> {
  params: Promise<P>;
  searchParams: Promise<Q>;
}

/** Query string state for the /properties page. */
export interface PropertyFilters {
  city?: string;
  locality?: string;
  purpose?: PropertyPurpose | "";
  type?: PropertyType | "";
  minPrice?: number | "";
  maxPrice?: number | "";
  bhk?: string;
  furnishing?: Furnishing | "";
  available?: boolean;
  verified?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
}

export interface PropertyCardData {
  id: string;
  /** SEO slug used to build the keyword-rich detail URL. */
  slug: string | null;
  title: string;
  purpose: PropertyPurpose;
  property_type: PropertyType;
  price: number;
  rent_period: PropertyRow["rent_period"];
  city: string;
  locality: string;
  bhk: number | null;
  furnishing: Furnishing;
  status: PropertyStatus;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
  image_url: string | null;
}

/** Shared values for the add/edit property form. */
export interface PropertyFormValues {
  title: string;
  description: string;
  purpose: PropertyPurpose;
  property_type: PropertyType;
  city: string;
  locality: string;
  address: string;
  pincode: string;
  price: string;
  rent_period: PropertyRow["rent_period"];
  security_deposit: string;
  bhk: string;
  bathrooms: string;
  furnishing: Furnishing;
  area_sqft: string;
  available_from: string;
  latitude: string;
  longitude: string;
  amenities: string[];
}

export type RequirementStatus = "open" | "closed";

export type {
  BreadcrumbItem,
  Category,
  City,
  MetadataProps,
  OpenGraphTags,
  OwnerInfo,
  PropertyListing,
  SchemaType,
  SeoPage,
} from "./seo";
