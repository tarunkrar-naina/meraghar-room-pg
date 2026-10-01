import Link from "next/link";
import { ShieldAlert } from "lucide-react";

interface Props {
  title: string;
  message: string;
  /** Optional extra call-to-action, e.g. "dobara login karein". */
  actionHref?: string;
  actionLabel?: string;
}

/**
 * Shown instead of the admin panel when the visitor is not allowed in. Explains
 * the reason on screen - a silent redirect made a working panel look broken.
 */
export function AdminDenied({ title, message, actionHref, actionLabel }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-lg font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {actionLabel}
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Admin login
            </Link>
          )}
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            Website par wapas
          </Link>
        </div>
      </div>
    </div>
  );
}