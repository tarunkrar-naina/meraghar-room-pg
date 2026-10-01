"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  KeyRound,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import {
  adminDeleteUser,
  adminResetUserPassword,
  adminSetUserBlocked,
  adminSetUserRole,
} from "@/lib/actions/admin";
import type { AdminUserRow } from "@/lib/admin-queries";

type Modal =
  | { kind: "reset"; user: AdminUserRow }
  | { kind: "delete"; user: AdminUserRow }
  | null;

export function AdminUsersTable({ rows }: { rows: AdminUserRow[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((u) =>
      [u.name, u.email, u.phone, u.role].some((field) =>
        (field ?? "").toLowerCase().includes(term)
      )
    );
  }, [rows, search]);

  function toggleRole(user: AdminUserRow) {
    const next = user.role === "admin" ? "user" : "admin";
    startTransition(async () => {
      const res = await adminSetUserRole(user.id, next);
      if (res.ok) {
        toast(`${user.email} ab ${next} hai`, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Role change nahi hua", "error");
      }
    });
  }

  function toggleBlock(user: AdminUserRow) {
    const next = !user.is_blocked;
    startTransition(async () => {
      const res = await adminSetUserBlocked(user.id, next);
      if (res.ok) {
        toast(next ? `${user.email} block ho gaya` : `${user.email} unblock ho gaya`, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Update nahi hua", "error");
      }
    });
  }

  function resetPassword() {
    if (modal?.kind !== "reset") return;
    const user = modal.user;
    startTransition(async () => {
      const res = await adminResetUserPassword(user.id, newPassword);
      if (res.ok) {
        toast(`${user.email} ka naya password set ho gaya`, "success");
        setModal(null);
        setNewPassword("");
      } else {
        toast(res.error ?? "Password set nahi hua", "error");
      }
    });
  }

  function deleteUser() {
    if (modal?.kind !== "delete") return;
    const user = modal.user;
    startTransition(async () => {
      const res = await adminDeleteUser(user.id);
      if (res.ok) {
        toast(`${user.email} delete ho gaya`, "success");
        setModal(null);
        setConfirmText("");
        router.refresh();
      } else {
        toast(res.error ?? "Delete nahi hua", "error");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{rows.length}</span> user
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email ya phone..."
            className="w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  {search ? "Is search ka koi user nahi mila." : "No users found."}
                </td>
              </tr>
            )}

            {filtered.map((user) => (
              <tr
                key={user.id}
                className={cn("hover:bg-slate-50/50", user.is_blocked && "bg-red-50/40")}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{user.name || "—"}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </td>
                <td className="px-4 py-3">{user.phone || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        user.role === "admin"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {user.role === "admin" && <ShieldCheck className="h-3.5 w-3.5" />}
                      {user.role}
                    </span>
                    {user.is_blocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        <Ban className="h-3.5 w-3.5" />
                        blocked
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      disabled={pending}
                      onClick={() => toggleRole(user)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      title={user.role === "admin" ? "Remove admin rights" : "Grant admin rights"}
                    >
                      {user.role === "admin" ? "Make user" : "Make admin"}
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => {
                        setNewPassword("");
                        setModal({ kind: "reset", user });
                      }}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      title="Set a new password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => toggleBlock(user)}
                      className={cn(
                        "rounded-lg p-1.5 disabled:opacity-50",
                        user.is_blocked
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      )}
                      title={user.is_blocked ? "Unblock user" : "Block user"}
                    >
                      {user.is_blocked ? (
                        <UserCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Ban className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => {
                        setConfirmText("");
                        setModal({ kind: "delete", user });
                      }}
                      className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      title="Delete user permanently"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.kind === "reset" && (
        <ModalShell
          title={`New password - ${modal.user.email}`}
          onClose={() => setModal(null)}
        >
          <p className="mb-3 text-sm text-slate-500">
            Ye password user ko abhi tak bataiye. Woh login ke baad badal sakta hai.
          </p>
          <input
            autoFocus
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Kam se kam 16 characters"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-slate-400">
            Length: {newPassword.length} (minimum 16)
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={resetPassword}
              disabled={pending || newPassword.length < 16}
              className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Setting..." : "Set password"}
            </button>
          </div>
        </ModalShell>
      )}

      {modal?.kind === "delete" && (
        <ModalShell title={`Delete ${modal.user.email}?`} onClose={() => setModal(null)}>
          <p className="mb-3 text-sm text-slate-600">
            Ye user ka login, profile aur uski saari properties permanently delete ho jayengi.
            {confirmText.trim().toUpperCase() === "DELETE" ? "" : " Confirm karne ke liye niche DELETE likhein."}
          </p>
          <input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-red-400 focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={deleteUser}
              disabled={pending || confirmText.trim().toUpperCase() !== "DELETE"}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}