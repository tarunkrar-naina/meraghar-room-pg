"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getPublicEnv, isAllowedAdminEmail } from "@/lib/env";
import { clearRateLimit, rateLimited } from "@/lib/rate-limit";

export type AuthActionResult = {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    created_at: string;
  } | null;
  error?: string;
  /** Set when signup succeeded but the address still needs confirming. */
  needsEmailConfirmation?: boolean;
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

/** Best-effort client IP so repeated failed logins can be throttled per caller. */
async function requestIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Sign in with Supabase Auth.
 *
 * The session cookie is written by `createSupabaseServerClient()`'s `setAll`
 * callback, so `getAuthUser()` picks the user up on the very next request.
 * Passwords are hashed by Supabase - nothing plaintext is stored or compared.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const throttleKey = `login:${await requestIp()}:${normalizedEmail}`;
  if (rateLimited(throttleKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
    return {
      ok: false,
      error: "Too many failed attempts. Please try again in 15 minutes.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    // Supabase returns the same generic message for unknown email and wrong
    // password, so nothing about account existence is leaked.
    return {
      ok: false,
      error: "Incorrect email or password. Please try again.",
    };
  }

  const user = data.user;
  // The limiter counts attempts, so a correct password has to clear the history
  // or five successful logins would look like five failures.
  clearRateLimit(throttleKey);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? normalizedEmail,
      name: (user.user_metadata?.name as string | undefined) ?? "",
      created_at: user.created_at ?? new Date().toISOString(),
    },
  };
}

/**
 * Admin-only variant of `signInWithEmail`.
 *
 * A successful password check is not enough for the panel: the address must be
 * on the ADMIN_EMAILS allowlist *and* the profiles row must say `admin`. Both
 * are checked server-side right after sign-in, and the session is torn down
 * immediately when they fail - so a normal user can never reach the 2FA prompt
 * or the admin pages from this form.
 */
export async function signInAdmin(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const result = await signInWithEmail(email, password);
  if (!result.ok) return result;

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const signedInEmail = result.user?.email ?? email.trim().toLowerCase();

  let allowed = isAllowedAdminEmail(signedInEmail);
  let roleIsAdmin = false;

  if (allowed && admin && result.user?.id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", result.user.id)
      .maybeSingle();
    roleIsAdmin = profile?.role === "admin";
    allowed = roleIsAdmin;
  }

  if (!allowed) {
    // The session is real but useless here - drop it before returning so the
    // browser cannot keep a signed-in non-admin around.
    await supabase?.auth.signOut();
    return {
      ok: false,
      error: roleIsAdmin
        ? "This account is not on the ADMIN_EMAILS allowlist."
        : "This account does not have admin access.",
    };
  }

  return result;
}

/**
 * Create a new account. Supabase Auth hashes the password; the existing
 * `on_auth_user_created` database trigger creates the matching `profiles` row.
 *
 * The role is never taken from user input - a new signup is always a `user`.
 * Admin access is granted only by the ADMIN_EMAILS allowlist.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!normalizedEmail || !password || !trimmedName) {
    return { ok: false, error: "Name, email and password are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: trimmedName,
        phone: phone?.trim() || undefined,
        role: "user",
      },
    },
  });

  if (error) {
    if (/already registered|already been registered|duplicate/i.test(error.message)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    return { ok: false, error: error.message };
  }

  // When email confirmation is enabled there is no session yet - the user must
  // confirm the address before they can log in.
  if (!data.session || !data.user) {
    return { ok: true, user: null, needsEmailConfirmation: true };
  }

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? normalizedEmail,
      name: trimmedName,
      created_at: data.user.created_at ?? new Date().toISOString(),
    },
  };
}

/** Ends the session and clears its cookies. */
export async function signOut(): Promise<AuthActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Queues a password-reset email that links to /update-password. */
export async function forgotPassword(email: string): Promise<AuthActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, error: "Email is required." };

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${getPublicEnv().siteUrl}/update-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Sets a new password for the currently logged-in user. */
export async function updatePassword(newPassword: string): Promise<AuthActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Signs an account out by email. Used by the admin guard to eject a signed-in
 * user whose address is not on the ADMIN_EMAILS allowlist.
 */
export async function revokeSession(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}