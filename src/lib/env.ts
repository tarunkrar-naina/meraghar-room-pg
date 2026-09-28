const isEmpty = (value: string | undefined) => !value || value.trim().length === 0;

/**
 * Public (browser-safe) configuration. Returns null when the required
 * Supabase values are missing so the app can degrade gracefully
 * (e.g. during local development before env vars are configured).
 */
export function getPublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const isSupabaseConfigured = !isEmpty(supabaseUrl) && !isEmpty(supabaseAnonKey);

  return {
    supabaseUrl: supabaseUrl ?? "",
    supabaseAnonKey: supabaseAnonKey ?? "",
    isSupabaseConfigured,
    siteUrl,
    supabaseBucket: "property-images",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    hasGoogleMapsApiKey: !isEmpty(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
    googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "",
    bingSiteVerification: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "",
  };
}

/** Server-only configuration (service role key must never reach the browser). */
export function getServerEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isSupabaseConfigured = !isEmpty(supabaseUrl) && !isEmpty(supabaseAnonKey);

  return {
    supabaseUrl: supabaseUrl ?? "",
    supabaseAnonKey: supabaseAnonKey ?? "",
    serviceRoleKey: serviceRoleKey ?? "",
    isSupabaseConfigured,
    hasServiceRoleKey: !isEmpty(serviceRoleKey),
    supabaseBucket: "property-images",
  };
}