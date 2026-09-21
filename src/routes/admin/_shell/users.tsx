/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, KeyRound, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, type PlatformRole, type PlatformUser } from "@/lib/api";
import { StatusBadge } from "@/components/admin/Badges";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_shell/users")({
  head: () => ({ meta: [{ title: "Users — MediOps" }] }),
  component: UsersPage,
});

const tabs = ["Hospital Admins", "Support Staff", "Super Admins"] as const;

const roleMap: Record<(typeof tabs)[number], PlatformUser["role"]> = {
  "Hospital Admins": "PLATFORM_ADMIN",
  "Support Staff": "SUPPORT",
  "Super Admins": "SUPER_ADMIN",
};

function displayName(u: PlatformUser): string {
  return u.name?.trim() || u.email;
}

function initials(u: PlatformUser): string {
  const parts = u.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const letters = parts.slice(0, 2).map((p) => p[0]).join("");
  return letters.toUpperCase() || u.email.slice(0, 2).toUpperCase();
}

function UsersPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Hospital Admins");
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<PlatformUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Create/edit share one dialog; null target + open === create mode.
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.platformUsers
      .list()
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => u.role === roleMap[tab]);

  async function disable(u: PlatformUser) {
    setBusyId(u.id);
    try {
      await api.platformUsers.disable(u.id);
      toast.success("User disabled");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to disable user");
    } finally {
      setBusyId(null);
    }
  }

  async function enable(u: PlatformUser) {
    setBusyId(u.id);
    try {
      await api.platformUsers.enable(u.id);
      toast.success("User enabled");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to enable user");
    } finally {
      setBusyId(null);
    }
  }

  function openReset(u: PlatformUser) {
    setResetTarget(u);
    setNewPassword("");
    setResetError(null);
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(u: PlatformUser) {
    setEditTarget(u);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.platformUsers.delete(deleteTarget.id);
      toast.success(`${displayName(deleteTarget)} deleted`);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmReset() {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }
    setResetting(true);
    setResetError(null);
    try {
      await api.platformUsers.resetPassword(resetTarget.id, newPassword);
      toast.success(`Password reset for ${displayName(resetTarget)}`);
      setResetTarget(null);
      setNewPassword("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage all platform accounts across tenants.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
        >
          <Plus className="size-4" /> Add User
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t}{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                ({users.filter((u) => u.role === roleMap[t]).length})
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm font-semibold text-destructive">Failed to load users.</div>
            <div className="text-xs text-muted-foreground mt-1">{error}</div>
            <button
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Name</th>
                  <th className="text-left font-semibold px-5 py-3">Email</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Last seen</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="animate-pulse h-4 rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading &&
                  filtered.map((u) => (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-accent/15 text-accent-foreground grid place-items-center text-xs font-bold shrink-0">
                            {initials(u)}
                          </div>
                          <div className="font-semibold">{displayName(u)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={u.isActive ? "Active" : "Disabled"} />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          month: "short", day: "2-digit", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {u.isActive ? (
                            <button
                              onClick={() => disable(u)}
                              disabled={busyId === u.id}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-destructive/10 text-destructive text-xs font-medium disabled:opacity-50"
                            >
                              {busyId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                              Disable
                            </button>
                          ) : (
                            <button
                              onClick={() => enable(u)}
                              disabled={busyId === u.id}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-success/10 text-success text-xs font-medium disabled:opacity-50"
                            >
                              {busyId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                              Enable
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-muted text-xs font-medium"
                          >
                            <Pencil className="size-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => openReset(u)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-muted text-xs font-medium"
                          >
                            <KeyRound className="size-3.5" /> Reset
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-destructive/10 text-destructive text-xs font-medium"
                          >
                            <Trash2 className="size-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="text-sm font-semibold">No users in this group</div>
                      <button
                        onClick={openCreate}
                        className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        <Plus className="size-3.5" /> Add User
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={resetTarget !== null} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetTarget ? displayName(resetTarget) : ""}.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="block">
              <div className="text-xs font-semibold mb-1.5">New password</div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setResetError(null); }}
                placeholder="At least 8 characters"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            {resetError && <div className="text-[11px] text-destructive mt-1">{resetError}</div>}
          </div>

          <DialogFooter>
            <button
              onClick={() => setResetTarget(null)}
              className="h-10 px-4 inline-flex items-center rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={confirmReset}
              disabled={resetting}
              className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-95 disabled:opacity-60"
            >
              {resetting ? <><Loader2 className="size-4 animate-spin" /> Resetting...</> : <><KeyRound className="size-4" /> Reset password</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFormDialog
        open={formOpen}
        user={editTarget}
        defaultRole={roleMap[tab]}
        onOpenChange={setFormOpen}
        onSaved={() => { setFormOpen(false); load(); }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete user"
        description={
          deleteTarget
            ? `“${displayName(deleteTarget)}” will lose access immediately and be permanently removed.`
            : ""
        }
        confirmLabel={<>Delete user</>}
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
