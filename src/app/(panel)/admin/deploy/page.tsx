import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/admin-access";
import { loadDeployPanel } from "@/lib/actions/admin-deploy";
import { DeployPanel } from "@/components/admin/DeployPanel";

export const metadata: Metadata = { title: "Deploy" };

export const dynamic = "force-dynamic";

export default async function AdminDeployPage() {
  const guard = await assertAdmin();
  if (!guard.ok) notFound();

  const panel = await loadDeployPanel();
  if (!panel.ok) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <DeployPanel
        config={panel.config}
        productionUrl={panel.productionUrl}
        latest={panel.latest}
        history={panel.history}
        migrationMissing={panel.migrationMissing}
      />
    </div>
  );
}