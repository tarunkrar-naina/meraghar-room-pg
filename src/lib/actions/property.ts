"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { cleanText, propertySlug } from "@/lib/utils";
import { validatePropertyForm } from "@/lib/validation";
import type { PropertyFormValues } from "@/types";
import type { Database } from "@/types/database";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];

export type ActionResult = { ok: boolean; error?: string; propertyId?: string };

function toValues(data: Record<string, unknown>): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.map(String);
    else if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

export async function createProperty(input: PropertyFormValues, imageUrls: string[]): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Please login to post a property." };

  const values = toValues(input as unknown as Record<string, unknown>);
  const errors = validatePropertyForm(values);
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: Object.values(errors)[0] };
  }

  if (imageUrls.length === 0) {
    return { ok: false, error: "At least one property image is required." };
  }
  if (imageUrls.length > 10) {
    return { ok: false, error: "Maximum 10 images allowed." };
  }

  const sanitized: Record<string, unknown> = {
    title: cleanText(String(values.title), 80),
    description: cleanText(String(values.description), 5000),
    purpose: values.purpose,
    property_type: values.property_type,
    city: cleanText(String(values.city), 40),
    locality: cleanText(String(values.locality), 60),
    address: cleanText(String(values.address), 200),
    pincode: cleanText(String(values.pincode), 6),
    price: Number(values.price),
    rent_period: values.rent_period,
    security_deposit: values.security_deposit ? Number(values.security_deposit) : null,
    bhk: values.bhk ? Number(values.bhk) : null,
    bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
    furnishing: values.furnishing,
    area_sqft: values.area_sqft ? Number(values.area_sqft) : null,
    available_from: values.available_from || null,
    latitude: values.latitude && values.latitude !== "0" ? Number(values.latitude) : null,
    longitude: values.longitude && values.longitude !== "0" ? Number(values.longitude) : null,
    amenities: Array.isArray(values.amenities) ? values.amenities.slice(0, 20) : [],
    status: "approved",
  };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const insertPayload = { ...sanitized, owner_id: user.id } as unknown as PropertyInsert;

  const { data, error } = await supabase
    .from("properties")
    .insert(insertPayload)
    .select("id, title")
    .single();

  if (error) return { ok: false, error: error.message };

  const slug = propertySlug({ title: data.title, id: data.id });
  await supabase.from("properties").update({ slug }).eq("id", data.id);

  if (imageUrls.length) {
    const { error: imgError } = await supabase.from("property_images").insert(
      imageUrls.map((url, i) => ({
        property_id: data.id,
        image_url: url,
        display_order: i,
      }))
    );
    if (imgError) return { ok: false, error: imgError.message, propertyId: data.id };
  }

  revalidatePath("/", "layout");
  revalidatePath("/properties/");
  revalidatePath("/dashboard/");
  return { ok: true, propertyId: data.id };
}

export async function updateProperty(
  id: string,
  input: PropertyFormValues,
  imageUrls: string[]
): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Please login to edit a property." };

  const values = toValues(input as unknown as Record<string, unknown>);
  const errors = validatePropertyForm(values);
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: Object.values(errors)[0] };
  }
  if (imageUrls.length === 0) {
    return { ok: false, error: "At least one property image is required." };
  }

  const sanitized: Record<string, unknown> = {
    title: cleanText(String(values.title), 80),
    description: cleanText(String(values.description), 5000),
    purpose: values.purpose,
    property_type: values.property_type,
    city: cleanText(String(values.city), 40),
    locality: cleanText(String(values.locality), 60),
    address: cleanText(String(values.address), 200),
    pincode: cleanText(String(values.pincode), 6),
    price: Number(values.price),
    rent_period: values.rent_period,
    security_deposit: values.security_deposit ? Number(values.security_deposit) : null,
    bhk: values.bhk ? Number(values.bhk) : null,
    bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
    furnishing: values.furnishing,
    area_sqft: values.area_sqft ? Number(values.area_sqft) : null,
    available_from: values.available_from || null,
    latitude: values.latitude && values.latitude !== "0" ? Number(values.latitude) : null,
    longitude: values.longitude && values.longitude !== "0" ? Number(values.longitude) : null,
    amenities: Array.isArray(values.amenities) ? values.amenities.slice(0, 20) : [],
  };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const { data: updated, error } = await supabase
    .from("properties")
    .update(sanitized as unknown as PropertyInsert)
    .eq("id", id)
    .select("id, title, owner_id")
    .single();

  if (error) return { ok: false, error: error.message };
  if (updated.owner_id !== user.id && user.profile?.role !== "admin") {
    return { ok: false, error: "You can only edit your own properties." };
  }

  const slug = propertySlug({ title: updated.title, id: updated.id });
  await supabase.from("properties").update({ slug }).eq("id", id);

  await supabase.from("property_images").delete().eq("property_id", id);
  if (imageUrls.length) {
    const { error: imgError } = await supabase.from("property_images").insert(
      imageUrls.map((url, i) => ({
        property_id: id,
        image_url: url,
        display_order: i,
      }))
    );
    if (imgError) return { ok: false, error: imgError.message, propertyId: id };
  }

  // The listing's URL is /{city}/{category}/{slug}/ and its city/type may just
  // have changed, so refresh the whole public tree: index, browse page, the
  // detail route, the city hub and the category hub.
  revalidatePath("/", "layout");
  revalidatePath("/properties/");
  revalidatePath("/dashboard/");
  return { ok: true, propertyId: id };
}

export async function deleteProperty(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Please login." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/properties/");
  revalidatePath("/dashboard/");
  return { ok: true };
}

/** Owner marks their property rented/sold; admins can change any status. */
export async function setPropertyStatus(id: string, status: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Please login." };

  const allowed: PropertyInsert["status"][] = ["pending", "approved", "rejected", "rented", "sold"];
  if (!allowed.includes(status as PropertyInsert["status"])) return { ok: false, error: "Invalid status." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const { data: prop } = await supabase
    .from("properties")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!prop) return { ok: false, error: "Property not found." };

  const isOwner = prop.owner_id === user.id;
  const isAdmin = user.profile?.role === "admin";
  if (!isOwner && !isAdmin) return { ok: false, error: "Not allowed." };
  if (isOwner && !isAdmin && status !== "rented" && status !== "sold" && status !== "approved") {
    return { ok: false, error: "You can only mark this property as rented or sold." };
  }

  const { error } = await supabase
    .from("properties")
    .update({ status: status as PropertyInsert["status"] })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/properties/");
  revalidatePath("/dashboard/");
  revalidatePath("/admin/");
  return { ok: true };
}

/** Views counter for analytics - called from the details page render. */
export async function incrementPropertyViews(id: string): Promise<ActionResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.rpc as any)("increment_property_views", { property_id: id });
  return { ok: true };
}