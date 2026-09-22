import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Hospital, Package, Users, ScrollText, Stethoscope, ChevronLeft, Power,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/hospitals", label: "Hospitals", icon: Hospital },
  { to: "/admin/activate-hospital", label: "Activate Hospital", icon: Power },
  { to: "/admin/packages", label: "Packages", icon: Package },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
] as const;

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex flex-col",
          collapsed ? "lg:w-20" : "lg:w-64",
          "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="size-9 rounded-xl bg-sidebar-accent/15 grid place-items-center text-sidebar-accent">
            <Stethoscope className="size-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display font-bold text-sm">MediOps</div>
              <div className="text-[11px] text-sidebar-muted">Super Admin</div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_8px_24px_-12px_var(--sidebar-accent)]"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5"
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && <span>{it.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex items-center gap-2 m-3 px-3 py-2 rounded-lg text-xs text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5"
        >
          <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
