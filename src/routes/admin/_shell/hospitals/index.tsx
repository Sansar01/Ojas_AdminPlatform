/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Ban,
  RotateCcw,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  PackagePlus,
} from "lucide-react";
import { api, formatINR, type Hospital, type HospitalStatus, type Package } from "@/lib/api";
import { PlanBadge, StatusBadge } from "@/components/admin/Badges";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { HospitalFormDialog } from "@/components/admin/HospitalFormDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_shell/hospitals/")({
  head: () => ({ meta: [{ title: "Hospitals — MediOps" }] }),
  component: HospitalsList,
});

/** Backend status → the label the StatusBadge design system uses. */
function badgeStatus(status: HospitalStatus): string {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  return "Trial"; // DRAFT
}

function HospitalsList() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | HospitalStatus>("All");
  const [editTarget, setEditTarget] = useState<Hospital | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<Hospital | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hospital | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const startedAt = Date.now();
    setLoading(true);
    setError(null);
    try {
      const result = await api.hospitals.list();
      setHospitals(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load hospitals");
    } finally {
      // Keep the skeleton visible briefly even when the API responds instantly,
      // so clicking Refresh gives clear feedback instead of a barely visible flash.
      const remaining = 450 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function suspend(h: Hospital) {
    setBusyId(h.id);
    try {
      await api.hospitals.suspend(h.id);
      toast.success(`${h.name} suspended`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend hospital");
    } finally {
      setBusyId(null);
    }
  }

  async function reactivate(h: Hospital) {
    setBusyId(h.id);
    try {
      await api.hospitals.reactivate(h.id);
      toast.success(`${h.name} reactivated`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reactivate hospital");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.hospitals.delete(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete hospital");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(
    () =>
      hospitals.filter(
        (h) =>
          (status === "All" || h.status === status) &&
          (q === "" ||
            h.name.toLowerCase().includes(q.toLowerCase()) ||
            h.code.toLowerCase().includes(q.toLowerCase())),
      ),
    [hospitals, q, status],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Hospitals</h1>
          <p className="text-sm text-muted-foreground">
            {hospitals.length} tenants on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            to="/admin/hospitals/create"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
          >
            <Plus className="size-4" /> Create Hospital
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 border-b border-border">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 h-10 flex-1 min-w-[220px]">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or code…"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as HospitalStatus | "All")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="All">All</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>

        {error ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm font-semibold text-destructive">Failed to load hospitals.</div>
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
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Hospital</th>
                  <th className="text-left font-semibold px-5 py-3">Code</th>
                  <th className="text-left font-semibold px-5 py-3">Package</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Created</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="animate-pulse h-4 rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading &&
                  filtered.map((h) => {
                    const activeAssignment = h.packages?.find(
                      (assignment) => assignment.status === "ACTIVE",
                    );
                    const pkg = activeAssignment?.package ?? h.packages?.[0]?.package;
                    return (
                      <tr
                        key={h.id}
                        className="border-t border-border hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold">{h.name}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">{h.code}</td>
                        <td className="px-5 py-3 text-xs">
                          {pkg ? (
                            <PlanBadge plan={pkg.name} />
                          ) : (
                            <span className="text-muted-foreground">No package</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={badgeStatus(h.status)} />
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {new Date(h.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Link
                              to="/admin/hospitals/$id"
                              params={{ id: String(h.id) }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-muted text-xs font-medium"
                            >
                              <Eye className="size-3.5" /> View
                            </Link>
                            <button
                              onClick={() => setEditTarget(h)}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-muted text-xs font-medium"
                            >
                              <Pencil className="size-3.5" /> Edit
                            </button>
                            {!activeAssignment && (
                              <button
                                onClick={() => setAssignmentTarget(h)}
                                disabled={assignmentTarget !== null || editTarget !== null}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-accent/10 text-accent-foreground text-xs font-medium disabled:opacity-50"
                              >
                                <PackagePlus className="size-3.5" /> Assign package
                              </button>
                            )}
                            {h.status === "ACTIVE" && (
                              <button
                                onClick={() => suspend(h)}
                                disabled={
                                  busyId === h.id ||
                                  assignmentTarget !== null ||
                                  editTarget !== null
                                }
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-destructive/10 text-destructive text-xs font-medium disabled:opacity-50"
                              >
                                {busyId === h.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Ban className="size-3.5" />
                                )}
                                Suspend
                              </button>
                            )}
                            {h.status === "SUSPENDED" && (
                              <button
                                onClick={() => reactivate(h)}
                                disabled={
                                  busyId === h.id ||
                                  assignmentTarget !== null ||
                                  editTarget !== null
                                }
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-success/10 text-success text-xs font-medium disabled:opacity-50"
                              >
                                {busyId === h.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-3.5" />
                                )}
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(h)}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-destructive/10 text-destructive text-xs font-medium"
                            >
                              <Trash2 className="size-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="text-sm font-semibold">No hospitals found</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {q || status !== "All"
                          ? "Try clearing your filters."
                          : "Create your first hospital to get started."}
                      </div>
                      {!q && status === "All" && (
                        <Link
                          to="/admin/hospitals/create"
                          className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          <Plus className="size-3.5" /> Create Hospital
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HospitalFormDialog
        open={editTarget !== null}
        hospital={editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        onSaved={() => {
          setEditTarget(null);
          load();
        }}
      />

      <AssignPackageDialog
        hospital={assignmentTarget}
        onOpenChange={(open) => {
          if (!open) setAssignmentTarget(null);
        }}
        onAssigned={() => {
          setAssignmentTarget(null);
          load();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete hospital"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and its tenant data will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel={<>Delete hospital</>}
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function AssignPackageDialog({
  hospital,
  onOpenChange,
  onAssigned,
}: {
  hospital: Hospital | null;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignmentHospitalId = hospital?.id;

  useEffect(() => {
    if (assignmentHospitalId === undefined) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedPackageId(null);
    api.packages
      .list()
      .then((result) => {
        if (!cancelled) setPackages(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load packages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentHospitalId]);

  async function assign() {
    if (!hospital || selectedPackageId === null) return;
    setAssigning(true);
    setError(null);
    try {
      // Guard against a concurrent assignment without changing hospital status.
      const current = await api.hospitals.get(Number(hospital.id));
      const active = current.packages?.find((assignment) => assignment.status === "ACTIVE");
      if (active) {
        const activePackageId = Number(active.packageId ?? active.package?.id);
        if (activePackageId !== selectedPackageId) {
          throw new Error(
            "This hospital already has an active package. Refresh the hospital list to see it.",
          );
        }
        toast.success("This package is already assigned to the hospital");
      } else {
        await api.hospitals.assignPackage(Number(hospital.id), Number(selectedPackageId));
        toast.success(`Package assigned to ${hospital.name}`);
      }
      onAssigned();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to assign package";
      setError(message);
      toast.error(message);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Dialog open={hospital !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a package</DialogTitle>
          <DialogDescription>
            {hospital
              ? `Choose a package for ${hospital.name}. This only assigns the package; it does not activate, suspend, or reactivate the hospital.`
              : "Choose a package for this hospital."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Loading available packages…</span>
          </div>
        ) : error && packages.length === 0 ? (
          <div className="space-y-3 py-3">
            <div role="alert" className="text-sm text-destructive">
              {error}
            </div>
            <button
              type="button"
              onClick={() => {
                if (hospital) {
                  setLoading(true);
                  setError(null);
                  api.packages
                    .list()
                    .then(setPackages)
                    .catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Failed to load packages"),
                    )
                    .finally(() => setLoading(false));
                }
              }}
              className="text-sm font-semibold text-accent-foreground underline"
            >
              Retry loading packages
            </button>
          </div>
        ) : packages.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            No packages are available. Create a package first, then try again.
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <label className="block text-sm font-medium" htmlFor="hospital-package-select">
              Package
            </label>
            <select
              id="hospital-package-select"
              value={selectedPackageId ?? ""}
              onChange={(e) => setSelectedPackageId(e.target.value ? Number(e.target.value) : null)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              disabled={assigning}
            >
              <option value="">Select a package…</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — {formatINR(pkg.monthlyPrice)}/mo
                </option>
              ))}
            </select>
            {error && (
              <div role="alert" className="text-xs text-destructive">
                {error}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {hospital && (
            <Link
              to="/admin/hospitals/$id"
              params={{ id: String(hospital.id) }}
              className="h-10 px-4 inline-flex items-center rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Open hospital page
            </Link>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={assigning}
            className="h-10 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={assign}
            disabled={loading || assigning || selectedPackageId === null || packages.length === 0}
            className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {assigning && <Loader2 className="size-4 animate-spin" />}
            {assigning ? "Assigning…" : "Assign package"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
