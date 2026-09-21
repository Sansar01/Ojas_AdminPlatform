import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { api, type PlatformRole, type PlatformUser } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLES: { value: PlatformRole; label: string }[] = [
  { value: "PLATFORM_ADMIN", label: "Hospital Admin" },
  { value: "SUPPORT", label: "Support Staff" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

type FormState = { name: string; email: string; role: PlatformRole; password: string };

const EMPTY = (role: PlatformRole): FormState => ({ name: "", email: "", role, password: "" });

/**
 * Create/edit dialog for a platform user. Passing `user` switches to edit mode,
 * where the password field is omitted (use the Reset action for that instead).
 */
export function UserFormDialog({
  open,
  user,
  defaultRole,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  user: PlatformUser | null;
  defaultRole: PlatformRole;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: PlatformUser) => void;
}) {
  const isEdit = user !== null;
  const [form, setForm] = useState<FormState>(EMPTY(defaultRole));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Seed on open: existing row for edit, the active tab's role for create.
  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? { name: user.name ?? "", email: user.email, role: user.role, password: "" }
        : EMPTY(defaultRole),
    );
    setErrors({});
  }, [open, user, defaultRole]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (!isEdit && form.password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = isEdit
        ? await api.platformUsers.update(user.id, {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
          })
        : await api.platformUsers.create({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            password: form.password,
          });
      toast.success(isEdit ? `${form.name.trim()} updated` : `${form.name.trim()} created`);
      onSaved(saved);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : `Failed to ${isEdit ? "update" : "create"} user`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this account's profile and role. Use Reset to change a password."
              : "Create a new platform account. They can sign in immediately with the password you set."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <Field label="Full name *" error={errors.name} className="sm:col-span-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Asha Verma"
              className="input"
            />
          </Field>
          <Field label="Email *" error={errors.email} className="sm:col-span-2">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@platform.com"
              className="input"
            />
          </Field>
          <Field label="Role *">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as PlatformRole })}
              className="input"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          {!isEdit && (
            <Field label="Temporary password *" error={errors.password}>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                className="input"
              />
            </Field>
          )}
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
                <Check className="size-4" /> {isEdit ? "Save Changes" : "Create User"}
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
