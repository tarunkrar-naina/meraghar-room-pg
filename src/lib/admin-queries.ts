/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface AdminStats {
  properties: number;
  pendingProperties: number;
  approvedProperties: number;
  users: number;
  reportsOpen: number;
  localities: number;
  leads: number;
  openRequirements: number;
}

/** Aggregated counts for the admin dashboard. Uses the service-role client. */
export async function fetchAdminStats(): Promise<AdminStats> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { properties: 0, pendingProperties: 0, approvedProperties: 0, users: 0, reportsOpen: 0, localities: 0, leads: 0, openRequirements: 0 };

  const [properties, pendingProperties, approvedProperties, users, reportsOpen, localities, leads, openRequirements] =
    await Promise.all([
      admin.from("properties").select("id", { count: "exact", head: true }),
      admin.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("properties").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin.from("localities").select("id", { count: "exact", head: true }),
      admin.from("contact_requests").select("id", { count: "exact", head: true }),
      admin.from("requirements").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);

  return {
    properties: properties.count ?? 0,
    pendingProperties: pendingProperties.count ?? 0,
    approvedProperties: approvedProperties.count ?? 0,
    users: users.count ?? 0,
    reportsOpen: reportsOpen.count ?? 0,
    localities: localities.count ?? 0,
    leads: leads.count ?? 0,
    openRequirements: openRequirements.count ?? 0,
  };
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
  created_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  image_url: string | null;
}

export async function fetchAdminProperties(status?: string): Promise<AdminPropertyRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  let builder = admin
    .from("properties")
    .select(`id, slug, title, purpose, property_type, price, status, is_featured, is_verified, city, created_at, owner:profiles!properties_owner_id_fkey(name, phone)`)
    .order("created_at", { ascending: false })
    .limit(250) as any;

  if (status) builder = builder.eq("status", status);

  const { data, error } = await builder;
  if (error) return [];

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    property_type: row.property_type,
    price: row.price,
    status: row.status,
    is_featured: row.is_featured,
    is_verified: row.is_verified,
    city: row.city,
    created_at: row.created_at,
    owner_name: row.owner?.name ?? null,
    owner_phone: row.owner?.phone ?? null,
    image_url: null,
  }));
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("profiles")
    .select("id, name, email, phone, role, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? []) as AdminUserRow[];
}

export interface AdminReportRow {
  id: string;
  property_id: string;
  property_title: string;
  reason: string;
  status: string;
  reporter_name: string;
  created_at: string;
}

export async function fetchAdminReports(): Promise<AdminReportRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("reports")
    .select(`id, property_id, reason, status, created_at, property:properties(title), reporter:profiles!reports_reporter_id_fkey(name)`)
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
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("localities").select("id, city, locality").order("city").order("locality");
  if (error) return [];
  return data ?? [];
}

export async function fetchAllLocations() {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("locations")
    .select("*")
    .order("type")
    .order("name");
  if (error) return [];
  return data ?? [];
}

export async function fetchOpenRequirementCount(): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin) return 0;
  const { count } = await admin
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
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("requirements")
    .select(`id, title, description, city, locality, property_type, purpose, budget_min, budget_max, contact_preference, status, created_at, poster:profiles!requirements_user_id_fkey(name, phone)`)
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
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("contact_requests")
    .select(`id, name, phone, message, source, created_at, property:properties!contact_requests_property_id_fkey(title, owner:profiles!properties_owner_id_fkey(name, phone)), requirement:requirements!contact_requests_requirement_id_fkey(title, poster:profiles!requirements_user_id_fkey(name, phone))`)
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