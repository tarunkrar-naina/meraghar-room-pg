"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { adminPublishSettings, adminResetSetting, adminSaveSettings } from "@/lib/actions/admin-settings";
import type { SettingField } from "@/lib/site-settings";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface Props {
  fields: SettingField[];
  groups: { id: string; label: string; blurb: string }[];
}

export function ContentEditor({ fields, groups }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, string>>({});

  const byGroup = useMemo(() => {
    const map = new Map<string, SettingField[]>();
    for (const field of fields) {
      const list = map.get(field.group) ?? [];
      list.push(field);
      map.set(field.group, list);
    }
    return map;
  }, [fields]);

  /** Current value = saved value overridden by any unsaved edit. */
  const valueOf = (field: SettingField) => dirty[field.key] ?? field.value;

  function save() {
    const values: Record<string, string> = {};
    for (const field of fields) values[field.key] = valueOf(field);

    startTransition(async () => {
      const result = await adminSaveSettings(values);
      if (!result.ok) {
        toast(result.error ?? "Save fail", "error");
        return;
      }
      setDirty({});
      if (result.saved) {
        toast(`${result.saved} change publish ho gaya`, "success");
      } else {
        toast("Koi naya change nahi tha", "info");
      }
      router.refresh();
    });
  }

  function resetField(field: SettingField) {
    setResetting(field.key);
    startTransition(async () => {
      const result = await adminResetSetting(field.key);
      setResetting(null);
      if (!result.ok) {
        toast(result.error ?? "Reset fail", "error");
        return;
      }
      setDirty((d) => {
        const next = { ...d };
        delete next[field.key];
        return next;
      });
      toast(`${field.label} default par wapas aa gaya`, "success");
      router.refresh();
    });
  }

  function republish() {
    startTransition(async () => {
      const result = await adminPublishSettings();
      if (!result.ok) {
        toast(result.error ?? "Publish fail", "error");
        return;
      }
      toast("Site cache refresh ho gaya", "success");
      router.refresh();
    });
  }

  const changedCount = Object.keys(dirty).length;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-1 py-3 backdrop-blur">
        <p className="text-sm text-slate-600">
          {changedCount > 0 ? (
            <span className="font-semibold text-amber-700">
              {changedCount} unsaved change{changedCount > 1 ? "s" : ""}
            </span>
          ) : (
            "Sab kuch saved hai"
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={republish}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh cache
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || changedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publish karein
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => {
          const list = byGroup.get(group.id);
          if (!list || list.length === 0) return null;

          return (
            <section key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900">{group.label}</h3>
              <p className="mb-4 text-sm text-slate-500">{group.blurb}</p>

              <div className="space-y-4">
                {list.map((field) => {
                  const current = valueOf(field);
                  const edited = current !== field.value;

                  return (
                    <div key={field.key}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label
                          htmlFor={`setting-${field.key}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          {field.label}
                        </label>
                        {edited && (
                          <button
                            type="button"
                            onClick={() =>
                              setDirty((d) => {
                                const next = { ...d };
                                delete next[field.key];
                                return next;
                              })
                            }
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            undo
                          </button>
                        )}
                      </div>

                      {field.multiline ? (
                        <textarea
                          id={`setting-${field.key}`}
                          rows={4}
                          value={current}
                          onChange={(e) =>
                            setDirty((d) => ({ ...d, [field.key]: e.target.value }))
                          }
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none",
                            edited
                              ? "border-amber-400 bg-amber-50/40"
                              : "border-slate-300 focus:border-teal-500"
                          )}
                        />
                      ) : (
                        <input
                          id={`setting-${field.key}`}
                          type="text"
                          value={current}
                          onChange={(e) =>
                            setDirty((d) => ({ ...d, [field.key]: e.target.value }))
                          }
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none",
                            edited
                              ? "border-amber-400 bg-amber-50/40"
                              : "border-slate-300 focus:border-teal-500"
                          )}
                        />
                      )}

                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">
                          {field.hint ?? <span className="font-mono">{field.key}</span>}
                        </p>
                        {field.defaultValue !== "" && field.defaultValue !== field.value && (
                          <button
                            type="button"
                            onClick={() => resetField(field)}
                            disabled={pending || resetting === field.key}
                            className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500 hover:text-teal-700 disabled:opacity-50"
                          >
                            {resetting === field.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}