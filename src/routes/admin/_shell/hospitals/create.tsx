/* eslint-disable prettier/prettier */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { api, formatINR, type Package } from "@/lib/api";
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
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (step === 1) {
      setLoadingPackages(true);
      api.packages
        .list()
        .then(setPackages)
        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load packages"))
        .finally(() => setLoadingPackages(false));
    }
  }, [step]);

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

  function next() { if (validate()) setStep((s) => Math.min(1, s + 1)); }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const hospital = await api.hospitals.create({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      });

      if (form.packageId !== null) {
        await api.hospitals.assignPackage(hospital.id, form.packageId);
      }

      toast.success(`${hospital.name} created successfully`);
      navigate({ to: "/admin/hospitals" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create hospital");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link to="/admin/hospitals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to hospitals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold">Onboard a new hospital</h1>
        <p className="text-sm text-muted-foreground">Provision a tenant in two quick steps.</p>
      </div>

      <ol className="flex items-center gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 flex-1">
            <div className={`size-8 rounded-full grid place-items-center text-xs font-bold ${
              i < step ? "bg-success text-success-foreground" :
              i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <div className={`text-sm font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-success" : "bg-border"}`} />}
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
                placeholder="e.g. AIIMS DELHI" className="input" />
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
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@hospital.com" className="input" />
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
            {loadingPackages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-sm font-semibold">No packages available</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <Link to="/admin/packages/create" className="text-accent-foreground font-semibold">Create a package</Link> first.
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {packages.map((p) => (
                  <button key={p.id} type="button" onClick={() => setForm({ ...form, packageId: p.id })}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      form.packageId === p.id ? "border-accent bg-accent/5 shadow-lift" : "border-border hover:border-accent/40"
                    }`}>
                    <div className="font-display font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{formatINR(p.monthlyPrice)}/mo</div>
                    {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
                  </button>
                ))}
              </div>
            )}
            {errors.packageId && <div className="text-[11px] text-destructive">{errors.packageId}</div>}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold disabled:opacity-40 hover:bg-muted">
            <ArrowLeft className="size-4" /> Back
          </button>
          {step < 1 ? (
            <button onClick={next}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95">
              Next <ArrowRight className="size-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-bold hover:opacity-95 disabled:opacity-60">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Creating...</> : <><Check className="size-4" /> Create Hospital</>}
            </button>
          )}
        </div>
      </div>

      <style>{`.input { width:100%; height:40px; border-radius:8px; border:1px solid var(--input); background:var(--background); padding:0 12px; font-size:14px; outline:none; } .input:focus { border-color: var(--accent); }`}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold mb-1.5">{label}</div>
      {children}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
  );
}