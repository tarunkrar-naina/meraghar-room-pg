import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
  profile: ProfileRow | null;
}

/** Returns the logged-in user + profile, or null when signed out / not configured. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // A blocked account keeps its Supabase session but must behave as signed out.
  if (profile?.is_blocked) return null;

  return { id: user.id, email: user.email ?? "", profile };
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const user = await getAuthUser();
  return user?.profile ?? null;
}

/** Redundant guard - pages that run behind this always have a session. */
export const requireUser = async (): Promise<AuthUser> => {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
};

/** Admin-only guard. Non-admins are bounced to the home page (customers have no dashboard). */
export const requireAdmin = async (): Promise<AuthUser> => {
  const user = await requireUser();
  if (user.profile?.role !== "admin") {
    redirect("/");
  }
  return user;
};

/** Where an admin should land after a successful login. */
export function adminHomePath(): string {
  return "/admin";
}

/** Returns the path the user should be sent to after login (defaults to /). */
export function defaultPostLoginPath(profile: ProfileRow | null, fallback: string | null): string {
  if (fallback?.startsWith("/") && !fallback.startsWith("/login")) return fallback;
  if (profile?.role === "admin") return "/admin";
  return "/";
}