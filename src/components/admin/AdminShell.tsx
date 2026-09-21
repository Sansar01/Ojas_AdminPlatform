import { Toaster } from "@/components/ui/sonner";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [loading, setLoading] = useState(false);

  // Fake skeleton shimmer on route change
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {loading ? <RouteSkeleton /> : <div className="fade-in">{children}</div>}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function RouteSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-md shimmer" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl shimmer" />)}
      </div>
      <div className="h-72 rounded-xl shimmer" />
    </div>
  );
}
