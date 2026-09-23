import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Check, X, Network } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type CatalogModule, type CatalogFeature } from "@/lib/api";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/_shell/catalog/modules")({
  head: () => ({ meta: [{ title: "Catalog — Modules — MediOps" }] }),
  component: CatalogPage,
});

type ModuleForm = {
  id?: number;
  name: string;
  code: string;
  route: string;
  icon: string;
  parentId: string;
  sortOrder: string;
};

const EMPTY_FORM: ModuleForm = {
  name: "",
  code: "",
  route: "",
  icon: "",
  parentId: "",
  sortOrder: "",
};

type FeatureForm = {
  id?: number;
  name: string;
  code: string;
  description: string;
};

const EMPTY_FEATURE_FORM: FeatureForm = {
  name: "",
  code: "",
  description: "",
};

function CatalogPage() {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [features, setFeatures] = useState<CatalogFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ModuleForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CatalogModule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [detachingFeatureId, setDetachingFeatureId] = useState<number | null>(null);

  // Feature attach state — per module row
  const [attachModuleId, setAttachModuleId] = useState<number | null>(null);
  const [attachFeatureId, setAttachFeatureId] = useState("");

  // Feature CRUD state
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [featureForm, setFeatureForm] = useState<FeatureForm>(EMPTY_FEATURE_FORM);
  const [featureErrors, setFeatureErrors] = useState<Record<string, string>>({});
  const [savingFeature, setSavingFeature] = useState(false);
  const [featureDeleteTarget, setFeatureDeleteTarget] = useState<CatalogFeature | null>(null);
  const [deletingFeature, setDeletingFeature] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.catalog.modules(), api.catalog.features()])
      .then(([mods, feats]) => {
        setModules(mods);
        setFeatures(feats);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load catalog"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(m: CatalogModule) {
    setForm({
      id: m.id,
      name: m.name,
      code: m.code,
      route: m.route ?? "",
      icon: m.icon ?? "",
      parentId: m.parentId ? String(m.parentId) : "",
      sortOrder: String(m.sortOrder ?? 0),
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Module name required";
    if (!form.code.trim()) e.code = "Module code required";
    else if (form.id === undefined && !/^[A-Z0-9_]+$/.test(form.code.trim()))
      e.code = "Use UPPERCASE letters, digits and underscores";
    if (form.parentId && Number(form.parentId) === form.id)
      e.parentId = "A module cannot be its own parent";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (form.id === undefined) {
        await api.catalog.createModule({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          route: form.route.trim() || undefined,
          icon: form.icon.trim() || undefined,
          parentId: form.parentId ? Number(form.parentId) : undefined,
          sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
        });
        toast.success(`Module “${form.name.trim()}” created`);
      } else {
        await api.catalog.updateModule(form.id, {
          name: form.name.trim(),
          route: form.route.trim() || undefined,
          icon: form.icon.trim() || undefined,
          sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
        });
        toast.success(`Module “${form.name.trim()}” updated`);
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save module");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: CatalogModule) {
    setTogglingId(m.id);
    try {
      await api.catalog.updateModule(m.id, { isActive: !m.isActive });
      toast.success(`${m.name} ${m.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update module");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.catalog.deleteModule(deleteTarget.id);
      toast.success(`Module “${deleteTarget.name}” deleted`);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete module");
    } finally {
      setDeleting(false);
    }
  }

  function openFeatureCreate() {
    setFeatureForm(EMPTY_FEATURE_FORM);
    setFeatureErrors({});
    setFeatureDialogOpen(true);
  }

  function openFeatureEdit(f: CatalogFeature) {
    setFeatureForm({
      id: f.id,
      name: f.name,
      code: f.code,
      description: f.description ?? "",
    });
    setFeatureErrors({});
    setFeatureDialogOpen(true);
  }

  function validateFeature(): boolean {
    const e: Record<string, string> = {};
    if (!featureForm.name.trim()) e.name = "Feature name required";
    if (!featureForm.code.trim()) e.code = "Feature code required";
    else if (featureForm.id === undefined && !/^[A-Z0-9_]+$/.test(featureForm.code.trim()))
      e.code = "Use UPPERCASE letters, digits and underscores";
    setFeatureErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitFeature() {
    if (!validateFeature()) return;
    setSavingFeature(true);
    try {
      if (featureForm.id === undefined) {
        await api.catalog.createFeature({
          name: featureForm.name.trim(),
          code: featureForm.code.trim().toUpperCase(),
          description: featureForm.description.trim() || undefined,
        });
        toast.success(`Feature “${featureForm.name.trim()}” created`);
      } else {
        await api.catalog.updateFeature(featureForm.id, {
          name: featureForm.name.trim(),
          description: featureForm.description.trim() || undefined,
        });
        toast.success(`Feature “${featureForm.name.trim()}” updated`);
      }
      setFeatureDialogOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save feature");
    } finally {
      setSavingFeature(false);
    }
  }

  async function confirmFeatureDelete() {
    if (!featureDeleteTarget) return;
    setDeletingFeature(true);
    try {
      await api.catalog.deleteFeature(featureDeleteTarget.id);
      toast.success(`Feature “${featureDeleteTarget.name}” deleted`);
      setFeatureDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete feature");
    } finally {
      setDeletingFeature(false);
    }
  }

  async function attachFeature() {
    if (attachModuleId === null || !attachFeatureId) return;
    try {
      await api.catalog.attachFeature(attachModuleId, Number(attachFeatureId));
      toast.success("Feature attached to module");
      setAttachModuleId(null);
      setAttachFeatureId("");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to attach feature");
    }
  }

  async function detachFeature(moduleId: number, featureId: number, featureCode: string) {
    setDetachingFeatureId(featureId);
    try {
      await api.catalog.detachFeature(moduleId, featureId);
      toast.success(`Feature “${featureCode}” detached from module`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to detach feature");
    } finally {
      setDetachingFeatureId(null);
    }
  }

  // Top-level modules (children render nested)
  const roots = modules.filter((m) => !m.parentId);
  const attachableFeatures = features.filter(
    (f) =>
      attachModuleId !== null &&
      !(modules.find((m) => m.id === attachModuleId)?.features ?? []).some(
        (mf) => mf.feature.id === f.id,
      ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Catalog modules</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading catalog…"
              : `${modules.length} module${modules.length !== 1 ? "s" : ""} and ${features.length} feature${features.length !== 1 ? "s" : ""} on the platform.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openFeatureCreate}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
          >
            <Plus className="size-4" /> Create Feature
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
          >
            <Plus className="size-4" /> Create Module
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-16 text-center shadow-card">
          <div className="text-sm font-semibold text-destructive">Failed to load catalog.</div>
          <div className="text-xs text-muted-foreground mt-1">{error}</div>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : roots.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center shadow-card">
          <Network className="size-8 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold mt-3">No modules yet</div>
          <div className="text-xs text-muted-foreground mt-1">
            Modules define what a package unlocks inside the HIS.
          </div>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus className="size-3.5" /> Create Module
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {roots.map((m) => (
            <ModuleRow
              key={m.id}
              module={m}
              depth={0}
              allModules={modules}
              onEdit={openEdit}
              onToggle={toggleActive}
              onDelete={setDeleteTarget}
              togglingId={togglingId}
              onAttach={(id) => {
                setAttachModuleId(id);
                setAttachFeatureId("");
              }}
              attachModuleId={attachModuleId}
              attachableFeatures={attachableFeatures}
              attachFeatureId={attachFeatureId}
              setAttachFeatureId={setAttachFeatureId}
              onAttachClose={() => {
                setAttachModuleId(null);
                setAttachFeatureId("");
              }}
              onAttachConfirm={attachFeature}
              onDetachFeature={detachFeature}
              detachingFeatureId={detachingFeatureId}
            />
          ))}
        </div>
      )}

      {/* Features section */}
      {features.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Features ({features.length})
          </div>
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
                    onClick={() => openFeatureEdit(f)}
                    className="text-xs font-semibold text-accent-foreground hover:underline px-2"
                  >
                    <Pencil className="size-3 inline mr-0.5" /> Edit
                  </button>
                  <button
                    onClick={() => setFeatureDeleteTarget(f)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id === undefined ? "Create module" : `Edit ${form.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Module name *" error={formErrors.name}>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. OPD, Billing, Pharmacy"
                className="cat-input"
              />
            </Field>
            <Field
              label="Module code *"
              error={formErrors.code}
              hint={
                form.id === undefined
                  ? "Immutable once created — e.g. OPD, BILLING"
                  : "Code is immutable"
              }
            >
              <input
                value={form.code}
                disabled={form.id !== undefined}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. OPD, BILLING"
                className="cat-input disabled:opacity-60"
              />
            </Field>
            <Field label="Route" hint="Where the module lives inside the HIS, e.g. /opd">
              <input
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                placeholder="/opd"
                className="cat-input"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Icon" hint="Lucide icon name">
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Stethoscope"
                  className="cat-input"
                />
              </Field>
              <Field label="Parent module" error={formErrors.parentId}>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="cat-input"
                >
                  <option value="">— None —</option>
                  {modules
                    .filter((m) => m.id !== form.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  placeholder="0"
                  className="cat-input"
                />
              </Field>
            </div>
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
                    <Plus className="size-4" /> Create Module
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

      {/* Create / edit feature dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {featureForm.id === undefined ? "Create feature" : `Edit ${featureForm.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Feature name *" error={featureErrors.name}>
              <input
                value={featureForm.name}
                onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
                placeholder="e.g. View Dashboard"
                className="cat-input"
              />
            </Field>
            <Field
              label="Feature code *"
              error={featureErrors.code}
              hint={
                featureForm.id === undefined
                  ? "Immutable once created — e.g. DASHBOARD_VIEW"
                  : "Code is immutable"
              }
            >
              <input
                value={featureForm.code}
                disabled={featureForm.id !== undefined}
                onChange={(e) =>
                  setFeatureForm({ ...featureForm, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. DASHBOARD_VIEW"
                className="cat-input disabled:opacity-60"
              />
            </Field>
            <Field label="Description">
              <input
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                placeholder="What this feature unlocks"
                className="cat-input"
              />
            </Field>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setFeatureDialogOpen(false)}
                className="h-10 px-4 inline-flex items-center rounded-lg border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={submitFeature}
                disabled={savingFeature}
                className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-95 disabled:opacity-60"
              >
                {savingFeature ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : featureForm.id === undefined ? (
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
        title="Delete module"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and its feature links will be permanently removed. Packages referencing it may be affected.`
            : ""
        }
        confirmLabel="Delete module"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={featureDeleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setFeatureDeleteTarget(null);
        }}
        title="Delete feature"
        description={
          featureDeleteTarget
            ? `“${featureDeleteTarget.name}” will be permanently removed and detached from all modules. Role and user permissions referencing it may be affected.`
            : ""
        }
        confirmLabel="Delete feature"
        busyLabel="Deleting…"
        busy={deletingFeature}
        onConfirm={confirmFeatureDelete}
      />

      <style>{`
        .cat-input { width:100%; height:40px; border-radius:8px; border:1px solid var(--input); background:var(--background); padding:0 12px; font-size:14px; outline:none; cursor:pointer; }
        .cat-input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function ModuleRow({
  module,
  depth,
  allModules,
  onEdit,
  onToggle,
  onDelete,
  togglingId,
  onAttach,
  attachModuleId,
  attachableFeatures,
  attachFeatureId,
  setAttachFeatureId,
  onAttachClose,
  onAttachConfirm,
  onDetachFeature,
  detachingFeatureId,
}: {
  module: CatalogModule;
  depth: number;
  allModules: CatalogModule[];
  onEdit: (m: CatalogModule) => void;
  onToggle: (m: CatalogModule) => void;
  onDelete: (m: CatalogModule) => void;
  togglingId: number | null;
  onAttach: (id: number) => void;
  attachModuleId: number | null;
  attachableFeatures: CatalogFeature[];
  attachFeatureId: string;
  setAttachFeatureId: (v: string) => void;
  onAttachClose: () => void;
  onAttachConfirm: () => void;
  onDetachFeature: (moduleId: number, featureId: number, featureCode: string) => void;
  detachingFeatureId: number | null;
}) {
  const children = allModules.filter((m) => m.parentId === module.id);

  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl border bg-card shadow-card p-4 ${module.isActive ? "border-border" : "border-muted opacity-75"}`}
        style={depth > 0 ? { marginLeft: `${depth * 28}px` } : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`size-9 rounded-xl grid place-items-center shrink-0 ${
                module.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              <Network className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-sm truncate">{module.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {module.code}
                </Badge>
                {module.isActive ? (
                  <Badge className="text-[10px] bg-success/15 text-success border-transparent">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {module.route ?? "No route"}
                {module.sortOrder ? ` · order ${module.sortOrder}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {togglingId === module.id ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground mr-1" />
            ) : (
              <button
                onClick={() => onToggle(module)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2"
              >
                {module.isActive ? "Deactivate" : "Activate"}
              </button>
            )}
            <button
              onClick={() => onAttach(module.id)}
              className="cursor-pointer text-xs font-semibold text-accent-foreground hover:underline px-2"
            >
              <Check className="size-3 inline mr-0.5" /> Features
            </button>
            <button
              onClick={() => onEdit(module)}
              className="text-xs font-semibold text-accent-foreground hover:underline px-2"
            >
              <Pencil className="size-3 inline mr-0.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(module)}
              className="text-xs font-semibold text-destructive hover:underline px-2"
            >
              <Trash2 className="size-3 inline mr-0.5" /> Delete
            </button>
          </div>
        </div>

        {(module.features?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-12">
            {module.features!.map((mf) => (
              <span
                key={mf.feature.id}
                className="inline-flex items-center gap-1 text-[11px] rounded-full border border-border pl-2.5 pr-1 py-0.5 text-muted-foreground"
              >
                {mf.feature.code}
                <button
                  onClick={() => onDetachFeature(module.id, mf.feature.id, mf.feature.code)}
                  disabled={detachingFeatureId === mf.feature.id}
                  className="grid place-items-center size-4 rounded-full hover:bg-destructive/15 hover:text-destructive disabled:opacity-50 cursor-pointer"
                  title={`Detach ${mf.feature.code} from ${module.name}`}
                >
                  {detachingFeatureId === mf.feature.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <X className="size-3" />
                  )}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {attachModuleId === module.id && (
        <div
          className="rounded-2xl border border-accent/40 bg-accent/5 p-4 flex flex-wrap items-center gap-2"
          style={depth > 0 ? { marginLeft: `${depth * 28}px` } : undefined}
        >
          <span className="text-xs font-semibold">Attach feature to {module.name}:</span>
          <select
            value={attachFeatureId}
            onChange={(e) => setAttachFeatureId(e.target.value)}
            className="cat-input !w-auto !h-9 text-xs"
          >
            <option value="">Select a feature…</option>
            {attachableFeatures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
          <button
            onClick={onAttachConfirm}
            disabled={!attachFeatureId}
            className="cursor-pointer h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
          >
            Attach
          </button>
          <button
            onClick={onAttachClose}
            className="h-9 px-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {children.map((c) => (
        <ModuleRow
          key={c.id}
          module={c}
          depth={depth + 1}
          allModules={allModules}
          onEdit={onEdit}
          onToggle={onToggle}
          onDelete={onDelete}
          togglingId={togglingId}
          onAttach={onAttach}
          attachModuleId={attachModuleId}
          attachableFeatures={attachableFeatures}
          attachFeatureId={attachFeatureId}
          setAttachFeatureId={setAttachFeatureId}
          onAttachClose={onAttachClose}
          onAttachConfirm={onAttachConfirm}
          onDetachFeature={onDetachFeature}
          detachingFeatureId={detachingFeatureId}
        />
      ))}
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
