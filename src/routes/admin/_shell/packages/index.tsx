/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plus, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, formatINR, type Package } from "@/lib/api";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_shell/packages/")({
  head: () => ({ meta: [{ title: "Packages — MediOps" }] }),
  component: PackagesList,
});

function PackagesList() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.packages
      .list()
      .then(setPackages)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load packages"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.packages.delete(deleteTarget.id);
      toast.success(`${deleteTarget.name} package deleted`);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete package");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Subscription packages</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading packages…" : `${packages.length} package${packages.length !== 1 ? "s" : ""} on the platform.`}
          </p>
        </div>
        <Link
          to="/admin/packages/create"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
        >
          <Plus className="size-4" /> Create Package
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted h-96" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-16 text-center shadow-card">
          <div className="text-sm font-semibold text-destructive">Failed to load packages.</div>
          <div className="text-xs text-muted-foreground mt-1">{error}</div>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center shadow-card">
          <div className="text-sm font-semibold">No packages yet</div>
          <div className="text-xs text-muted-foreground mt-1">Create your first package to get started.</div>
          <Link
            to="/admin/packages/create"
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus className="size-3.5" /> Create Package
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border bg-card p-6 shadow-card hover-lift flex flex-col ${
                p.isPopular ? "border-accent shadow-lift" : "border-border"
              }`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider rounded-full bg-accent text-accent-foreground px-3 py-1">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {p.name}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/admin/packages/$id/edit"
                    params={{ id: String(p.id) }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent-foreground hover:underline"
                  >
                    <Pencil className="size-3" /> Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-display text-4xl font-bold">
                  {formatINR(p.monthlyPrice)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatINR(p.yearlyPrice)}/yr
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-muted-foreground mt-3">{p.description}</p>
              )}

              <div className="mt-5 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Modules ({p.modules?.length ?? 0})
                </div>
                {!p.modules || p.modules.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No modules assigned</div>
                ) : (
                  <div className="space-y-1.5">
                    {p.modules.map((m) => (
                      <div key={m.module.id} className="text-sm flex items-center gap-2">
                        <span className="size-4 rounded-full grid place-items-center bg-success/15 text-success shrink-0">
                          <Check className="size-3" />
                        </span>
                        <span className="truncate">{m.module.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Limit label="Doctors" value={p.maxDoctors} />
                <Limit label="Storage" value={`${p.maxStorageGb} GB`} />
                <Limit label="Branches" value={p.maxBranches} />
              </div>

              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                {p._count?.assignedPackages ?? 0} active hospital
                {(p._count?.assignedPackages ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete package"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be permanently removed. Hospitals on this package may lose access to its modules.`
            : ""
        }
        confirmLabel={<>Delete package</>}
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="font-display font-bold text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
