/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle, CheckCircle2, Copy, Loader2, Power, RefreshCw } from "lucide-react";
import { api, formatINR, type Hospital, type Package } from "@/lib/api";
import { StatusBadge } from "@/components/admin/Badges";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_shell/activate-hospital")({
  head: () => ({ meta: [{ title: "Activate Hospital — MediOps" }] }),
  component: ActivateHospital,
});

function ActivateHospital() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [packageTarget, setPackageTarget] = useState<Hospital | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [activationResult, setActivationResult] = useState<{
    hospital: Hospital;
    admin: { email: string; password?: string };
    created: boolean;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.hospitals.list(), api.packages.list()])
      .then(([h, p]) => {
        setHospitals(h);
        setPackages(p);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load hospitals"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(h: Hospital, packageId: number) {
    setBusyId(h.id);
    try {
      const result = await api.hospitals.activate(h.id, packageId);
      setActivationResult(result);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to activate hospital");
    } finally {
      setBusyId(null);
    }
  }

  function openPackagePicker(h: Hospital) {
    setPackageTarget(h);
    setSelectedPackageId(null);
  }

  async function assignAndActivate() {
    if (!packageTarget || selectedPackageId === null) return;
    const target = packageTarget;
    setAssigning(true);
    try {
      const hasPackage = (target.packages?.length ?? 0) > 0;
      if (!hasPackage) {
        await api.hospitals.assignPackage(target.id, selectedPackageId);
        toast.success("Package assigned");
      }
      setPackageTarget(null);
      await activate(target, selectedPackageId);
      setSelectedPackageId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign package");
    } finally {
      setAssigning(false);
    }
  }

  const pending = hospitals.filter((h) => h.status === "DRAFT");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Activate Hospital</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} hospital{pending.length === 1 ? "" : "s"} awaiting activation
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
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
                  <th className="text-right font-semibold px-5 py-3">Action</th>
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
                  pending.map((h) => {
                    const pkg = h.packages?.[0]?.package;
                    const rowBusy = busyId === h.id;
                    return (
                      <tr
                        key={h.id}
                        className="border-t border-border hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold">{h.name}</div>
                          <div className="text-xs text-muted-foreground">{h.email}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">{h.code}</td>
                        <td className="px-5 py-3 text-xs">
                          {pkg ? (
                            pkg.name
                          ) : (
                            <span className="text-muted-foreground">No package</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status="Trial" />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => (pkg ? activate(h, pkg.id) : openPackagePicker(h))}
                              disabled={rowBusy}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md hover:bg-success/10 text-success text-xs font-medium disabled:opacity-50"
                            >
                              {rowBusy ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="size-3.5" />
                              )}
                              Activate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && pending.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="text-sm font-semibold">Nothing to activate</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        All hospitals are already active or suspended.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Package picker — shown only when the hospital has no package yet */}
      <Dialog
        open={packageTarget !== null}
        onOpenChange={(o) => {
          if (!o) setPackageTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="size-5 text-success" />
              Choose a package
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{packageTarget?.name}</span> needs a
              package before it can be activated.
            </div>
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
              onClick={assignAndActivate}
              disabled={selectedPackageId === null || assigning}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-success text-success-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50"
            >
              {assigning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              Assign &amp; Activate
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activation result — admin credentials shown once */}
      <Dialog
        open={activationResult !== null}
        onOpenChange={(o) => {
          if (!o) setActivationResult(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              Hospital Activated!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Hospital info
              </div>
              <div className="text-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Name
                </div>
                <div className="font-semibold">{activationResult?.hospital.name}</div>
              </div>
              <div className="text-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Code
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-base">
                    {activationResult?.hospital.code}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activationResult?.hospital.code ?? "");
                      toast.success("Copied!");
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="size-3" /> Copy
                  </button>
                </div>
              </div>
            </div>

            {activationResult?.created && activationResult.admin.password ? (
              <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
                <div className="text-xs uppercase tracking-wide text-warning font-semibold">
                  Admin credentials — save now!
                </div>
                <div className="text-xs text-muted-foreground">
                  These will not be shown again. An email has been sent to the hospital.
                </div>
                <div className="text-sm">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Email
                  </div>
                  <div>{activationResult.admin.email}</div>
                </div>
                <div className="text-sm">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Password
                  </div>
                  <div className="font-mono">{activationResult.admin.password}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">
                Admin account already exists for this hospital.
              </div>
            )}

            <button
              onClick={() => setActivationResult(null)}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
