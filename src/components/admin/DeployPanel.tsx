"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Rocket, TriangleAlert } from "lucide-react";
import { adminTriggerDeploy } from "@/lib/actions/admin-deploy";
import type { DeployRow } from "@/lib/actions/admin-deploy";
import { DEPLOY_STATE_LABELS, DEPLOY_STATE_TONE, isTerminal } from "@/lib/deploy-status";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface Config {
  configured: boolean;
  missing: string[];
  projectId: string;
  gitOrg: string;
  gitRepo: string;
  gitRef: string;
}

interface Props {
  config: Config;
  productionUrl: string;
  latest: {
    localId: string;
    deploymentId: string;
    status: string;
    url: string | null;
    inspectorUrl: string | null;
    errorMessage: string | null;
    triggeredBy: string;
    createdAt: string;
  } | null;
  history: DeployRow[];
  migrationMissing: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DeployPanel({
  config,
  productionUrl,
  latest,
  history,
  migrationMissing,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const running = latest && !isTerminal(latest.status);

  function deploy() {
    startTransition(async () => {
      const result = await adminTriggerDeploy();
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast("Deploy trigger ho gaya - Vercel website bana raha hai", "success");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Deploy</h2>
        <p className="text-sm text-slate-500">
          Ek click me latest code Vercel par push karke live website update karein.
        </p>
      </div>

      {migrationMissing && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Deploy history save nahi hogi.</span> Ye table tab tak
            nahi milegi jab <code>20260925000000_admin_panel.sql</code> migration apply na ho.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Production</p>
            <a
              href={productionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-sm text-teal-700 hover:underline"
            >
              {productionUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <button
            type="button"
            onClick={deploy}
            disabled={pending || running || !config.configured}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Rocket className={cn("h-4 w-4", pending && "animate-bounce")} />
            {running ? "Build chal raha hai" : "Deploy to production"}
          </button>
        </div>

        {!config.configured && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Deploy button abhi ready nahi hai</p>
            <p className="mt-1">
              Vercel project ke env variables me ye add karein:{" "}
              <span className="font-mono font-semibold">{config.missing.join(", ")}</span>
            </p>
          </div>
        )}

        {config.configured && (
          <p className="mt-3 font-mono text-xs text-slate-400">
            {config.gitOrg}/{config.gitRepo} @ {config.gitRef} · project {config.projectId}
          </p>
        )}
      </section>

      {latest && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Latest build</p>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                DEPLOY_STATE_TONE[latest.status] ?? "bg-slate-100 text-slate-600"
              )}
            >
              {DEPLOY_STATE_LABELS[latest.status] ?? latest.status}
            </span>
          </div>

          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Triggered by</dt>
              <dd className="text-slate-700">{latest.triggeredBy}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Kab</dt>
              <dd className="text-slate-700">{formatDate(latest.createdAt)}</dd>
            </div>
            {latest.inspectorUrl && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-400">Build logs</dt>
                <dd>
                  <a
                    href={latest.inspectorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                  >
                    Vercel par dekhein <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
          </dl>

          {latest.errorMessage && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {latest.errorMessage}
            </p>
          )}

          {running && (
            <p className="mt-3 text-xs text-slate-500">
              Build chal raha hai. Status update karne ke liye page refresh karein.
            </p>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-slate-900">Purane deploys</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-slate-600">{formatDate(row.created_at)}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      DEPLOY_STATE_TONE[row.status ?? ""] ?? "bg-slate-100 text-slate-600"
                    )}
                  >
                    {DEPLOY_STATE_LABELS[row.status ?? ""] ?? row.status}
                  </span>
                  {row.url && (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-700 hover:underline"
                    >
                      open
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}