import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Check, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type CatalogFeature } from "@/lib/api";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/_shell/catalog/features")({
  head: () => ({ meta: [{ title: "Catalog — Features — MediOps" }] }),
  component: FeaturesPage,
});

type FeatureForm = {
  id?: number;
  name: string;
  code: string;
  description: string;
};

const EMPTY_FORM: FeatureForm = { name: "", code: "", description: "" };

function FeaturesPage() {
  const [features, setFeatures] = useState<CatalogFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FeatureForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CatalogFeature | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.catalog
      .features()
      .then(setFeatures)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load features"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(f: CatalogFeature) {
    setForm({
      id: f.id,
      name: f.name,
      code: f.code,
      description: f.description ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Feature name required";
    if (!form.code.trim()) e.code = "Feature code required";
    else if (form.id === undefined && !/^[A-Z0-9_]+$/.test(form.code.trim()))
      e.code = "Use UPPERCASE letters, digits and underscores";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (form.id === undefined) {
        await api.catalog.createFeature({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          description: form.description.trim() || undefined,
        });
        toast.success(`Feature “${form.name.trim()}” created`);
      } else {
        await api.catalog.updateFeature(form.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
        toast.success(`Feature “${form.name.trim()}” updated`);
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save feature");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.catalog.deleteFeature(deleteTarget.id);
      toast.success(`Feature “${deleteTarget.name}” deleted`);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete feature");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Catalog features</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading features…"
              : `${features.length} feature${features.length !== 1 ? "s" : ""} on the platform.`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
        >
          <Plus className="size-4" /> Create Feature
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-16 text-center shadow-card">
          <div className="text-sm font-semibold text-destructive">Failed to load features.</div>
          <div className="text-xs text-muted-foreground mt-1">{error}</div>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : features.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center shadow-card">
          <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold mt-3">No features yet</div>
          <div className="text-xs text-muted-foreground mt-1">
            Features are granular permissions that modules unlock for hospital roles.
          </div>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus className="size-3.5" /> Create Feature
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {features.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border bg-card shadow-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-bold text-sm truncate">{f.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {f.code}
                    </Badge>
                  </div>
                  {f.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {f.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(f)}
                    className="text-xs font-semibold text-accent-foreground hover:underline px-2"
                  >
                    <Pencil className="size-3 inline mr-0.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(f)}
                    className="text-xs font-semibold text-destructive hover:underline px-2"
                  >
                    <Trash2 className="size-3 inline mr-0.5" /> Delete
                  </button>
                </div>
              </div>
              {(f.modules?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[11px] text-muted-foreground mr-1">Attached to:</span>
                  {f.modules!.map((fm) => (
                    <span
                      key={fm.id}
                      className="text-[11px] rounded-full border border-border px-2.5 py-0.5 text-muted-foreground"
                    >
                      {fm.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id === undefined ? "Create feature" : `Edit ${form.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Feature name *" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. View Dashboard"
                className="cat-input"
              />
            </Field>
            <Field
              label="Feature code *"
              error={errors.code}
              hint={
                form.id === undefined
                  ? "Immutable once created — e.g. DASHBOARD_VIEW"
                  : "Code is immutable"
              }
            >
              <input
                value={form.code}
                disabled={form.id !== undefined}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. DASHBOARD_VIEW"
                className="cat-input disabled:opacity-60"
              />
            </Field>
            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this feature unlocks"
                className="cat-input"
              />
            </Field>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-10 px-4 inline-flex items-center rounded-lg border border-border text-sm font-semibold hover:bg-muted"
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
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : form.id === undefined ? (
                  <>
                    <Plus className="size-4" /> Create Feature
                  </>
                ) : (
                  <>
                    <Check className="size-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete feature"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be permanently removed and detached from all modules. Role and user permissions referencing it may be affected.`
            : ""
        }
        confirmLabel="Delete feature"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
      />

      <style>{`
        .cat-input { width:100%; height:40px; border-radius:8px; border:1px solid var(--input); background:var(--background); padding:0 12px; font-size:14px; outline:none; }
        .cat-input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
  );
}
