import { assertAdmin } from "@/lib/admin-access";
import { fetchAuditLog } from "@/lib/audit";
import type { AuditRow } from "@/lib/audit";

export interface AdminStats {
  properties: number;
  pendingProperties: number;
  approvedProperties: number;
  users: number;
  reportsOpen: number;
  localities: number;
  leads: number;
  openRequirements: number;
  /** Tables the queries above could not read - usually means a migration is missing. */
  brokenTables: string[];
}

const EMPTY_STATS: AdminStats = {
  properties: 0,
  pendingProperties: 0,
  approvedProperties: 0,
  users: 0,
  reportsOpen: 0,
  localities: 0,
  leads: 0,
  openRequirements: 0,
  brokenTables: [],
};

/** Aggregated counts for the admin dashboard. Service-role client, admin-gated. */
export async function fetchAdminStats(): Promise<AdminStats> {
  const guard = await assertAdmin();
  if (!guard.ok) return EMPTY_STATS;
  const db = guard.admin;

  const [
    properties,
    pendingProperties,
    approvedProperties,
    users,
    reportsOpen,
    localities,
    leads,
    openRequirements,
  ] = await Promise.all([
    db.from("properties").select("id", { count: "exact", head: true }),
    db.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("properties").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("localities").select("id", { count: "exact", head: true }),
    db.from("contact_requests").select("id", { count: "exact", head: true }),
    db.from("requirements").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const brokenTables: string[] = [];
  if (leads.error) brokenTables.push("contact_requests");
  if (localities.error) brokenTables.push("localities");

  return {
    properties: properties.count ?? 0,
    pendingProperties: pendingProperties.count ?? 0,
    approvedProperties: approvedProperties.count ?? 0,
    users: users.count ?? 0,
    reportsOpen: reportsOpen.count ?? 0,
    localities: localities.count ?? 0,
    leads: leads.count ?? 0,
    openRequirements: openRequirements.count ?? 0,
    brokenTables,
  };
}

/** The signed-in admin's email, for the shell header. */
export async function fetchAdminEmail(): Promise<string | null> {
  const guard = await assertAdmin();
  return guard.ok ? guard.user.email : null;
}

export interface AdminPropertyRow {
  id: string;
  slug: string | null;
  title: string;
  purpose: string;
  property_type: string;
  price: number;
  status: string;
  is_featured: boolean;
  is_verified: boolean;
  city: string;
  locality: string | null;
  created_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  image_url: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchAdminProperties(status?: string): Promise<AdminPropertyRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  let builder = guard.admin
    .from("properties")
    .select(
      `id, slug, title, purpose, property_type, price, status, is_featured, is_verified, city, locality, created_at,
       owner:profiles!properties_owner_id_fkey(name, phone),
       property_images(image_url)`
    )
    .order("created_at", { ascending: false })
    .limit(250) as any;

  if (status && status !== "all") builder = builder.eq("status", status);

  const { data, error } = await builder;
  if (error) return [];

  return (data ?? []).map((row: any) => {
    const images: { image_url: string }[] = row.property_images ?? [];
    return {
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      purpose: row.purpose,
      property_type: row.property_type,
      price: row.price,
      status: row.status,
      is_featured: row.is_featured,
      is_verified: row.is_verified,
      city: row.city,
      locality: row.locality ?? null,
      created_at: row.created_at,
      owner_name: row.owner?.name ?? null,
      owner_phone: row.owner?.phone ?? null,
      image_url: images[0]?.image_url ?? null,
    };
  });
}

/** One property with its images, for the admin edit form. */
export async function fetchAdminProperty(id: string) {
  const guard = await assertAdmin();
  if (!guard.ok) return null;

  const { data, error } = await guard.admin
    .from("properties")
    .select("*, property_images(id, image_url, display_order)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  return data as unknown as {
    id: string;
    title: string;
    description: string | null;
    purpose: string;
    property_type: string;
    city: string;
    locality: string | null;
    address: string | null;
    pincode: string | null;
    price: number;
    rent_period: string | null;
    security_deposit: number | null;
    bhk: number | null;
    bathrooms: number | null;
    furnishing: string;
    area_sqft: number | null;
    available_from: string | null;
    latitude: number | null;
    longitude: number | null;
    amenities: string[] | null;
    status: string;
    property_images: { id: string; image_url: string; display_order: number }[];
  };
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("profiles")
    .select("id, name, email, phone, role, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? []) as AdminUserRow[];
}

export interface AdminReportRow {
  id: string;
  property_id: string | null;
  property_title: string;
  reason: string;
  status: string;
  reporter_name: string;
  created_at: string;
}

export async function fetchAdminReports(): Promise<AdminReportRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("reports")
    .select(
      `id, property_id, reason, status, created_at, property:properties(title), reporter:profiles!reports_reported_by_fkey(name)`
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];

  return (data ?? []).map((row: any) => ({
    id: row.id,
    property_id: row.property_id,
    property_title: row.property?.title ?? "Unknown property",
    reason: row.reason,
    status: row.status,
    reporter_name: row.reporter?.name ?? "Anonymous",
    created_at: row.created_at,
  }));
}

export async function fetchAllLocalities() {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("localities")
    .select("id, city, locality")
    .order("city")
    .order("locality");
  if (error) return [];
  return data ?? [];
}

export async function fetchAllLocations() {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("locations")
    .select("*")
    .order("type")
    .order("name");
  if (error) return [];
  return data ?? [];
}

export async function fetchOpenRequirementCount(): Promise<number> {
  const guard = await assertAdmin();
  if (!guard.ok) return 0;
  const { count } = await guard.admin
    .from("requirements")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export interface AdminRequirementRow {
  id: string;
  title: string;
  description: string | null;
  city: string;
  locality: string | null;
  property_type: string;
  purpose: string;
  budget_min: number | null;
  budget_max: number | null;
  contact_preference: string;
  status: string;
  created_at: string;
  poster_name: string | null;
  poster_phone: string | null;
}

export async function fetchAdminRequirements(): Promise<AdminRequirementRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("requirements")
    .select(
      `id, title, description, city, locality, property_type, purpose, budget_min, budget_max, contact_preference, status, created_at, poster:profiles!requirements_user_id_fkey(name, phone)`
    )
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) return [];

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    city: row.city,
    locality: row.locality,
    property_type: row.property_type,
    purpose: row.purpose,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    contact_preference: row.contact_preference,
    status: row.status,
    created_at: row.created_at,
    poster_name: row.poster?.name ?? null,
    poster_phone: row.poster?.phone ?? null,
  }));
}

export interface AdminLeadRow {
  id: string;
  name: string;
  phone: string;
  message: string;
  source: string;
  created_at: string;
  subject: string;
  ref_name: string | null;
  ref_phone: string | null;
}

export async function fetchAdminLeads(): Promise<AdminLeadRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("contact_requests")
    .select(
      `id, name, phone, message, source, created_at, property:properties!contact_requests_property_id_fkey(title, owner:profiles!properties_owner_id_fkey(name, phone)), requirement:requirements!contact_requests_requirement_id_fkey(title, poster:profiles!requirements_user_id_fkey(name, phone))`
    )
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) return [];

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    message: row.message,
    source: row.source,
    created_at: row.created_at,
    subject: row.property?.title ?? row.requirement?.title ?? "",
    ref_name: row.property?.owner?.name ?? row.requirement?.poster?.name ?? null,
    ref_phone: row.property?.owner?.phone ?? row.requirement?.poster?.phone ?? null,
  }));
}

export interface AdminDeployRow {
  id: string;
  deployment_id: string;
  status: string;
  url: string | null;
  inspector_url: string | null;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
  updated_at: string;
}

export async function fetchDeployHistory(limit = 10): Promise<AdminDeployRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("admin_deployments")
    .select("id, deployment_id, status, url, inspector_url, error_message, triggered_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AdminDeployRow[];
}

export async function fetchRecentActivity(limit = 12): Promise<AuditRow[]> {
  return fetchAuditLog(limit);
}