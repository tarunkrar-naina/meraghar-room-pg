"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

export type AuthActionResult = {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    created_at: string;
  } | null;
  error?: string;
};

/**
 * Sign out the current session. Because auth here is table-based (no
 * Supabase Auth session/JWT), signing out simply returns a success result —
 * the client removes auth state in the browser. Returns `{ ok: true }` on
 * success, otherwise `{ ok: false, error }`.
 */
export async function signOut(): Promise<AuthActionResult> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error:
          "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local.",
      };
    }

    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Request a password-reset email. Requires Supabase Auth (email recovery to
 * be enabled on the project). Returns `{ ok: true }` when the reset email
 * was queued, otherwise `{ ok: false, error }`.
 */
export async function forgotPassword(email: string): Promise<AuthActionResult> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: false, error: "Email is required." };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${getPublicEnv().siteUrl}/update-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Update the password for the logged-in user (used after visiting the
 * password-recovery link). Requires an active Supabase Auth session.
 * Returns `{ ok: true }` on success, otherwise `{ ok: false, error }`.
 */
export async function updatePassword(newPassword: string): Promise<AuthActionResult> {
  try {
    const supabase = createSupabaseClient();
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
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Shape of a row in the `users` table. */
type UserRow = {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: string;
};

/**
 * Creates a plain Supabase client bound to the *public* anon key.
 * Server-only (never import into a Client Component). Uses only the two
 * env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 * Returns null when Supabase is not configured.
 */
function createSupabaseClient(): SupabaseClient | null {
  const env = getPublicEnv();
  if (!env.isSupabaseConfigured) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

/**
 * Sign in: look up the user by email in the `users` table, then verify the
 * password. Returns `{ ok: true, user }` on success, otherwise
 * `{ ok: false, error }`.
 *
 * NOTE: Your `users` table currently stores plaintext passwords (test data:
 * `password123`). This compares plaintext values so it works out of the box.
 * For production, ALWAYS store hashed passwords (e.g. bcrypt/argon2) and
 * compare the hash here instead of storing raw passwords.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthActionResult> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error:
          "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { ok: false, error: "Email and password are required." };
    }

    // Find the user by email.
    const { data, error } = await supabase
      .from("users")
      .select("id,email,password,name,created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error:
          error.code === "42501"
            ? "Access denied by row-level security on the `users` table."
            : error.message,
      };
    }

    if (!data) {
      return { ok: false, error: "No account found with this email." };
    }

    const user = data as unknown as UserRow;

    // Plaintext password match (see security note above).
    if (user.password !== password) {
      return { ok: false, error: "Incorrect password. Please try again." };
    }

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Sign up: reject duplicate emails, then insert a new row into the `users`
 * table. Returns `{ ok: true, user }` on success, otherwise
 * `{ ok: false, error }`.
 *
 * `phone` is accepted for backwards compatibility with the existing
 * SignupForm, but is not persisted (the `users` table has no phone column).
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  _phone?: string
): Promise<AuthActionResult> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error:
          "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local.",
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

    // 1) Duplicate email check.
    const { data: existing, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      return {
        ok: false,
        error:
          lookupError.code === "42501"
            ? "Access denied by row-level security on the `users` table."
            : lookupError.message,
      };
    }

    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    // 2) Insert the new user. `created_at` defaults to now() in the DB.
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert({
        email: normalizedEmail,
        password,
        name: trimmedName,
      })
      .select("id,email,password,name,created_at")
      .single();

    if (insertError) {
      return {
        ok: false,
        error:
          insertError.code === "42501"
            ? "Access denied by row-level security on the `users` table."
            : insertError.message,
      };
    }

    const user = created as unknown as UserRow;

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
