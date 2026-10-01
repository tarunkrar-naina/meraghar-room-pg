"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MfaResult = {
  ok: boolean;
  error?: string;
  /** QR code (data URL) + secret, returned once at enrolment time. */
  qrCode?: string;
  secret?: string;
  factorId?: string;
};

const ENROLL_KEY = "mg_mfa_enroll";
const CHALLENGE_KEY = "mg_mfa_challenge";
const FACTOR_KEY = "mg_mfa_factor";
/** Short-lived, http-only cookies holding the in-progress TOTP state. */
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 10,
} as const;

/** True when the signed-in account already has a verified authenticator. */
export async function mfaHasVerifiedFactor(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  return (data?.totp?.length ?? 0) > 0;
}

/**
 * Starts TOTP enrolment and returns the QR code + shared secret. The factor id
 * is kept in an httpOnly cookie until `mfaVerifyEnrollment` confirms the first
 * code, so the secret never has to be trusted back from the browser.
 */
export async function mfaEnroll(): Promise<MfaResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    if (error) return { ok: false, error: error.message };

    const store = await cookies();
    store.set(ENROLL_KEY, data.id, COOKIE_OPTS);

    return {
      ok: true,
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Confirms the enrolment by checking the first code from the authenticator. */
export async function mfaVerifyEnrollment(code: string): Promise<MfaResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const store = await cookies();
    const factorId = store.get(ENROLL_KEY)?.value;
    if (!factorId) return { ok: false, error: "Enrolment expired. Please start again." };

    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      return { ok: false, error: "Enter the 6-digit code from your app." };
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: trimmed,
    });
    if (error) return { ok: false, error: error.message };

    store.delete(ENROLL_KEY);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Opens a TOTP challenge for the first verified factor on the account. */
export async function mfaStartChallenge(): Promise<MfaResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { data, error } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.[0];
    if (error || !factor) {
      return { ok: false, error: "No authenticator is set up on this account yet." };
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError) return { ok: false, error: challengeError.message };

    const store = await cookies();
    store.set(FACTOR_KEY, factor.id, COOKIE_OPTS);
    store.set(CHALLENGE_KEY, challenge.id, COOKIE_OPTS);

    return { ok: true, factorId: factor.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Completes the login challenge, lifting the session to aal2. */
export async function mfaVerifyChallenge(code: string): Promise<MfaResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const store = await cookies();
    const factorId = store.get(FACTOR_KEY)?.value;
    const challengeId = store.get(CHALLENGE_KEY)?.value;
    if (!factorId || !challengeId) {
      return { ok: false, error: "Challenge expired. Please log in again." };
    }

    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      return { ok: false, error: "Enter the 6-digit code from your app." };
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: trimmed,
    });
    if (error) return { ok: false, error: error.message };

    store.delete(FACTOR_KEY);
    store.delete(CHALLENGE_KEY);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/** Removes the authenticator from the account (recovery hatch). */
export async function mfaUnenrollAll(): Promise<MfaResult> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return { ok: false, error: error.message };

    for (const factor of data?.totp ?? []) {
      const { error: removeError } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (removeError) return { ok: false, error: removeError.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}