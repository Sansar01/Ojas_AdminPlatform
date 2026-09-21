/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, RefreshCw } from "lucide-react";
import { api, timeAgo, type AuditLog } from "@/lib/api";
import { actionBadgeClass, actionDotColor, actionLabel, AUDIT_ACTIONS } from "@/lib/audit";

export const Route = createFileRoute("/admin/_shell/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — MediOps" }] }),
  component: AuditLogsPage,
});

const LIMIT = 20;

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    console.log("fetching audit logs", { page, limit: LIMIT, action });
    api.auditLogs
      .list({ page, limit: LIMIT, action: action === "all" ? undefined : action })
      .then((data) => {
        console.log("audit logs response:", data);
        setLogs(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e: unknown) => {
        console.error("audit logs request failed:", e);
        setError(e instanceof Error ? e.message : "Failed to load audit logs");
      })
      .finally(() => setLoading(false));
  }, [page, action]);

  useEffect(() => { load(); }, [load]);

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const hasNext = page * LIMIT < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Every privileged action across the platform.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card flex flex-wrap gap-3">
        {/* Date range is display-only until the backend supports it. */}
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 h-10 opacity-60">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Last 30 days</span>
        </div>
        <select
          value={action}
          onChange={(e) => { setPage(1); setAction(e.target.value); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>{actionLabel(a)}</option>
          ))}
        </select>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="size-3" /> {total} entries
        </span>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-16 text-center shadow-card">
          <div className="text-sm font-semibold text-destructive">Failed to load audit logs.</div>
          <div className="text-xs text-muted-foreground mt-1">{error}</div>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 animate-pulse rounded-2xl bg-muted h-96" />
          <div className="lg:col-span-3 animate-pulse rounded-2xl bg-muted h-96" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display font-bold mb-4">Timeline</h2>
              {logs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No entries.</div>
              ) : (
                <ol className="relative border-l-2 border-border pl-5 space-y-5">
                  {logs.slice(0, 8).map((l) => (
                    <li key={l.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-background ${actionDotColor(l.action)}`}
                      />
                      <div className="text-sm font-semibold">{actionLabel(l.action)}</div>
                      <div className="text-xs text-muted-foreground">{l.targetName}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {l.actorEmail} · {timeAgo(l.createdAt)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">Timestamp</th>
                      <th className="text-left font-semibold px-5 py-3">User</th>
                      <th className="text-left font-semibold px-5 py-3">Action</th>
                      <th className="text-left font-semibold px-5 py-3">Target</th>
                      <th className="text-left font-semibold px-5 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs">
                          {new Date(l.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-3 font-medium">{l.actorEmail}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset whitespace-nowrap ${actionBadgeClass(l.action)}`}>
                            {actionLabel(l.action)}
                          </span>
                        </td>
                        <td className="px-5 py-3">{l.targetName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{l.detail ?? "—"}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-sm font-semibold">
                          No audit entries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Showing {from}–{to} of {total} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-40"
              >
                Next <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
