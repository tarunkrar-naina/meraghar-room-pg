/**
 * Fire-and-forget trail of admin actions. Never throws and never blocks the
 * calling action - a missing admin_audit_log table must not break the panel.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin-access";

export type AuditAction =
  | "property.create"
  | "property.update"
  | "property.delete"
  | "property.status"
  | "property.feature"
  | "property.verify"
  | "user.role"
  | "user.block"
  | "user.unblock"
  | "user.delete"
  | "user.password_reset"
  | "db.update_row"
  | "db.insert_row"
  | "db.delete_row"
  | "locality.create"
  | "locality.delete"
  | "location.upsert"
  | "location.delete"
  | "report.status"
  | "settings.update"
  | "settings.reset"
  | "settings.publish"
  | "deploy.triggered"
  | "deploy.failed";

export async function audit(
  adminEmail: string,
  action: AuditAction,
  target?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin || !adminEmail) return;

  try {
    await admin.from("admin_audit_log").insert({
      admin_email: adminEmail,
      action,
      target: target ?? null,
      details: details ?? null,
    });
  } catch {
    // Intentionally swallowed.
  }
}

export interface AuditRow {
  id: string;
  admin_email: string;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/** Most recent admin actions, newest first. Admin-gated. */
export async function fetchAuditLog(limit = 40): Promise<AuditRow[]> {
  const guard = await assertAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.admin
    .from("admin_audit_log")
    .select("id, admin_email, action, target, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];

  return (data ?? []) as AuditRow[];
}