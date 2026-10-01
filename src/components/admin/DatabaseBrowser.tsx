"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { dbDeleteRow, dbInsertRow, dbUpdateRow } from "@/lib/actions/admin-db";
import type { DbRowsPayload, DbTableSummary } from "@/lib/actions/admin-db";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface Props {
  tables: DbTableSummary[];
  activeTable: string;
  payload: DbRowsPayload | null;
  error: string | null;
  page: number;
  pageSize: number;
  search: string;
}

/** Renders a raw column value as something editable. */
function toInputValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DatabaseBrowser({
  tables,
  activeTable,
  payload,
  error,
  page,
  search,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [showInsert, setShowInsert] = useState(false);
  const [insertDraft, setInsertDraft] = useState<Record<string, string>>({});

  const totalPages = payload ? Math.max(1, Math.ceil(payload.total / payload.pageSize)) : 1;
  const editableColumns = payload?.columns.filter((c) => c.editable) ?? [];

  function go(nextPage: number) {
    const params = new URLSearchParams({ table: activeTable, page: String(nextPage) });
    if (search) params.set("q", search);
    router.push(`/admin/database?${params.toString()}`);
  }

  function refresh() {
    router.refresh();
  }

  function saveCell(row: Record<string, unknown>, column: string) {
    const pk = String(row[payload!.pk]);
    startTransition(async () => {
      const res = await dbUpdateRow(activeTable, pk, column, draft);
      if (res.ok) {
        toast(`${column} update ho gaya`, "success");
        setEditing(null);
        refresh();
      } else {
        toast(res.error ?? "Update fail", "error");
      }
    });
  }

  function saveCycle(row: Record<string, unknown>, column: string) {
    const pk = String(row[payload!.pk]);
    const next = row[column] === true ? false : true;
    startTransition(async () => {
      const res = await dbUpdateRow(activeTable, pk, column, next);
      if (res.ok) {
        refresh();
      } else {
        toast(res.error ?? "Update fail", "error");
      }
    });
  }

  function remove(pk: string) {
    startTransition(async () => {
      const res = await dbDeleteRow(activeTable, pk);
      if (res.ok) {
        toast("Row delete ho gayi", "success");
        setConfirming(null);
        refresh();
      } else {
        toast(res.error ?? "Delete fail", "error");
      }
    });
  }

  function insertRow() {
    startTransition(async () => {
      const res = await dbInsertRow(activeTable, insertDraft);
      if (res.ok) {
        toast("Nayi row add ho gayi", "success");
        setInsertDraft({});
        setShowInsert(false);
        refresh();
      } else {
        toast(res.error ?? "Insert fail", "error");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Database Browser</h2>
          <p className="text-sm text-slate-500">
            Koi bhi table, koi bhi row - seedha database me edit ya delete karein.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams({ table: activeTable, page: "1" });
              const term = (new FormData(e.currentTarget).get("q") as string)?.trim();
              if (term) params.set("q", term);
              router.push(`/admin/database?${params.toString()}`);
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Search..."
              className="w-48 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </form>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* Table picker */}
        <aside className="h-max rounded-2xl border border-slate-200 bg-white p-2">
          <p className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Tables
          </p>
          <nav className="flex flex-col gap-0.5">
            {tables.map((table) => (
              <button
                key={table.name}
                type="button"
                onClick={() => router.push(`/admin/database?table=${table.name}`)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  table.name === activeTable
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{table.label}</span>
                {table.rows !== null && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      table.name === activeTable ? "bg-white/25" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {table.rows}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Grid */}
        <section className="min-w-0">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Table read nahi ho payi</p>
                <p className="mt-1 break-words text-red-700">{error}</p>
                <p className="mt-2 text-xs text-red-600">
                  Agar yeh &quot;relation does not exist&quot; hai to database migration apply
                  karni hogi.
                </p>
              </div>
            </div>
          )}

          {payload && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">{payload.total}</span> row(s) · page{" "}
                  {payload.page} of {totalPages}
                </p>
                {editableColumns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowInsert((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    {showInsert ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showInsert ? "Band karein" : "Nayi row"}
                  </button>
                )}
              </div>

              {showInsert && editableColumns.length > 0 && (
                <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-teal-900">
                    Nayi row add karein - sirf{" "}
                    <span className="font-mono">{editableColumns.map((c) => c.name).join(", ")}</span>{" "}
                    columns
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {editableColumns.map((column) => (
                      <label key={column.name} className="text-xs font-medium text-teal-900">
                        {column.name}
                        <input
                          value={insertDraft[column.name] ?? ""}
                          onChange={(e) =>
                            setInsertDraft((d) => ({ ...d, [column.name]: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={insertRow}
                    disabled={pending}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Row add karein
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      {payload.columns.map((column) => (
                        <th key={column.name} className="whitespace-nowrap px-3 py-2.5">
                          <span className="flex items-center gap-1">
                            {column.name}
                            {column.editable && <Pencil className="h-2.5 w-2.5 text-teal-500" />}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right">Row</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={payload.columns.length + 1}
                          className="px-3 py-10 text-center text-slate-400"
                        >
                          {search ? "Is search ka koi row nahi mila." : "Table khali hai."}
                        </td>
                      </tr>
                    )}

                    {payload.rows.map((row) => {
                      const pk = String(row[payload.pk]);
                      return (
                        <tr key={pk} className="align-top hover:bg-slate-50/70">
                          {payload.columns.map((column) => {
                            const value = row[column.name];
                            const isPk = column.name === payload.pk;

                            // Booleans toggle straight away - fastest edit path.
                            if (column.type === "boolean") {
                              return (
                                <td key={column.name} className="px-3 py-2">
                                  {column.editable ? (
                                    <button
                                      type="button"
                                      onClick={() => saveCycle(row, column.name)}
                                      disabled={pending}
                                      className={cn(
                                        "rounded px-2 py-0.5 text-[11px] font-semibold",
                                        value === true
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-500"
                                      )}
                                    >
                                      {value === true ? "true" : "false"}
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">{toInputValue(value)}</span>
                                  )}
                                </td>
                              );
                            }

                            if (editing === `${pk}::${column.name}`) {
                              return (
                                <td key={column.name} className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      autoFocus
                                      value={draft}
                                      onChange={(e) => setDraft(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveCell(row, column.name);
                                        if (e.key === "Escape") setEditing(null);
                                      }}
                                      className="min-w-24 rounded border border-teal-400 px-1.5 py-1 text-xs focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => saveCell(row, column.name)}
                                      disabled={pending}
                                      className="rounded bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white"
                                    >
                                      {pending ? "..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditing(null)}
                                      className="rounded bg-slate-200 px-2 py-1 text-[11px] text-slate-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              );
                            }

                            const display = toInputValue(value);
                            return (
                              <td key={column.name} className="max-w-64 px-3 py-2">
                                {column.editable ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditing(`${pk}::${column.name}`);
                                      setDraft(display);
                                    }}
                                    disabled={isPk}
                                    title={isPk ? "Primary key cannot be edited" : "Click to edit"}
                                    className={cn(
                                      "block w-full truncate text-left hover:bg-teal-50 hover:text-teal-800",
                                      isPk && "cursor-not-allowed font-mono text-[10px] text-slate-400"
                                    )}
                                  >
                                    {display.length > 60 ? `${display.slice(0, 60)}…` : display || "—"}
                                  </button>
                                ) : (
                                  <span
                                    className="block max-w-64 truncate"
                                    title={display}
                                  >
                                    {display.length > 60 ? `${display.slice(0, 60)}…` : display || "—"}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {confirming === pk ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => remove(pk)}
                                  disabled={pending}
                                  className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white"
                                >
                                  {pending ? "..." : "Pakka delete"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirming(null)}
                                  className="rounded bg-slate-200 px-2 py-1 text-[11px] text-slate-600"
                                >
                                  Nahi
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirming(pk)}
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => go(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Pichle
                </button>
                <span className="text-sm text-slate-500">
                  Page {payload.page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => go(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
                >
                  Agle <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}