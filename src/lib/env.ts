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
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

  const isSupabaseConfigured = !isEmpty(supabaseUrl) && !isEmpty(supabaseAnonKey);

  return {
    supabaseUrl: supabaseUrl ?? "",
    supabaseAnonKey: supabaseAnonKey ?? "",
    isSupabaseConfigured,
    siteUrl,
    supabaseBucket: "property-images",
    adminEmails,
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
    adminEmails: parseAdminEmails(process.env.ADMIN_EMAILS),
    vercelToken: process.env.VERCEL_TOKEN ?? "",
    vercelProjectId: process.env.VERCEL_PROJECT_ID ?? "",
    vercelTeamId: process.env.VERCEL_TEAM_ID ?? "",
    vercelGitOrg: process.env.VERCEL_GIT_ORG ?? "",
    vercelGitRepo: process.env.VERCEL_GIT_REPO ?? "",
    vercelGitRef: process.env.VERCEL_GIT_REF ?? "main",
    hasVercelConfig:
      !isEmpty(process.env.VERCEL_TOKEN) && !isEmpty(process.env.VERCEL_PROJECT_ID),
  };
}

/** Splits the comma-separated ADMIN_EMAILS list into normalised addresses. */
function parseAdminEmails(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Defence-in-depth admin allowlist. The database `profiles.role` column is the
 * source of truth; this list makes sure only explicitly configured addresses can
 * ever be *promoted* to admin, and that a promoted admin's email is still
 * present here on every request.
 */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getServerEnv().adminEmails;
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}