"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 sm:px-3"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium",
            p === page
              ? "bg-teal-600 text-white"
              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 sm:px-3"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}