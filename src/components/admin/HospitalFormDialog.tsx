import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { api, type Hospital } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Same Indian mobile rule the create wizard uses, kept in sync deliberately. */
const PHONE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const PHONE_ERROR = "Enter a valid 10-digit Indian mobile number";

type FormState = { name: string; code: string; email: string; phone: string };

/**
 * Edit dialog for an existing hospital. `hospital` being null closes it — the
 * caller owns `open` so the same component serves list and detail pages.
 */
export function HospitalFormDialog({
  open,
  hospital,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  hospital: Hospital | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (hospital: Hospital) => void;
}) {
  const [form, setForm] = useState<FormState>({ name: "", code: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever a different hospital is opened.
  useEffect(() => {
    if (!hospital) return;
    setForm({
      name: hospital.name,
      code: hospital.code,
      email: hospital.email,
      phone: hospital.phone ?? "",
    });
    setErrors({});
  }, [hospital]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Hospital name required";
    if (!form.code.trim()) e.code = "Hospital code required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) e.phone = PHONE_ERROR;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!hospital || !validate()) return;
    setSaving(true);
    try {
      const updated = await api.hospitals.update(hospital.id, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      });
      toast.success(`${form.name.trim()} updated`);
      onSaved(updated);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update hospital");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit hospital</DialogTitle>
          <DialogDescription>
            Update the tenant's contact details. Status and packages are managed separately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <Field label="Hospital name *" error={errors.name} className="sm:col-span-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
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
          <Field label="Phone" error={errors.phone} className="sm:col-span-2">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="9876543210 or +91 9876543210"
              maxLength={13}
              className="input"
            />
          </Field>
        </div>

        <DialogFooter className="pt-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-10 px-4 inline-flex items-center rounded-lg border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-95 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="size-4" /> Save Changes
              </>
            )}
          </button>
        </DialogFooter>

        <style>{`.input { width:100%; height:40px; border-radius:8px; border:1px solid var(--input); background:var(--background); padding:0 12px; font-size:14px; outline:none; } .input:focus { border-color: var(--accent); }`}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-xs font-semibold mb-1.5">{label}</div>
      {children}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
  );
}
