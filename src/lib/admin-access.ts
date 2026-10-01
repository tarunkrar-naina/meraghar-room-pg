/**
 * Single source of truth for admin access.
 *
 * Every admin query and every admin server action calls `assertAdmin()` before
 * touching the service-role client. This matters because Next.js layouts do NOT
 * gate a route on their own (see the App Router auth guide), and because the
 * service-role key bypasses RLS entirely - so a missing check here would be a
 * full data leak.
 */
import { cache } from "react";
import { getAuthUser, type AuthUser } from "@/lib/auth";
import { isAllowedAdminEmail } from "@/lib/env";
import { getSessionAssuranceLevel, hasVerifiedFactor } from "@/lib/mfa";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface AdminGuardFailure {
  ok: false;
  reason: "signed_out" | "not_admin" | "not_configured" | "mfa_required";
  error: string;
}

export type AdminGuardResult = { ok: true; user: AuthUser; admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>> } | AdminGuardFailure;

/**
 * Deduplicated per request: repeated guards in a single render pass hit Supabase
 * once. Returns the signed-in admin together with a service-role client.
 */
export const assertAdmin = cache(async (): Promise<AdminGuardResult> => {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, reason: "signed_out", error: "You need to sign in first." };
  }

  // Three independent conditions must all hold:
  //   1. the profiles row says admin (granted by the DB),
  //   2. the address is still on the ADMIN_EMAILS allowlist (server env), and
  //   3. if the account has an authenticator enrolled, the session must have
  //      actually completed the second factor (aal2).
  // Removing an email from ADMIN_EMAILS revokes access on the next request even
  // if the database row still says admin.
  if (user.profile?.role !== "admin") {
    return {
      ok: false,
      reason: "not_admin",
      error: "This account is not an admin.",
    };
  }
  if (!isAllowedAdminEmail(user.email)) {
    return {
      ok: false,
      reason: "not_admin",
      error:
        "This account is not on the ADMIN_EMAILS allowlist. Add the address to ADMIN_EMAILS and redeploy.",
    };
  }

  // Password-only sessions must not reach the panel once a second factor exists,
  // otherwise closing the login tab would skip the authenticator prompt entirely.
  const [assurance, enrolled] = await Promise.all([
    getSessionAssuranceLevel(),
    hasVerifiedFactor(),
  ]);
  if (enrolled && assurance !== "aal2") {
    return {
      ok: false,
      reason: "mfa_required",
      error: "Two-factor authentication is incomplete. Sign in again to finish it.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      reason: "not_configured",
      error: "SUPABASE_SERVICE_ROLE_KEY is missing - admin data cannot be loaded.",
    };
  }

  return { ok: true, user, admin };
});

/**
 * Action-flavoured wrapper: returns `null` instead of throwing so callers can
 * return their own `{ ok: false, error }` shape.
 */
export async function guardAdminAction(): Promise<{
  ok: boolean;
  error?: string;
  admin?: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
  adminId?: string;
  adminEmail?: string;
}> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  return {
    ok: true,
    admin: guard.admin,
    adminId: guard.user.id,
    adminEmail: guard.user.email,
  };
}

/** True when the current session is a valid admin (no redirect, no throw). */
export async function isAdminSession(): Promise<boolean> {
  const guard = await assertAdmin();
  return guard.ok;
}