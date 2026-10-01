/**
 * Server-side MFA introspection used by the admin guard.
 *
 * Lives outside `lib/actions/mfa.ts` on purpose: that file is a `"use server"`
 * module (only async exports allowed), while this helper is also called during
 * layout/page rendering, not just from a form action.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AssuranceLevel = "aal1" | "aal2" | null;

/**
 * The assurance level of the *current* session cookie.
 * - `aal2` = password + authenticator app
 * - `aal1` = password only
 * - `null`  = signed out or MFA unavailable on the project
 */
export async function getSessionAssuranceLevel(): Promise<AssuranceLevel> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return null;

  return (data.currentLevel ?? data.nextLevel ?? null) as AssuranceLevel;
}

/** True when the account has at least one enrolled TOTP authenticator. */
export async function hasVerifiedFactor(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;

  return (data.totp?.length ?? 0) > 0;
}
