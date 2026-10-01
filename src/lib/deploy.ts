/**
 * Triggers a production deployment of the website through the Vercel REST API.
 *
 * Everything here is server-only: the token never leaves the server, and every
 * entry point goes through `guardAdminAction()` first.
 */
import { getServerEnv } from "@/lib/env";
import { rateLimited } from "@/lib/rate-limit";
import type { DeployState } from "@/lib/deploy-status";

const API = "https://api.vercel.com";
const DEPLOY_COOLDOWN_MS = 60 * 1000;

export interface DeployRecord {
  localId: string;
  deploymentId: string;
  status: string;
  url: string | null;
  inspectorUrl: string | null;
  errorMessage: string | null;
  triggeredBy: string;
  createdAt: string;
}

interface VercelDeployment {
  id?: string;
  uid?: string;
  readyState?: string;
  status?: string;
  url?: string;
  inspectorUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  error?: { code?: string; message?: string };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Builds a query string, always scoping to the team when one is configured. */
function qs(teamId: string | undefined, extra = "") {
  const parts: string[] = [];
  if (extra) parts.push(extra);
  if (teamId) parts.push(`teamId=${encodeURIComponent(teamId)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export interface DeployConfigStatus {
  configured: boolean;
  missing: string[];
  projectId: string;
  gitOrg: string;
  gitRepo: string;
  gitRef: string;
}

/** What is still missing before the Deploy button can work. */
export function getDeployConfig(): DeployConfigStatus {
  const env = getServerEnv();
  const missing: string[] = [];
  if (!env.vercelToken) missing.push("VERCEL_TOKEN");
  if (!env.vercelProjectId) missing.push("VERCEL_PROJECT_ID");
  if (!env.vercelGitOrg || !env.vercelGitRepo) missing.push("VERCEL_GIT_ORG + VERCEL_GIT_REPO");

  return {
    configured: missing.length === 0,
    missing,
    projectId: env.vercelProjectId,
    gitOrg: env.vercelGitOrg,
    gitRepo: env.vercelGitRepo,
    gitRef: env.vercelGitRef,
  };
}

/**
 * Asks Vercel for a fresh production build of the configured git branch.
 * Returns the created deployment so the UI can poll its status.
 */
export async function triggerDeployment(
  adminEmail: string
): Promise<{ ok: true; record: DeployRecord } | { ok: false; error: string }> {
  const env = getServerEnv();
  const config = getDeployConfig();

  if (!config.configured) {
    return {
      ok: false,
      error: `Deploy is not configured yet. Add these to the Vercel project env vars: ${config.missing.join(", ")}`,
    };
  }

  if (rateLimited(`deploy:${adminEmail}`, 1, DEPLOY_COOLDOWN_MS)) {
    return {
      ok: false,
      error: "A deploy was just triggered. Wait a minute before starting another one.",
    };
  }

  const body = {
    name: env.vercelProjectId,
    project: env.vercelProjectId,
    target: "production",
    gitSource: {
      type: "github",
      org: env.vercelGitOrg,
      repo: env.vercelGitRepo,
      ref: env.vercelGitRef,
    },
    meta: { triggeredBy: "admin-panel", admin: adminEmail },
  };

  let response: Response;
  try {
    response = await fetch(
      `${API}/v13/deployments${qs(env.vercelTeamId, "forceNew=1&skipAutoDetectionConfirmation=1")}`,
      {
        method: "POST",
        headers: headers(env.vercelToken),
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
  } catch (err) {
    return {
      ok: false,
      error: `Could not reach Vercel: ${err instanceof Error ? err.message : "network error"}`,
    };
  }

  const payload = (await response.json().catch(() => null)) as VercelDeployment | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      payload?.errorMessage ??
      `Vercel returned ${response.status}.`;
    return { ok: false, error: message };
  }

  const deploymentId = payload?.uid ?? payload?.id ?? "";
  if (!deploymentId) {
    return { ok: false, error: "Vercel did not return a deployment id." };
  }

  return {
    ok: true,
    record: {
      localId: "",
      deploymentId,
      status: payload?.readyState ?? "QUEUED",
      url: payload?.url ? `https://${payload.url}` : null,
      inspectorUrl: payload?.inspectorUrl ?? null,
      errorMessage: payload?.error?.message ?? payload?.errorMessage ?? null,
      triggeredBy: adminEmail,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Current state of one deployment, used for polling. */
export async function fetchDeploymentStatus(
  deploymentId: string
): Promise<DeployState | null> {
  const env = getServerEnv();
  if (!env.vercelToken || !deploymentId) return null;

  try {
    const response = await fetch(
      `${API}/v13/deployments/${encodeURIComponent(deploymentId)}${qs(env.vercelTeamId)}`,
      { headers: headers(env.vercelToken), cache: "no-store" }
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as { readyState?: string; status?: string };
    return (payload.readyState ?? payload.status ?? null) as DeployState | null;
  } catch {
    return null;
  }
}

const TERMINAL: DeployState[] = ["READY", "ERROR", "CANCELED", "BLOCKED"];
export function isTerminal(state: DeployState | null): boolean {
  return state !== null && TERMINAL.includes(state);
}