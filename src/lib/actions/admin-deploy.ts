"use server";

import { revalidatePath } from "next/cache";
import { guardAdminAction } from "@/lib/admin-access";
import { audit } from "@/lib/audit";
import {
  fetchDeploymentStatus,
  getDeployConfig,
  isTerminal,
  triggerDeployment,
} from "@/lib/deploy";
import type { DeployRecord } from "@/lib/deploy";
import type { DeployState } from "@/lib/deploy-status";

export interface DeployRow {
  id: string;
  deployment_id: string | null;
  status: string | null;
  url: string | null;
  inspector_url: string | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
}

export type DeployPanelData =
  | {
      ok: true;
      config: ReturnType<typeof getDeployConfig>;
      productionUrl: string;
      latest: DeployRecord | null;
      history: DeployRow[];
      migrationMissing: boolean;
    }
  | { ok: false; error: string };

/** Everything the Deploy page needs, in one server round trip. */
export async function loadDeployPanel(): Promise<DeployPanelData> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const admin = guard.admin!;
  const { data, error } = await admin
    .from("admin_deployments")
    .select("id, deployment_id, status, url, inspector_url, error_message, triggered_by, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const history = (data ?? []) as DeployRow[];
  // The migration has not been applied yet - the table read will error.
  const migrationMissing = Boolean(error);

  const latest = history[0];
  let latestRecord: DeployRecord | null = latest
    ? {
        localId: latest.id,
        deploymentId: latest.deployment_id ?? "",
        status: latest.status ?? "QUEUED",
        url: latest.url,
        inspectorUrl: latest.inspector_url,
        errorMessage: latest.error_message,
        triggeredBy: latest.triggered_by ?? "unknown",
        createdAt: latest.created_at,
      }
    : null;

  // Refresh a still-running build so the badge stays honest.
  if (latestRecord && latestRecord.deploymentId && !isTerminal(latestRecord.status as DeployState)) {
    const state = await fetchDeploymentStatus(latestRecord.deploymentId);
    if (state) {
      latestRecord = { ...latestRecord, status: state };
      await admin
        .from("admin_deployments")
        .update({ status: state } as never)
        .eq("id", latest.id);
    }
  }

  const config = getDeployConfig();

  return {
    ok: true,
    config,
    productionUrl: latestRecord?.url ?? "https://meraghar-room-pg.vercel.app",
    latest: latestRecord,
    history,
    migrationMissing,
  };
}

export async function adminTriggerDeploy(): Promise<
  { ok: true; record: DeployRecord } | { ok: false; error: string }
> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const result = await triggerDeployment(guard.adminEmail!);
  if (!result.ok) {
    await audit(guard.adminEmail!, "deploy.failed", "vercel", { error: result.error });
    return result;
  }

  const record = result.record;

  // History is best-effort: the deployment already started even if this fails.
  const { data } = await guard
    .admin!.from("admin_deployments")
    .insert({
      deployment_id: record.deploymentId,
      status: record.status,
      url: record.url,
      inspector_url: record.inspectorUrl,
      error_message: record.errorMessage,
      triggered_by: guard.adminEmail!,
    } as never)
    .select("id")
    .maybeSingle();

  record.localId = (data as { id?: string } | null)?.id ?? "";
  await audit(guard.adminEmail!, "deploy.triggered", record.deploymentId, {
    status: record.status,
  });

  revalidatePath("/admin/deploy");
  revalidatePath("/admin");
  return { ok: true, record };
}
