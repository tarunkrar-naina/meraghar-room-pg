import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type SiteSettings = Record<string, string>;

export interface SettingField {
  key: string;
  label: string;
  group: string;
  value: string;
  defaultValue: string;
  multiline?: boolean;
  hint?: string;
}

export const SETTING_GROUPS: { id: string; label: string; blurb: string }[] = [
  { id: "general", label: "General", blurb: "Website ka naam aur tagline." },
  { id: "contact", label: "Contact", blurb: "Phone, WhatsApp aur email. Site par har jagah yahi dikhta hai." },
  { id: "pages", label: "Homepage & About", blurb: "Homepage ka hero text aur About page ke paragraphs." },
  { id: "footer", label: "Footer & Social", blurb: "Footer ka description aur social media links." },
];

const FIELD_META: Record<string, { multiline?: boolean; hint?: string }> = {
  hero_subtitle: { multiline: true },
  about_intro: { multiline: true },
  about_body: { multiline: true },
  footer_note: { multiline: true },
  whatsapp_number: {
    hint: "Country code ke saath, bina + ke. Jaise 918950056231",
  },
  contact_phone: { hint: "Sirf 10 digits. Jaise 8950056231" },
  social_instagram: { hint: "Poora URL, ya khaali chhod dein." },
  social_facebook: { hint: "Poora URL, ya khaali chhod dein." },
  social_youtube: { hint: "Poora URL, ya khaali chhod dein." },
};

/**
 * Every site setting as a plain object. Empty when Supabase is not configured or
 * the site_settings migration has not been applied yet, so pages keep rendering
 * with their hardcoded fallbacks.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const admin = createSupabaseAdminClient();
  if (!admin) return {};

  const { data, error } = await admin.from("site_settings").select("key, value");
  if (error) return {};

  const out: SiteSettings = {};
  for (const row of data ?? []) {
    out[row.key] = row.value ?? "";
  }
  return out;
});

/** Reads a single setting with a fallback, for use inside components. */
export async function getSetting(
  key: string,
  fallback = ""
): Promise<string> {
  const settings = await getSiteSettings();
  const value = settings[key];
  return value === undefined || value === "" ? fallback : value;
}

/** Settings rows for the admin form, grouped and ordered. */
export async function fetchSettingsForAdmin(): Promise<SettingField[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("site_settings")
    .select("key, value, default_value, label, \"group\"");
  if (error) return [];

  return (data ?? [])
    .map((row) => ({
      key: row.key,
      label: row.label || row.key,
      group: row.group,
      value: row.value ?? "",
      defaultValue: row.default_value ?? "",
      ...FIELD_META[row.key],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}