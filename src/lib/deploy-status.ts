/**
 * Deploy status helpers that are safe to import from client components.
 * Kept apart from `lib/deploy.ts`, which reads server-only environment secrets.
 */

export type DeployState =
  | "QUEUED"
  | "INITIALIZING"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED"
  | "BLOCKED";

export const DEPLOY_STATE_LABELS: Record<string, string> = {
  QUEUED: "Queue me hai",
  INITIALIZING: "Start ho raha hai",
  BUILDING: "Website ban rahi hai",
  READY: "Live ho gaya",
  ERROR: "Build fail",
  CANCELED: "Cancel ho gaya",
  BLOCKED: "Blocked",
};

export const DEPLOY_STATE_TONE: Record<string, string> = {
  QUEUED: "bg-slate-100 text-slate-600",
  INITIALIZING: "bg-blue-100 text-blue-700",
  BUILDING: "bg-blue-100 text-blue-700",
  READY: "bg-emerald-100 text-emerald-700",
  ERROR: "bg-red-100 text-red-700",
  CANCELED: "bg-slate-100 text-slate-500",
  BLOCKED: "bg-amber-100 text-amber-700",
};

const TERMINAL: DeployState[] = ["READY", "ERROR", "CANCELED", "BLOCKED"];

export function isTerminal(state: string | null | undefined): boolean {
  return state !== null && state !== undefined && TERMINAL.includes(state as DeployState);
}
