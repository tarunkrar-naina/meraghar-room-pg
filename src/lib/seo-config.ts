import type { Category, City } from "@/types/seo";

export const SEO_SITE = {
  name: "MeraGhar",
  url: "https://meraghar.com",
  /** Square brand mark used for Organization/LocalBusiness logo in JSON-LD. */
  logo: "/brand/logo.svg",
  /** Static 1200x630 social card used as the og:image fallback. */
  defaultImage: "/brand/og-default.png",
  language: "en-IN",
  locale: "en_IN",
  country: "IN",
  region: "Haryana",
  postalCode: "136001",
  twitterHandle: "@meraghar",
} as const;

export const SEO_CITIES: City[] = [
  {
    name: "Kaithal",
    slug: "kaithal",
    description: "Find rooms, PG, flats, houses and shops for rent or sale in Kaithal, Haryana.",
    latitude: 29.7985,
    longitude: 76.4022,
    areas: ["Railway Station", "Market Area", "Civil Lines", "Residential Area"],
    keywords: ["room on rent Kaithal", "flat rent Kaithal", "house rent Kaithal", "affordable rooms Kaithal"],
  },
  {
    name: "Kurukshetra",
    slug: "kurukshetra",
    description: "Search paying guest accommodation, flats, rooms and shops near Kurukshetra University and market areas.",
    latitude: 29.9695,
    longitude: 76.8783,
    areas: ["University", "Medical College", "Main Market", "Industrial Area"],
    keywords: ["PG Kurukshetra", "shop rent Kurukshetra", "commercial space Kurukshetra", "flat rent near Kurukshetra University"],
  },
  {
    name: "Pundri",
    slug: "pundri",
    description: "Browse affordable rooms, independent houses, flats and commercial property in Pundri, Haryana.",
    latitude: 29.7561,
    longitude: 76.0748,
    areas: ["Residential Area", "Commercial Area", "Market Area"],
    keywords: ["paying guest Pundri", "independent house rent in Pundri", "property for rent Pundri"],
  },
  {
    name: "Narwana",
    slug: "narwana",
    description: "Explore rooms, flats, houses and shops for rent or sale in Narwana's business and residential districts.",
    latitude: 29.6241,
    longitude: 76.1182,
    areas: ["Business District", "Residential Area", "Main Market"],
    keywords: ["property for sale Narwana", "rooms on rent Narwana", "property dealer Haryana"],
  },
];

export const SEO_CATEGORIES: Category[] = [
  {
    name: "Rooms on Rent",
    slug: "rooms",
    icon: "sofa",
    purpose: "rent",
    propertyType: "room",
    description: "Affordable rooms on rent with direct owner contact.",
    keywords: ["rooms on rent", "affordable rooms", "room rent"],
  },
  {
    name: "Paying Guest",
    slug: "pg",
    icon: "bed",
    purpose: "rent",
    propertyType: "pg",
    description: "PG and paying guest accommodation for students and working professionals.",
    keywords: ["PG", "paying guest accommodation", "PG for girls", "PG with mess"],
  },
  {
    name: "Flats for Rent",
    slug: "flats",
    icon: "building",
    purpose: "rent",
    propertyType: "flat",
    description: "Verified flats for rent in residential and university areas.",
    keywords: ["flats for rent", "flat rent", "1 BHK flat rent", "2 BHK flat rent"],
  },
  {
    name: "Shops for Rent",
    slug: "shops",
    icon: "store",
    purpose: "rent",
    propertyType: "shop",
    description: "Shops and commercial spaces for rent in local market areas.",
    keywords: ["shops for rent", "commercial shop space", "shop rent", "business space"],
  },
];

export const SEO_PRIMARY_KEYWORDS = [
  "room on rent Kaithal",
  "PG Kurukshetra",
  "flat rent Kaithal",
  "property for sale Narwana",
  "shop rent Kurukshetra",
  "paying guest Pundri",
  "house rent Kaithal",
  "commercial space Kurukshetra",
  "property dealer Haryana",
  "affordable rooms Kaithal",
];

export const SEO_LONG_TAIL_KEYWORDS = [
  "1 BHK flat rent near Kaithal railway station",
  "PG for girls in Kurukshetra with mess facilities",
  "Commercial shop space rent Kurukshetra market area",
  "Budget friendly rooms Kaithal for students",
  "Independent house rent in Pundri",
  "Flat rent near Kurukshetra University",
  "Paying guest accommodation Narwana",
  "Shop for rent Kurukshetra main market",
  "Property investment opportunity Kaithal",
  "3 BHK house sale in Kurukshetra",
];

export const SEO_CITY_SLUGS = SEO_CITIES.map((city) => city.slug);
