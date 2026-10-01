"use server";

import { revalidatePath } from "next/cache";
import { guardAdminAction } from "@/lib/admin-access";
import { audit } from "@/lib/audit";
import { dbRevalidate } from "@/lib/revalidate";

export interface SettingsSaveResult {
  ok: boolean;
  error?: string;
  saved?: number;
}

/** Where each setting shows up, so the right page caches get dropped on save. */
const AFFECTED_PATHS: Record<string, string[]> = {
  site_name: ["/", "/about", "/contact"],
  site_tagline: ["/", "/properties"],
  contact_phone: ["/", "/contact", "/about"],
  contact_email: ["/", "/contact"],
  whatsapp_number: ["/", "/contact"],
  contact_address: ["/contact"],
  support_hours: ["/contact"],
  hero_title: ["/"],
  hero_subtitle: ["/"],
  about_intro: ["/about"],
  about_body: ["/about"],
  footer_note: ["/"],
  social_instagram: ["/"],
  social_facebook: ["/"],
  social_youtube: ["/"],
};

function revalidateAffected(keys: string[]) {
  const paths = new Set<string>(["/admin/content"]);
  for (const key of keys) {
    for (const path of AFFECTED_PATHS[key] ?? []) paths.add(path);
  }
  for (const path of paths) revalidatePath(path);
}

/**
 * Saves the content form. Only keys that already exist in site_settings are
 * written, so a crafted POST cannot invent new settings, and unchanged values are
 * skipped so we do not churn `updated_at` or the audit log on every publish.
 */
export async function adminSaveSettings(
  values: Record<string, string>
): Promise<SettingsSaveResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const admin = guard.admin!;
  const { data: current, error: readError } = await admin
    .from("site_settings")
    .select("key, value");
  if (readError) return { ok: false, error: readError.message };

  const currentValues = new Map(
    (current ?? []).map((row) => [row.key, row.value ?? ""] as const)
  );

  const changed: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!currentValues.has(key)) continue;
    const next = String(raw ?? "").trim();
    if (currentValues.get(key) !== next) changed[key] = next;
  }

  const keys = Object.keys(changed);
  if (keys.length === 0) return { ok: true, saved: 0 };

  const rows = keys.map((key) => ({
    key,
    value: changed[key]!,
    updated_by: guard.adminId!,
  }));

  const { error } = await admin
    .from("site_settings")
    .upsert(rows as never, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "settings.update", "site_settings", { keys });
  dbRevalidate("site_settings");
  revalidateAffected(keys);

  return { ok: true, saved: rows.length };
}

/** Puts a single setting back to the value seeded by the migration. */
export async function adminResetSetting(key: string): Promise<SettingsSaveResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  if (!AFFECTED_PATHS[key]) return { ok: false, error: "Unknown setting." };

  const admin = guard.admin!;
  const { data, error: readError } = await admin
    .from("site_settings")
    .select("default_value")
    .eq("key", key)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (data?.default_value === null || data?.default_value === undefined) {
    return { ok: false, error: "Is setting ka default value database me nahi hai." };
  }

  const { error } = await admin
    .from("site_settings")
    .update({ value: data.default_value, updated_by: guard.adminId! } as never)
    .eq("key", key);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "settings.reset", key, { to: "default" });
  dbRevalidate("site_settings");
  revalidateAffected([key]);

  return { ok: true, saved: 1 };
}

/** Re-drops the page caches without changing anything, for the Publish button. */
export async function adminPublishSettings(): Promise<SettingsSaveResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  dbRevalidate("site_settings");
  for (const paths of Object.values(AFFECTED_PATHS)) {
    for (const path of paths) revalidatePath(path);
  }
  revalidatePath("/admin/content");
  await audit(guard.adminEmail!, "settings.publish", "site_settings");

  return { ok: true, saved: 0 };
}
