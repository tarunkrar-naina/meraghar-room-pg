import type {
  Furnishing,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
} from "@/types";

export const PROPERTY_TYPES: PropertyType[] = [
  "room",
  "pg",
  "1 bhk",
  "2 bhk",
  "3 bhk",
  "flat",
  "house",
  "shop",
  "office",
  "plot",
  "other",
];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  room: "Room",
  pg: "PG",
  "1 bhk": "1 BHK",
  "2 bhk": "2 BHK",
  "3 bhk": "3 BHK",
  flat: "Flat",
  house: "House",
  shop: "Shop",
  office: "Office",
  plot: "Plot",
  other: "Other",
};

export const PURPOSES: PropertyPurpose[] = ["rent", "sale"];

export const PURPOSE_LABELS: Record<PropertyPurpose, string> = {
  rent: "Rent",
  sale: "Sale",
};

export const FURNISHING_OPTIONS: { value: Furnishing; label: string }[] = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi Furnished" },
  { value: "fully_furnished", label: "Fully Furnished" },
];

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi Furnished",
  fully_furnished: "Fully Furnished",
};

export const RENT_PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One time" },
] as const;

export const RENT_PERIOD_LABELS: Record<string, string> = {
  monthly: "/month",
  quarterly: "/quarter",
  half_yearly: "/6 months",
  yearly: "/year",
  one_time: "",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  rented: "Rented",
  sold: "Sold",
};

export const PROPERTY_STATUS_STYLES: Record<PropertyStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  rented: "bg-blue-100 text-blue-800 border-blue-200",
  sold: "bg-slate-200 text-slate-800 border-slate-300",
};

export const BHK_OPTIONS = [
  { value: "1", label: "1 BHK" },
  { value: "2", label: "2 BHK" },
  { value: "3", label: "3 BHK" },
  { value: "4", label: "4 BHK" },
  { value: "5+", label: "5+ BHK" },
];

export const AMENITIES = [
  "WiFi",
  "Parking",
  "Water Supply",
  "Electricity",
  "Attached Bathroom",
  "Kitchen",
  "Balcony",
  "Furnished",
  "CCTV",
  "Power Backup",
  "Lift",
  "Security",
  "Air Conditioning",
  "Geyser",
  "Gym",
  "Other",
];

export const DEFAULT_CITIES = ["Kaithal", "Kurukshetra", "Pundri", "Narwana", "Karnal"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export const REPORT_REASONS = [
  "Fake / fraudulent listing",
  "Listing already taken",
  "Wrong price or details",
  "Duplicate listing",
  "Inappropriate content",
  "Scam / suspicious behavior",
  "Other",
];

export const DEMO_OWNER_EMAIL = "demo.owner@meraghar.in";
export const DEMO_ADMIN_EMAIL = "admin@meraghar.in";

/** MeraGhar admin contact - all customer<->owner contact flows through admin. */
export const ADMIN_CONTACT_PHONE = "8950056231";
export const ADMIN_CONTACT_PHONE_INTL = "+918950056231";
export const ADMIN_CONTACT_EMAIL = "tarunnaian41@gmail.com";
export const ADMIN_WHATSAPP_NUMBER = "918950056231";

export const APP_NAME = "MeraGhar";
export const APP_TAGLINE = "Find Your Perfect Home in Kaithal, Kurukshetra, Pundri & Narwana";
export const APP_TAGLINE_HINDI = "Apna Room, Ghar Ya Property Yahan Dhundhiye";
export const APP_SUBTITLE =
  "Search rooms, PGs, flats, houses, shops and plots for rent or sale — and post your property free.";