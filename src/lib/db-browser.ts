/**
 * The tables the admin Database Browser is allowed to touch.
 *
 * This is a hard allowlist - a request for any other table is rejected before a
 * query is built, so the browser can never reach `auth.*`, storage internals or
 * the SQL editor. Each entry declares which column is the primary key and which
 * columns may be edited, which keeps generated columns (`id`, `created_at`)
 * immutable from the UI.
 */

export interface TableSpec {
  /** Table name in the `public` schema. */
  name: string;
  /** Human label shown in the picker. */
  label: string;
  /** Short blurb under the label. */
  blurb: string;
  /** Primary key column. Rows are addressed by this. */
  pk: string;
  /** Columns rendered in the grid, in order. `"*"` means "every column". */
  columns: string[] | "*";
  /** Columns the grid may edit. */
  editable: string[];
  /** Columns used for the row's title in the grid. */
  titleColumns: string[];
  /** Ordering for the default listing. */
  orderBy: string;
  ascending: boolean;
}

const ALL = "*" as const;

export const DB_TABLES: TableSpec[] = [
  {
    name: "properties",
    label: "Properties",
    blurb: "Sabhi property listings - status, price, photos.",
    pk: "id",
    columns: ALL,
    editable: [
      "title",
      "description",
      "purpose",
      "property_type",
      "city",
      "locality",
      "address",
      "pincode",
      "price",
      "rent_period",
      "security_deposit",
      "bhk",
      "bathrooms",
      "furnishing",
      "area_sqft",
      "available_from",
      "latitude",
      "longitude",
      "amenities",
      "status",
      "is_verified",
      "is_featured",
      "featured_until",
      "slug",
    ],
    titleColumns: ["title"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "property_images",
    label: "Property Images",
    blurb: "Har property ki photos.",
    pk: "id",
    columns: ALL,
    editable: ["image_url", "display_order"],
    titleColumns: ["image_url"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "profiles",
    label: "Users (Profiles)",
    blurb: "Sabhi registered users. Role yahin se bhi change ho sakta hai.",
    pk: "id",
    columns: ALL,
    // `role` is intentionally editable from the Users page only; the browser
    // leaves it alone so a stray click cannot escalate privileges silently.
    editable: ["name", "phone", "avatar_url", "is_blocked"],
    titleColumns: ["name", "email"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "localities",
    label: "Localities",
    blurb: "City + locality names jo filters me dikhti hain.",
    pk: "id",
    columns: ALL,
    editable: ["city", "locality"],
    titleColumns: ["locality"],
    orderBy: "city",
    ascending: true,
  },
  {
    name: "locations",
    label: "SEO Locations",
    blurb: "Cities/towns jin ke apne SEO pages bante hain.",
    pk: "id",
    columns: ALL,
    editable: [
      "name",
      "slug",
      "state",
      "country",
      "type",
      "parent_slug",
      "nearby",
      "areas",
      "is_active",
    ],
    titleColumns: ["name"],
    orderBy: "type",
    ascending: true,
  },
  {
    name: "requirements",
    label: "Requirements",
    blurb: "Customers ki property demand.",
    pk: "id",
    columns: ALL,
    editable: [
      "title",
      "description",
      "city",
      "locality",
      "property_type",
      "purpose",
      "budget_min",
      "budget_max",
      "contact_preference",
      "status",
    ],
    titleColumns: ["title"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "contact_requests",
    label: "Contact Leads",
    blurb: "Har enquiry jo customer ne bheji.",
    pk: "id",
    columns: ALL,
    editable: ["name", "phone", "message", "source"],
    titleColumns: ["name", "phone"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "reports",
    label: "Reports",
    blurb: "Property report / complaint.",
    pk: "id",
    columns: ALL,
    editable: ["status", "reason"],
    titleColumns: ["reason"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "favorites",
    label: "Favorites",
    blurb: "Users ki saved properties.",
    pk: "id",
    columns: ALL,
    editable: [],
    titleColumns: [],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "property_views",
    label: "Property Views (Analytics)",
    blurb: "Ek row = ek page view. IPs store nahi hote, sirf hash.",
    pk: "id",
    columns: ALL,
    editable: [],
    titleColumns: ["device_type"],
    orderBy: "viewed_at",
    ascending: false,
  },
  {
    name: "contact_reveals",
    label: "Contact Reveals (Paid)",
    blurb: "Kitne customers ne owner ka number unlock kiya.",
    pk: "id",
    columns: ALL,
    editable: [],
    titleColumns: [],
    orderBy: "revealed_at",
    ascending: false,
  },
  {
    name: "payments",
    label: "Payments",
    blurb: "Razorpay se aayi payments.",
    pk: "id",
    columns: ALL,
    editable: ["status"],
    titleColumns: ["razorpay_order_id"],
    orderBy: "created_at",
    ascending: false,
  },
  {
    name: "site_settings",
    label: "Site Settings",
    blurb: "Website ka editable text (content page se behtar).",
    pk: "key",
    columns: ALL,
    editable: ["value"],
    titleColumns: ["label", "key"],
    orderBy: "key",
    ascending: true,
  },
];

/** Look-up that returns undefined for anything not on the allowlist. */
export function getTableSpec(name: string): TableSpec | undefined {
  return DB_TABLES.find((t) => t.name === name);
}

/** Columns to select for a table: `*` or an explicit list. */
export function selectColumns(spec: TableSpec): string {
  return spec.columns === ALL ? "*" : spec.columns.join(", ");
}