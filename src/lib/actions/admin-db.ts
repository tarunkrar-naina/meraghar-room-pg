"use server";

import { revalidatePath } from "next/cache";
import { guardAdminAction } from "@/lib/admin-access";
import { DB_TABLES, getTableSpec, selectColumns } from "@/lib/db-browser";
import { audit } from "@/lib/audit";
import { dbRevalidate } from "@/lib/revalidate";

export type DbResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

const MAX_PAGE_SIZE = 200;

/** A PostgreSQL scalar arriving from a form field. */
type Scalar = string | number | boolean | null;

function coerceScalar(value: unknown): Scalar {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  const raw = String(value);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

export interface DbTableSummary {
  name: string;
  label: string;
  blurb: string;
  rows: number | null;
}

export interface DbColumn {
  name: string;
  type: string;
  editable: boolean;
}

export interface DbRowsPayload {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  pk: string;
  titleColumns: string[];
  columns: DbColumn[];
}

export interface DbRowsFailure {
  error: string;
}

/**
 * The Database Browser walks a fixed allowlist of table names, so the runtime is
 * safe - but TypeScript cannot see that when the relation is a `string`. This
 * minimal untyped view lets those queries keep working while every other admin
 * query stays fully typed.
 */
interface Row {
  [column: string]: unknown;
}

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
}

interface QueryBuilder {
  or(filters: string): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  range(from: number, to: number): PromiseLike<QueryResult>;
  single(): PromiseLike<QueryResult>;
  select(columns?: string): QueryBuilder;
  limit(count: number): QueryBuilder;
  then<T>(onValue: (value: QueryResult) => T): PromiseLike<T>;
}

interface DynamicTable {
  select(columns: string, options?: { count?: "exact" }): QueryBuilder;
  update(values: Record<string, unknown>): QueryBuilder;
  insert(values: Record<string, unknown>): QueryBuilder;
  delete(): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
}

function rows(client: { from: (relation: string) => unknown }, name: string): DynamicTable {
  return (client as unknown as { from: (relation: string) => DynamicTable }).from(name);
}

/** Table list + row counts, so the sidebar renders in one round trip. */
export async function dbFetchTables(): Promise<DbTableSummary[]> {
  const guard = await guardAdminAction();
  if (!guard.ok) return [];

  const summaries = DB_TABLES.map((t) => ({
    name: t.name,
    label: t.label,
    blurb: t.blurb,
    rows: null as number | null,
  }));

  // get_table_row_counts() only exists once the admin migration has been applied.
  const { data, error } = await guard.admin!.rpc("get_table_row_counts" as never);

  if (error || !Array.isArray(data)) return summaries;

  const counts = new Map<string, number>();
  for (const row of data as unknown as { table_name: string; row_count: number }[]) {
    counts.set(row.table_name, Number(row.row_count));
  }
  return summaries.map((s) => ({ ...s, rows: counts.get(s.name) ?? null }));
}

/** Paginated rows for one table plus inferred column metadata. */
export async function dbFetchRows(
  table: string,
  page: number,
  pageSize: number,
  search?: string
): Promise<DbRowsPayload | DbRowsFailure> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { error: guard.error! };

  const spec = getTableSpec(table);
  if (!spec) return { error: "Unknown table." };

  const admin = guard.admin!;
  const size = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const current = Math.max(1, page);
  const from = (current - 1) * size;

  let builder = rows(admin, spec.name).select(selectColumns(spec), { count: "exact" });

  const term = search?.trim();
  if (term && spec.titleColumns.length > 0) {
    const pattern = term.replace(/[%,()]/g, "");
    const filters = spec.titleColumns
      .filter((c) => c !== "key")
      .map((c) => `${c}.ilike.%${pattern}%`)
      .join(",");
    if (filters) builder = builder.or(filters);
  }

  const { data, count, error } = await builder
    .order(spec.orderBy, { ascending: spec.ascending })
    .range(from, from + size - 1);

  if (error) return { error: error.message };

  const list = (data ?? []) as Row[];
  const columnNames =
    list.length > 0
      ? Object.keys(list[0]!)
      : [...new Set([...spec.titleColumns, ...spec.editable])];

  return {
    rows: list,
    total: count ?? 0,
    page: current,
    pageSize: size,
    pk: spec.pk,
    titleColumns: spec.titleColumns,
    columns: columnNames.map((name) => ({
      name,
      type: inferType(list, name),
      editable: spec.editable.includes(name),
    })),
  };
}

function inferType(list: Row[], column: string): string {
  for (const row of list) {
    const value = row[column];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) return "array";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (/^\d{4}-\d{2}-\d{2}T/.test(String(value))) return "timestamp";
    return "text";
  }
  return "text";
}

/** Saves one cell edit. Only allowlisted columns are accepted. */
export async function dbUpdateRow(
  table: string,
  pkValue: string,
  column: string,
  value: unknown
): Promise<DbResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const spec = getTableSpec(table);
  if (!spec) return { ok: false, error: "Unknown table." };
  if (!spec.editable.includes(column)) {
    return { ok: false, error: `The "${column}" column cannot be edited from here.` };
  }

  const { error } = await rows(guard.admin!, spec.name)
    .update({ [column]: coerceScalar(value) })
    .eq(spec.pk, pkValue);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "db.update_row", `${table}:${pkValue}`, { column, value });
  dbRevalidate(table);
  revalidatePath("/admin/database");
  return { ok: true };
}

/** Deletes one row by primary key. */
export async function dbDeleteRow(table: string, pkValue: string): Promise<DbResult> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const spec = getTableSpec(table);
  if (!spec) return { ok: false, error: "Unknown table." };

  const { error } = await rows(guard.admin!, spec.name).delete().eq(spec.pk, pkValue);
  if (error) return { ok: false, error: error.message };

  await audit(guard.adminEmail!, "db.delete_row", `${table}:${pkValue}`);
  dbRevalidate(table);
  revalidatePath("/admin/database");
  return { ok: true };
}

/** Inserts a row. Key columns and read-only columns are ignored. */
export async function dbInsertRow(
  table: string,
  values: Record<string, string>
): Promise<DbResult<{ pk: string }>> {
  const guard = await guardAdminAction();
  if (!guard.ok) return { ok: false, error: guard.error! };

  const spec = getTableSpec(table);
  if (!spec) return { ok: false, error: "Unknown table." };

  const payload: Record<string, Scalar> = {};
  for (const [column, raw] of Object.entries(values)) {
    if (column === spec.pk) continue;
    if (!spec.editable.includes(column)) continue;
    payload[column] = coerceScalar(raw);
  }
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "Nothing to save - fill at least one field." };
  }

  const { data, error } = await rows(guard.admin!, spec.name)
    .insert(payload as Record<string, unknown>)
    .select(spec.pk)
    .single();
  if (error) return { ok: false, error: error.message };

  const pk = String(((data ?? null) as Row | null)?.[spec.pk] ?? "");
  await audit(guard.adminEmail!, "db.insert_row", `${table}:${pk}`);
  dbRevalidate(table);
  revalidatePath("/admin/database");
  return { ok: true, data: { pk } };
}