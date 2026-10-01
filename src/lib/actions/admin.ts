"use server";

import { revalidatePath } from "next/cache";
import { guardAdminAction } from "@/lib/admin-access";
import { audit } from "@/lib/audit";
import { cleanText, propertySlug } from "@/lib/utils";
import { validatePropertyForm } from "@/lib/validation";
import { dbRevalidate } from "@/lib/revalidate";
import { getPublicEnv, isAllowedAdminEmail } from "@/lib/env";
import type { PropertyFormValues, PropertyStatus } from "@/types";

export type AdminActionResult = { ok: boolean; error?: string; id?: string };

/** The public form's values plus the admin-only status dropdown. */
export interface AdminPropertyFormValues extends PropertyFormValues {
  status?: PropertyStatus;
}

const STATUSES: PropertyStatus[] = ["pending", "approved", "rejected", "rented", "sold"];

/** Form fields arrive as string | string[] from <FormData>. */
function toValues(data: Record<string, unknown>): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.map(String);
    else if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

/** Shared sanitiser so the admin form and the public form write identical data. */
function sanitize(values: Record<string, string | string[] | undefined>) {
  return {
    title: cleanText(String(values.title ?? ""), 80),
    description: cleanText(String(values.description ?? ""), 5000),
    purpose: values.purpose ?? "rent",
    property_type: values.property_type ?? "room",
    city: cleanText(String(values.city ?? ""), 40),
    locality: cleanText(String(values.locality ?? ""), 60),
    address: cleanText(String(values.address ?? ""), 200),
    pincode: cleanText(String(values.pincode ?? ""), 6),
    price: Number(values.price ?? 0),
    rent_period: values.rent_period ?? "monthly",
    security_deposit: values.security_deposit ? Number(values.security_deposit) : null,
    bhk: values.bhk ? Number(values.bhk) : null,
    bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
    furnishing: values.furnishing ?? "unfurnished",
    area_sqft: values.area_sqft ? Number(values.area_sqft) : null,
    available_from: values.available_from || null,
    latitude: values.latitude && values.latitude !== "0" ? Number(values.latitude) : null,
    longitude: values.longitude && values.longitude !== "0" ? Number(values.longitude) : null,
    amenities: Array.isArray(values.amenities) ? values.amenities.slice(0, 20) : [],
  };
}

/**
 * Creates a property from the admin panel. Unlike the public form this needs no
 * owner - the admin is recorded as the owner so the listing stays manageable.
 */
export async function adminCreateProperty(
  input: AdminPropertyFormValues,
  imageUrls: string[]
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const values = toValues(input as unknown as Record<string, unknown>);
  const errors = validatePropertyForm(values);
  const firstError = Object.values(errors)[0];
  if (firstError) return { ok: false, error: firstError };

  if (imageUrls.length === 0) return { ok: false, error: "At least one property image is required." };
  if (imageUrls.length > 10) return { ok: false, error: "Maximum 10 images allowed." };

  const status = STATUSES.includes(input.status as PropertyStatus) ? (input.status as PropertyStatus) : "approved";
  const sanitized = sanitize(values);

  const { data, error } = await guard
    .admin!.from("properties")
    .insert({ ...sanitized, owner_id: guard.adminId, status } as never)
    .select("id, title")
    .single();
  if (error) return { ok: false, error: error.message };

  const id = (data as { id: string }).id;
  await guard
    .admin!.from("properties")
    .update({ slug: propertySlug({ title: (data as { title: string }).title, id }) })
    .eq("id", id);

  const { error: imageError } = await guard
    .admin!.from("property_images")
    .insert(
      imageUrls.map((url, i) => ({
        property_id: id,
        image_url: url,
        display_order: i,
      })) as never
    );
  if (imageError) return { ok: false, error: imageError.message, id };

  await audit(guard.adminEmail!, "property.create", id, { title: sanitized.title });
  revalidateAllPropertyPaths();
  return { ok: true, id };
}

/** Saves edits to an existing property, optionally replacing its images. */
export async function adminUpdateProperty(
  id: string,
  input: AdminPropertyFormValues,
  imageUrls: string[]
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const values = toValues(input as unknown as Record<string, unknown>);
  const errors = validatePropertyForm(values);
  const firstError = Object.values(errors)[0];
  if (firstError) return { ok: false, error: firstError };

  const patch: Record<string, unknown> = sanitize(values);
  if (STATUSES.includes(input.status as PropertyStatus)) patch.status = input.status;

  const { error } = await guard
    .admin!.from("properties")
    .update(patch as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (imageUrls.length > 0) {
    // Replace the whole set: the admin form always submits the final order.
    const { data: existing } = await guard
      .admin!.from("property_images")
      .select("image_url")
      .eq("property_id", id);
    const oldUrls = (existing ?? []).map((r) => (r as { image_url: string }).image_url);

    await guard.admin!.from("property_images").delete().eq("property_id", id);
    const { error: insertError } = await guard.admin!.from("property_images").insert(
      imageUrls.slice(0, 10).map((url, i) => ({
        property_id: id,
        image_url: url,
        display_order: i,
      })) as never
    );
    if (insertError) return { ok: false, error: insertError.message };

    await removeOrphanImages(oldUrls, imageUrls);
  }

  await audit(guard.adminEmail!, "property.update", id);
  revalidateAllPropertyPaths();
  return { ok: true, id };
}

/** Deletes a property along with its image rows and storage objects. */
export async function adminDeleteProperty(id: string): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const { data: images } = await guard
    .admin!.from("property_images")
    .select("image_url")
    .eq("property_id", id);
  const urls = (images ?? []).map((r) => (r as { image_url: string }).image_url);

  const { error } = await guard.admin!.from("properties").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // property_images rows cascade in the database; the storage objects do not.
  await removeOrphanImages(urls, []);

  await audit(guard.adminEmail!, "property.delete", id, { imagesRemoved: urls.length });
  revalidateAllPropertyPaths();
  return { ok: true };
}

/** Moves a property's lifecycle status. */
export async function adminSetPropertyStatus(
  id: string,
  status: string
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };
  if (!STATUSES.includes(status as PropertyStatus)) return { ok: false, error: "Invalid status." };

  const { error } = await guard
    .admin!.from("properties")
    .update({ status: status as PropertyStatus } as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "property.status", id, { status });
  revalidateAllPropertyPaths();
  return { ok: true };
}

export async function adminToggleVerified(
  id: string,
  isVerified: boolean
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const { error } = await guard
    .admin!.from("properties")
    .update({ is_verified: isVerified } as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "property.verify", id, { isVerified });
  revalidateAllPropertyPaths();
  return { ok: true };
}

export async function adminToggleFeatured(
  id: string,
  isFeatured: boolean
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const featuredUntil = isFeatured
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await guard
    .admin!.from("properties")
    .update({ is_featured: isFeatured, featured_until: featuredUntil } as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "property.feature", id, { isFeatured });
  revalidateAllPropertyPaths();
  return { ok: true };
}

/** Blocks or unblocks a user. Blocked users behave as signed out everywhere. */
export async function adminSetUserBlocked(
  userId: string,
  blocked: boolean
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };
  if (userId === guard.adminId) return { ok: false, error: "You cannot block your own account." };

  const { error } = await guard
    .admin!.from("profiles")
    .update({ is_blocked: blocked } as never)
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, blocked ? "user.block" : "user.unblock", userId);
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Promotes or demotes a user. The target must be on the ADMIN_EMAILS allowlist. */
export async function adminSetUserRole(
  userId: string,
  role: "user" | "admin"
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const { data: profile } = await guard
    .admin!.from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const email = (profile as { email?: string } | null)?.email ?? "";

  if (role === "admin" && !isAllowedAdminEmail(email)) {
    return {
      ok: false,
      error: `${email || "This user"} is not on the ADMIN_EMAILS allowlist. Add the address there first, then redeploy.`,
    };
  }
  if (userId === guard.adminId && role === "user") {
    return { ok: false, error: "You cannot remove your own admin role." };
  }

  const { error } = await guard
    .admin!.from("profiles")
    .update({ role } as never)
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "user.role", userId, { role });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Sets a new password for a user (admin recovery path). */
export async function adminResetUserPassword(
  userId: string,
  newPassword: string
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };
  if (!newPassword || newPassword.length < 16) {
    return { ok: false, error: "Password must be at least 16 characters." };
  }

  const { error } = await guard.admin!.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "user.password_reset", userId);
  return { ok: true };
}

/** Permanently removes a user and everything they own. */
export async function adminDeleteUser(userId: string): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };
  if (userId === guard.adminId) return { ok: false, error: "You cannot delete your own account." };

  const { data: profile } = await guard
    .admin!.from("profiles")
    .select("email, role")
    .eq("id", userId)
    .maybeSingle();
  const target = profile as { email?: string; role?: string } | null;

  // Refuse to delete another admin while only one admin account exists.
  if (target?.role === "admin") {
    const { count } = await guard
      .admin!.from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "This is the only admin account - it cannot be deleted." };
    }
  }

  // Remove their property images from storage first (rows cascade otherwise).
  const { data: props } = await guard
    .admin!.from("properties")
    .select("id, property_images(image_url)")
    .eq("owner_id", userId);
  const urls: string[] = [];
  for (const p of (props ?? []) as { property_images?: { image_url: string }[] | null }[]) {
    for (const img of p.property_images ?? []) urls.push(img.image_url);
  }

  const { error } = await guard.admin!.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  await removeOrphanImages(urls, []);
  await audit(guard.adminEmail!, "user.delete", userId, { email: target?.email });
  revalidatePath("/admin/users");
  revalidatePath("/admin/properties");
  return { ok: true };
}

/** Deletes storage objects that are no longer referenced by any image row. */
async function removeOrphanImages(oldUrls: string[], keepUrls: string[]): Promise<void> {
  const guard = await guardAdminAction();
  if (!guard.ok || oldUrls.length === 0) return;

  const keep = new Set(keepUrls);
  const orphaned = oldUrls.filter((url) => !keep.has(url));
  if (orphaned.length === 0) return;

  const paths = orphaned
    .map(storagePathFromUrl)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;

  try {
    await guard.admin!.storage
      .from(getPublicEnv().supabaseBucket)
      .remove([...new Set(paths)]);
  } catch {
    // A leftover storage object is harmless; never fail the action over it.
  }
}

function storagePathFromUrl(url: string): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const bucketAndPath = url.slice(index + marker.length);
  const slash = bucketAndPath.indexOf("/");
  if (slash === -1) return null;
  return decodeURIComponent(bucketAndPath.slice(slash + 1));
}

function revalidateAllPropertyPaths(): void {
  revalidatePath("/admin/properties");
  dbRevalidate("properties");
  dbRevalidate("property_images");
}
// ---------------------------------------------------------------------------
// Localities (city + locality pairs shown in the property filters)
// ---------------------------------------------------------------------------

export async function adminAddLocality(
  city: string,
  locality: string
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const cleanCity = cleanText(city, 40);
  const cleanLocality = cleanText(locality, 60);
  if (!cleanCity || !cleanLocality) {
    return { ok: false, error: "City aur locality dono zaroori hain." };
  }

  const { data: existing } = await guard
    .admin!.from("localities")
    .select("id")
    .eq("city", cleanCity)
    .eq("locality", cleanLocality)
    .maybeSingle();
  if (existing) return { ok: false, error: "Ye locality pehle se mojood hai." };

  const { data, error } = await guard
    .admin!.from("localities")
    .insert({ city: cleanCity, locality: cleanLocality } as never)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "locality.create", String((data as { id: string }).id), {
    city: cleanCity,
    locality: cleanLocality,
  });
  dbRevalidate("localities");
  revalidatePath("/admin/localities");
  revalidatePath("/properties");

  return { ok: true, id: (data as { id: string }).id };
}

export async function adminDeleteLocality(id: string): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  // properties.locality holds the locality *name*, not the localities.id, so the
  // row has to be resolved before the usage check.
  const { data: locality } = await guard
    .admin!.from("localities")
    .select("city, locality")
    .eq("id", id)
    .maybeSingle();
  if (!locality) return { ok: false, error: "Locality nahi mili." };

  const { count: inUse } = await guard
    .admin!.from("properties")
    .select("id", { count: "exact", head: true })
    .eq("city", locality.city)
    .eq("locality", locality.locality);
  if ((inUse ?? 0) > 0) {
    return { ok: false, error: "Kuch properties isi locality me hain - pehle unhe badlein." };
  }

  const { error } = await guard.admin!.from("localities").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "locality.delete", id);
  dbRevalidate("localities");
  revalidatePath("/admin/localities");
  revalidatePath("/properties");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// SEO locations (cities/towns/areas that get their own landing page)
// ---------------------------------------------------------------------------

export interface LocationInput {
  id?: string;
  name: string;
  slug?: string;
  state?: string;
  country?: string;
  type?: "city" | "town" | "area";
  parentSlug?: string;
  nearby?: string;
  areas?: string;
  isActive?: boolean;
}

export async function adminUpsertLocation(input: LocationInput): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const name = cleanText(input.name ?? "", 80);
  if (!name) return { ok: false, error: "Location ka naam zaroori hai." };

  const slug = cleanText(input.slug || name, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return { ok: false, error: "Slug banaya nahi ja saka." };

  const row = {
    name,
    slug,
    state: cleanText(input.state ?? "Haryana", 60),
    country: cleanText(input.country ?? "India", 60),
    type: input.type ?? "city",
    parent_slug: input.parentSlug ? cleanText(input.parentSlug, 100) : null,
    nearby: cleanText(input.nearby ?? "", 2000),
    areas: cleanText(input.areas ?? "", 2000),
    is_active: input.isActive ?? true,
  };

  const query = input.id
    ? guard.admin!.from("locations").update(row as never).eq("id", input.id)
    : guard.admin!.from("locations").insert(row as never);

  const { data, error } = await query.select("id").single();
  if (error) return { ok: false, error: error.message };

  const id = (data as { id: string }).id;
  await audit(guard.adminEmail!, "location.upsert", id, { slug });
  dbRevalidate("locations");
  revalidatePath("/admin/locations");

  return { ok: true, id };
}

export async function adminDeleteLocation(id: string): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const { error } = await guard.admin!.from("locations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "location.delete", id);
  dbRevalidate("locations");
  revalidatePath("/admin/locations");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reports / complaints
// ---------------------------------------------------------------------------

const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"];

export async function adminUpdateReportStatus(
  id: string,
  status: string
): Promise<AdminActionResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  if (!REPORT_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid report status." };
  }

  const { error } = await guard
    .admin!.from("reports")
    .update({ status } as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "report.status", id, { status });
  dbRevalidate("reports");
  revalidatePath("/admin/reports");

  return { ok: true };
}