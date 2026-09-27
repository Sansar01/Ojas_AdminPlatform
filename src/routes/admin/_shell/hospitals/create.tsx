/* eslint-disable prettier/prettier */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { api, formatINR, type Hospital, type Package } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_shell/hospitals/create")({
  head: () => ({ meta: [{ title: "Create Hospital — MediOps" }] }),
  component: CreateHospital,
});

const steps = ["Hospital info", "Assign package"];

/** Indian mobile number: optional +91 prefix, then 6-9 start, 10 digits total. */
const PHONE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const PHONE_ERROR = "Enter a valid 10-digit Indian mobile number";

/** "Kanishka Hospital" → "KANISHKA-H". Seeds the code field; still hand-editable. */
function autoGenerateCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 10);
}

function CreateHospital() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageLoadError, setPackageLoadError] = useState<string | null>(null);
  const [createdHospital, setCreatedHospital] = useState<Hospital | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  const [form, setForm] = useState<{
    name: string;
    code: string;
    email: string;
    phone: string;
    packageId: number | null;
  }>({
    name: "",
    code: "",
    email: "",
    phone: "",
    packageId: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    setPackageLoadError(null);
    try {
      setPackages(await api.packages.list());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load packages";
      setPackageLoadError(message);
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1) void loadPackages();
  }, [step, loadPackages]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) e.name = "Hospital name required";
      if (!form.code.trim()) e.code = "Hospital code required";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
      if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) e.phone = PHONE_ERROR;
    }
    if (step === 1) {
      if (form.packageId === null) e.packageId = "Select a package";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    if (step !== 0 || createdHospital || submitInFlight.current || !validate()) return;
    submitInFlight.current = true;
    setSubmitting(true);
    const hospitalCode = form.code.trim().toUpperCase();
    const hospitalName = form.name.trim();
    const hospitalEmail = form.email.trim();
    try {
      let hospital: Hospital;
      try {
        // Step one persists the hospital first. Package assignment is a
        // separate action so a package API failure can never lose the record.
        hospital = await api.hospitals.create({
          name: hospitalName,
          code: hospitalCode,
          email: hospitalEmail,
          phone: form.phone.trim() || undefined,
        });
      } catch (createError: unknown) {
        // Recover a prior partial attempt for this same hospital. Do not reuse
        // a code that belongs to a different hospital.
        const message = createError instanceof Error ? createError.message : "";
        if (!/already exists|duplicate|unique/i.test(message)) throw createError;
        const existing = (await api.hospitals.list()).find(
          (item) =>
            item.code?.trim().toUpperCase() === hospitalCode &&
            item.name?.trim().toUpperCase() === hospitalName.toUpperCase() &&
            item.email?.trim().toLowerCase() === hospitalEmail.toLowerCase(),
        );
        if (!existing) throw createError;
        hospital = existing;
      }

      const hospitalId = Number(hospital.id);
      if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {
        throw new Error(
          "Hospital was created, but the server returned an invalid ID. Open Hospitals and assign its package there.",
        );
      }
      hospital = { ...hospital, id: hospitalId };
      setCreatedHospital(hospital);
      setAssignmentError(null);
      setStep(1);
      toast.success(`${hospital.name} created. Select a package to continue.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create hospital";
      toast.error(message);
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!createdHospital || submitInFlight.current || !validate()) return;
    submitInFlight.current = true;
    setSubmitting(true);
    setAssignmentError(null);
    try {
      const hospitalId = Number(createdHospital.id);
      const packageId = Number(form.packageId);
      if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {
        throw new Error(
          "Invalid hospital ID. Open the hospital record and assign the package there.",
        );
      }
      if (!Number.isSafeInteger(packageId) || packageId <= 0) {
        throw new Error("Invalid package selection. Please select a package again.");
      }

      // Re-read before posting so retries after a lost response don't create
      // another active assignment.
      const current = await api.hospitals.get(hospitalId);
      const activeAssignment = current.packages?.find(
        (assignment) => assignment.status === "ACTIVE",
      );
      if (activeAssignment) {
        const currentPackageId = Number(activeAssignment.packageId ?? activeAssignment.package?.id);
        if (currentPackageId !== packageId) {
          throw new Error(
            "This hospital already has an active package. Open its hospital page to review the assignment.",
          );
        }
      } else {
        await api.hospitals.assignPackage(hospitalId, packageId);
      }

      toast.success(`${createdHospital.name} created and package assigned successfully`);
      navigate({ to: "/admin/hospitals" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Package assignment failed";
      setAssignmentError(message);
      toast.error(`${message}. The hospital is saved; you can retry or assign a package later.`);
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        to="/admin/hospitals"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to hospitals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold">Onboard a new hospital</h1>
        <p className="text-sm text-muted-foreground">
          Create the hospital first, then assign its package. If assignment fails, you can retry or
          assign it from the Hospitals list.
        </p>
      </div>

      <ol className="flex items-center gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 flex-1">
            <div
              className={`size-8 rounded-full grid place-items-center text-xs font-bold ${
                i < step
                  ? "bg-success text-success-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <div
              className={`text-sm font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? "bg-success" : "bg-border"}`} />
            )}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hospital name *" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value.toUpperCase(),
                    code: autoGenerateCode(e.target.value),
                  })
                }
                placeholder="e.g. AIIMS DELHI"
                className="input"
              />
            </Field>
            <Field label="Hospital code *" error={errors.code}>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. ABC-HOSP"
                className="input"
              />
            </Field>
            <Field label="Email *" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@hospital.com"
                className="input"
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="9876543210 or +91 9876543210"
                className="input"
                maxLength={13}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {createdHospital && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Check className="size-4 text-success" /> {createdHospital.name} created
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Code: <span className="font-mono">{createdHospital.code}</span>. Choose a package
                  now, or assign it later from the Hospitals list.
                </div>
              </div>
            )}
            {assignmentError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              >
                <div className="font-semibold">Package wasn’t assigned</div>
                <div className="mt-1">
                  {assignmentError} Your hospital is saved. Retry, or return to the Hospitals list
                  to assign a package later.
                </div>
              </div>
            )}
            {loadingPackages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : packageLoadError ? (
              <div className="text-center py-10">
                <div className="text-sm font-semibold text-destructive">Couldn’t load packages</div>
                <div className="text-xs text-muted-foreground mt-1">{packageLoadError}</div>
                <button
                  type="button"
                  onClick={() => void loadPackages()}
                  className="mt-3 text-sm font-semibold text-accent-foreground underline"
                >
                  Retry loading packages
                </button>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-sm font-semibold">No packages available</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <Link
                    to="/admin/packages/create"
                    className="text-accent-foreground font-semibold"
                  >
                    Create a package
                  </Link>{" "}
                  first, or assign one later from the hospital page.
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {packages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, packageId: p.id });
                      setAssignmentError(null);
                    }}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      form.packageId === p.id
                        ? "border-accent bg-accent/5 shadow-lift"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <div className="font-display font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatINR(p.monthlyPrice)}/mo
                    </div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {errors.packageId && (
              <div className="text-[11px] text-destructive">{errors.packageId}</div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <button
            onClick={() => setStep(0)}
            disabled={step === 0 || Boolean(createdHospital) || submitting}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold disabled:opacity-40 hover:bg-muted"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {step === 0 ? (
            <button
              onClick={next}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating hospital...
                </>
              ) : (
                <>
                  Create hospital & continue <ArrowRight className="size-4" />
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={submit}
                disabled={
                  submitting || loadingPackages || packages.length === 0 || form.packageId === null
                }
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-bold hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Assigning...
                  </>
                ) : (
                  <>
                    <Check className="size-4" /> Assign package
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`.input { width:100%; height:40px; border-radius:8px; border:1px solid var(--input); background:var(--background); padding:0 12px; font-size:14px; outline:none; } .input:focus { border-color: var(--accent); }`}</style>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold mb-1.5">{label}</div>
      {children}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
  );
}
