import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/admin-access";
import { dbFetchRows, dbFetchTables } from "@/lib/actions/admin-db";
import { getTableSpec } from "@/lib/db-browser";
import { DatabaseBrowser } from "@/components/admin/DatabaseBrowser";
import type { AppPageProps } from "@/types";

export const metadata: Metadata = { title: "Database Browser" };

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminDatabasePage(
  props: AppPageProps<Record<string, never>, { table?: string; page?: string; q?: string }>
) {
  const guard = await assertAdmin();
  if (!guard.ok) notFound();

  const searchParams = await props.searchParams;
  const requested = searchParams.table ?? "properties";
  const spec = getTableSpec(requested) ?? getTableSpec("properties")!;

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const search = searchParams.q ?? "";

  const [tables, result] = await Promise.all([
    dbFetchTables(),
    dbFetchRows(spec.name, page, PAGE_SIZE, search),
  ]);

  return (
    <DatabaseBrowser
      tables={tables}
      activeTable={spec.name}
      payload={"error" in result ? null : result}
      error={"error" in result ? result.error : null}
      page={page}
      pageSize={PAGE_SIZE}
      search={search}
    />
  );
}