/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, CheckCircle, CheckCircle2, Copy, Loader2, PackagePlus, Pencil, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api, formatINR, type Hospital, type HospitalStatus, type Package } from "@/lib/api";
import { PlanBadge, StatusBadge } from "@/components/admin/Badges";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { HospitalFormDialog } from "@/components/admin/HospitalFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_shell/hospitals/$id")({
  head: () => ({ meta: [{ title: "Hospital detail — MediOps" }] }),
  component: HospitalDetail,
});

function badgeStatus(status: HospitalStatus): string {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  return "Trial"; // DRAFT
}

function HospitalDetail() {
  const params = Route.useParams();
  const hospitalId = Number(params.id);

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    hospital: Hospital;
    admin: { email: string; password?: string };
    created: boolean;
  } | null>(null);

  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.hospitals
      .get(hospitalId)
      .then(setHospital)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load hospital"))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  const assigned = hospital?.packages?.[0] ?? null;

  // Only needed to fill the assignment dropdown, so don't fetch until there's a gap.
  useEffect(() => {
    if (loading || assigned) return;
    api.packages
      .list()
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [loading, assigned]);

  async function run(
    fn: (id: number) => Promise<Hospital>,
    successMessage: string,
    failureMessage: string,
  ) {
    setBusy(true);
    try {
      await fn(hospitalId);
      toast.success(successMessage);
      // Status mutations return the bare row without `packages`, so refetch
      // rather than overwriting state with a partial hospital.
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : failureMessage);
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    setBusy(true);
    try {
      const result = await api.hospitals.activate(hospitalId);
      setActivationResult(result);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setBusy(false);
    }
  }

  async function assignPackage() {
    if (selectedPackageId === null) return;
    setAssigning(true);
    try {
      await api.hospitals.assignPackage(hospitalId, selectedPackageId);
      toast.success("Package assigned");
      setSelectedPackageId(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign package");
    } finally {
      setAssigning(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.hospitals.delete(hospitalId);
      toast.success("Hospital deleted");
      navigate({ to: "/admin/hospitals" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete hospital");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="text-center py-20">
        <div className="font-display text-xl font-bold">
          {error ? "Failed to load hospital" : "Hospital not found"}
        </div>
        {error && <div className="text-xs text-muted-foreground mt-1">{error}</div>}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
          <Link
            to="/admin/hospitals"
            className="inline-flex items-center h-9 px-4 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/hospitals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to hospitals
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-display font-bold text-xl">
            {hospital.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{hospital.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{hospital.code}</span>
              <StatusBadge status={badgeStatus(hospital.status)} />
              <span className="text-xs text-muted-foreground">
                Joined {new Date(hospital.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border-border text-sm font-semibold hover:bg-muted"
          >
            <Pencil className="size-4" /> Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Delete
          </button>
          {hospital.status === "DRAFT" && (
            <button
              onClick={activate}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-success-foreground text-sm font-semibold disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Activate
            </button>
          )}
          {hospital.status === "ACTIVE" && (
            <button
              onClick={() => run(api.hospitals.suspend, "Hospital suspended", "Failed to suspend")}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
              Suspend
            </button>
          )}
          {hospital.status === "SUSPENDED" && (
            <button
              onClick={() => run(api.hospitals.reactivate, "Hospital reactivated", "Failed to reactivate")}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-success-foreground text-sm font-semibold disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-bold">Information</h2>
          <InfoRow label="Hospital ID" value={String(hospital.id)} />
          <InfoRow label="Code" value={hospital.code} />
          <InfoRow label="Email" value={hospital.email} />
          {hospital.phone && <InfoRow label="Phone" value={hospital.phone} />}
          <InfoRow label="Status" value={hospital.status} />
          <InfoRow
            label="Created"
            value={new Date(hospital.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display font-bold mb-4">Package</h2>
          {assigned ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{assigned.package.name}</span>
                <PlanBadge plan={assigned.package.name} />
              </div>
              {assigned.package.description && (
                <div className="text-xs text-muted-foreground mt-1">{assigned.package.description}</div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {formatINR(assigned.package.monthlyPrice)}/mo · from{" "}
                {new Date(assigned.startDate).toLocaleDateString("en-IN")}
                {assigned.endDate && ` → ${new Date(assigned.endDate).toLocaleDateString("en-IN")}`}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Limit label="Doctors" value={assigned.package.maxDoctors} />
                <Limit label="Storage" value={`${assigned.package.maxStorageGb} GB`} />
                <Limit label="Branches" value={assigned.package.maxBranches} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">No package assigned.</div>
              <select
                value={selectedPackageId ?? ""}
                onChange={(e) => setSelectedPackageId(e.target.value ? Number(e.target.value) : null)}
                disabled={packages.length === 0}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent disabled:opacity-60"
              >
                <option value="">
                  {packages.length === 0 ? "No packages available" : "Select a package…"}
                </option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatINR(p.monthlyPrice)}/mo
                  </option>
                ))}
              </select>
              <button
                onClick={assignPackage}
                disabled={selectedPackageId === null || assigning}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {assigning ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
                Assign Package
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={activationResult !== null} onOpenChange={(o) => { if (!o) setActivationResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              Hospital Activated!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Hospital info</div>
              <InfoRow label="Name" value={activationResult?.hospital.name ?? ""} />
              <div className="text-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Code</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-base">{activationResult?.hospital.code}</span>
                  <button onClick={() => { navigator.clipboard.writeText(activationResult?.hospital.code ?? ""); toast.success("Copied!"); }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Copy className="size-3" /> Copy
                  </button>
                </div>
              </div>
            </div>

            {activationResult?.created && activationResult.admin.password ? (
              <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
                <div className="text-xs uppercase tracking-wide text-warning font-semibold">Admin credentials — save now!</div>
                <div className="text-xs text-muted-foreground">These will not be shown again. An email has been sent to the hospital.</div>
                <CredRow label="Email" value={activationResult.admin.email} />
                <CredRow label="Password" value={activationResult.admin.password} mono />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">Admin account already exists for this hospital.</div>
            )}

            <button onClick={() => setActivationResult(null)}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95">
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <HospitalFormDialog
        open={editOpen}
        hospital={hospital}
        onOpenChange={setEditOpen}
        onSaved={() => { setEditOpen(false); load(); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete hospital"
        description={`“${hospital.name}” and its tenant data will be permanently removed. This cannot be undone.`}
        confirmLabel={<>Delete hospital</>}
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
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

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="text-sm">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={mono ? "font-mono text-sm" : ""}>{value}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied!"); }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Copy className="size-3" /> Copy
        </button>
      </div>
    </div>
  );
}
