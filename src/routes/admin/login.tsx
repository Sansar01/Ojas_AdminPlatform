import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Mail, Lock, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Super Admin Login — MediOps" },
      { name: "description", content: "Sign in to the MediOps Hospital SaaS Super Admin portal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("admin@platform.com");
  const [password, setPassword] = useState("Admin@123");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/admin/dashboard" });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email address";
    if (!password || password.length < 4) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.email}`);
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      toast.error(message);
      setErrors({ password: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-sidebar-accent/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 size-72 rounded-full bg-info/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-sidebar-accent/20 grid place-items-center text-sidebar-accent">
            <Stethoscope className="size-6" />
          </div>
          <div>
            <div className="font-display font-bold text-lg">MediOps</div>
            <div className="text-xs text-sidebar-muted">Hospital SaaS Platform</div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="font-display text-4xl font-bold leading-tight">
            The control room for <span className="text-sidebar-accent">25+ hospitals</span>.
          </h2>
          <p className="text-sidebar-muted max-w-md">
            Provision tenants, gate features by package, audit every privileged action — all from one secure portal.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[{ k: "25", v: "Hospitals" }, { k: "320", v: "Doctors" }, { k: "85k", v: "Patients" }].map((s) => (
              <div key={s.v} className="rounded-xl bg-white/5 border border-sidebar-border p-4">
                <div className="font-display text-2xl font-bold">{s.k}</div>
                <div className="text-xs text-sidebar-muted">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-sidebar-muted">
          © 2026 MediOps. SOC2 · HIPAA-ready.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-6 fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Stethoscope className="size-5" />
            </div>
            <div className="font-display font-bold">MediOps</div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 text-accent-foreground px-3 py-1 text-xs font-semibold">
              <Shield className="size-3.5" /> Super Admin Portal
            </div>
            <h1 className="font-display text-3xl font-bold mt-3">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground mt-1">Use your MediOps admin credentials.</p>
          </div>

          <Field label="Work email" icon={<Mail className="size-4" />} error={errors.email}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-sm" placeholder="you@hospital.io" />
          </Field>
          <Field label="Password" icon={<Lock className="size-4" />} error={errors.password}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-sm" placeholder="••••••••" />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-60"
          >
            {submitting ? "Signing in…" : (<>Continue <ArrowRight className="size-4" /></>)}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Need access? <Link to="/admin/login" className="text-accent-foreground font-semibold">Contact your owner</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon, children, error, hint }: {
  label: string; icon: React.ReactNode; children: React.ReactNode; error?: string; hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {hint && !error && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className={`flex items-center gap-2 rounded-lg border bg-card px-3 h-11 transition-colors ${error ? "border-destructive" : "border-input focus-within:border-accent"}`}>
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </label>
  );
}
