/* eslint-disable prettier/prettier */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { api, formatINR, type CatalogModule } from "@/lib/api";

export const Route = createFileRoute("/admin/_shell/packages/create")({
  head: () => ({ meta: [{ title: "Create Package — MediOps" }] }),
  component: CreatePackage,
});

type FormState = {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxDoctors: number;
  maxStorageGb: number;
  maxBranches: number;
  isPopular: boolean;
};

const INITIAL: FormState = {
  name: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxDoctors: 0,
  maxStorageGb: 0,
  maxBranches: 0,
  isPopular: false,
};

function CreatePackage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.catalog
      .modules()
      .then(setModules)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load modules"))
      .finally(() => setLoadingModules(false));
  }, []);

  function toggleModule(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Package name required";
    const numeric: (keyof FormState)[] = [
      "monthlyPrice", "yearlyPrice", "maxDoctors", "maxStorageGb", "maxBranches",
    ];
    for (const key of numeric) {
      const v = form[key] as number;
      if (Number.isNaN(v) || v < 0) e[key] = "Must be 0 or greater";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await api.packages.create({
        name: form.name.trim().toUpperCase(),
        monthlyPrice: form.monthlyPrice,
        yearlyPrice: form.yearlyPrice,
        maxDoctors: form.maxDoctors,
        maxStorageGb: form.maxStorageGb,
        maxBranches: form.maxBranches,
        isPopular: form.isPopular,
      });

      for (const moduleId of selected) {
        await api.packages.attachModule(created.id, moduleId);
      }

      toast.success(`${created.name} package created`);
      navigate({ to: "/admin/packages" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create package");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedModules = modules.filter((m) => selected.includes(m.id));

  return (
    <div className="space-y-6">
      <Link
        to="/admin/packages"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to packages
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold">Create a new package</h1>
        <p className="text-sm text-muted-foreground">
          Set pricing and limits, pick the modules it unlocks, and preview it live.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------- Form ---------------- */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Package name *" error={errors.name} className="md:col-span-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                placeholder="e.g. BASIC, PREMIUM, ENTERPRISE"
                className="input"
              />
            </Field>

            <Field label="Monthly price ₹" error={errors.monthlyPrice}>
              <NumberInput
                value={form.monthlyPrice}
                onChange={(n) => setForm((f) => ({ ...f, monthlyPrice: n }))}
              />
            </Field>
            <Field label="Yearly price ₹" error={errors.yearlyPrice}>
              <NumberInput
                value={form.yearlyPrice}
                onChange={(n) => setForm((f) => ({ ...f, yearlyPrice: n }))}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setForm({ ...form, isPopular: !form.isPopular })}
                className={`w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                  form.isPopular
                    ? "border-accent bg-accent/10 text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                <Star className={`size-4 ${form.isPopular ? "fill-current" : ""}`} />
                Most popular
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Modules
            </div>
            {loadingModules ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="size-4 animate-spin" /> Loading modules…
              </div>
            ) : modules.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">No modules in the catalog yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {modules.map((m) => {
                  const on = selected.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModule(m.id)}
                      title={m.description}
                      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        on
                          ? "border-accent bg-accent/10 text-accent-foreground"
                          : "border-border text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      <span
                        className={`size-4 rounded-full grid place-items-center ${
                          on ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Check className="size-3" />
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Limits
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Max doctors" error={errors.maxDoctors}>
                <NumberInput
                  value={form.maxDoctors}
                  onChange={(n) => setForm((f) => ({ ...f, maxDoctors: n }))}
                />
              </Field>
              <Field label="Max storage (GB)" error={errors.maxStorageGb}>
                <NumberInput
                  value={form.maxStorageGb}
                  onChange={(n) => setForm((f) => ({ ...f, maxStorageGb: n }))}
                />
              </Field>
              <Field label="Max branches" error={errors.maxBranches}>
                <NumberInput
                  value={form.maxBranches}
                  onChange={(n) => setForm((f) => ({ ...f, maxBranches: n }))}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Link
              to="/admin/packages"
              className="h-10 px-4 inline-flex items-center rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              onClick={submit}
              disabled={submitting}
              className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" /> Creating...</>
              ) : (
                <><Check className="size-4" /> Create Package</>
              )}
            </button>
          </div>
        </div>

        {/* ---------------- Live preview ---------------- */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Live preview
          </div>
          <div
            className={`relative rounded-2xl border bg-card p-6 shadow-card flex flex-col ${
              form.isPopular ? "border-accent shadow-lift" : "border-border"
            }`}
          >
            {form.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider rounded-full bg-accent text-accent-foreground px-3 py-1">
                MOST POPULAR
              </div>
            )}

            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {form.name || "PACKAGE NAME"}
            </div>

            <div className="mt-3">
              <div className="font-display text-4xl font-bold">
                {formatINR(form.monthlyPrice)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatINR(form.yearlyPrice)}/yr
              </div>
            </div>

            <div className="mt-5 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Modules ({selectedModules.length})
              </div>
              {selectedModules.length === 0 ? (
                <div className="text-xs text-muted-foreground">No modules assigned</div>
              ) : (
                <div className="space-y-1.5">
                  {selectedModules.map((m) => (
                    <div key={m.id} className="text-sm flex items-center gap-2">
                      <span className="size-4 rounded-full grid place-items-center bg-success/15 text-success shrink-0">
                        <Check className="size-3" />
                      </span>
                      <span className="truncate">{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Limit label="Doctors" value={form.maxDoctors} />
              <Limit label="Storage" value={`${form.maxStorageGb} GB`} />
              <Limit label="Branches" value={form.maxBranches} />
            </div>
          </div>
        </div>
      </div>

      <style>{`.input { width:100%; height:40px; border-radius:8px; border:1px solid var(--input); background:var(--background); padding:0 12px; font-size:14px; outline:none; } .input:focus { border-color: var(--accent); }`}</style>
    </div>
  );
}

/**
 * Integer field that renders 0 as an empty box, so typing never has to work
 * around a leading zero. The committed value stays a number at all times.
 */
function NumberInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value === 0 ? "" : value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      placeholder="0"
      className="input"
    />
  );
}

function Field({ label, error, className, children }: {
  label: string; error?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-xs font-semibold mb-1.5">{label}</div>
      {children}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
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
