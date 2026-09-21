/* eslint-disable prettier/prettier */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Building2, UserRound, IndianRupee, HardDrive, Plus, Package as PackageIcon, ArrowUpRight, Activity, RefreshCw } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts";
import { StatusBadge } from "@/components/admin/Badges";
import { api, formatINR, timeAgo, type DashboardStats } from "@/lib/api";
import { actionDotColor, actionLabel } from "@/lib/audit";

export const Route = createFileRoute("/admin/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MediOps Super Admin" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.dashboard
      .stats()
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Chart wants ₹ thousands under the `m` / `v` keys the original UI used.
  const chartData = (stats?.revenueByMonth ?? []).map((r) => ({
    m: r.month,
    v: Math.round(r.revenue / 1000),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Operations overview</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/hospitals/create" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95">
            <Plus className="size-4" /> Add Hospital
          </Link>
          <Link to="/admin/packages/create" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-muted">
            <PackageIcon className="size-4" /> Create Package
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center shadow-card">
          <div className="text-sm font-semibold text-destructive">Failed to load dashboard data.</div>
          <div className="text-xs text-muted-foreground mt-1">{error}</div>
          <button onClick={load} className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95">
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : loading || !stats ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Hospitals"
              value={String(stats.totalHospitals)}
              delta={`${stats.activeHospitals} currently active`}
              icon={<Building2 className="size-5" />}
              breakdown={[
                { k: "Active", v: stats.activeHospitals, tone: "bg-success" },
                { k: "Inactive", v: Math.max(0, stats.totalHospitals - stats.activeHospitals), tone: "bg-muted-foreground" },
              ]}
            />
            <StatCard label="Doctors / Patients" value="—" delta="Not tracked yet" icon={<UserRound className="size-5" />} />
            <StatCard label="Monthly Revenue" value={formatINR(stats.totalRevenue)} delta="Across active subscriptions" icon={<IndianRupee className="size-5" />} />
            <StatCard label="Storage Used" value="—" delta="Not tracked yet" icon={<HardDrive className="size-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg">Revenue trend</h2>
                  <p className="text-xs text-muted-foreground">Monthly recurring revenue (₹ thousands)</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success-foreground text-xs font-semibold px-2.5 py-1">
                  <ArrowUpRight className="size-3" /> {chartData.length} months
                </span>
              </div>
              <div className="h-56">
                {chartData.length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground">
                    No revenue data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.72 0.16 160)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="oklch(0.72 0.16 160)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="m" stroke="oklch(0.5 0.03 255)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                      <Area type="monotone" dataKey="v" stroke="oklch(0.55 0.15 160)" strokeWidth={2.5} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg flex items-center gap-2"><Activity className="size-4" /> Recent activity</h2>
                <Link to="/admin/audit-logs" className="text-xs font-semibold text-accent-foreground hover:underline">View all</Link>
              </div>
              {stats.recentActivity.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No activity yet.</div>
              ) : (
                <ul className="space-y-4">
                  {stats.recentActivity.slice(0, 5).map((log) => (
                    <li key={log.id} className="flex items-start gap-3">
                      <span className={`mt-1.5 size-2 rounded-full shrink-0 ${actionDotColor(log.action)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {actionLabel(log.action)}{" "}
                          <span className="text-muted-foreground font-normal">· {log.targetName}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {log.actorEmail} · {timeAgo(log.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display font-bold text-lg mb-4">Hospital health snapshot</h2>
            {stats.hospitalHealthSnapshot.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hospitals onboarded yet.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {stats.hospitalHealthSnapshot.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border p-4 hover-lift">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm truncate">{h.name}</div>
                      <StatusBadge status={h.isActive ? "Active" : "Suspended"} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{h.packageName ?? "No package"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-muted h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-pulse rounded-2xl bg-muted h-80" />
        <div className="animate-pulse rounded-2xl bg-muted h-80" />
      </div>
      <div className="animate-pulse rounded-2xl bg-muted h-32" />
    </div>
  );
}

function StatCard({ label, value, delta, icon, breakdown, progress }: {
  label: string; value: string; delta: string; icon: React.ReactNode;
  breakdown?: { k: string; v: number; tone: string }[]; progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card hover-lift">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="size-9 rounded-lg bg-accent/15 text-accent-foreground grid place-items-center">{icon}</div>
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{delta}</div>
      {breakdown && (
        <div className="flex gap-3 mt-3 text-[11px] text-muted-foreground">
          {breakdown.map((b) => (
            <span key={b.k} className="inline-flex items-center gap-1">
              <span className={`size-2 rounded-full ${b.tone}`} /> {b.k} {b.v}
            </span>
          ))}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
