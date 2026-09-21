import { cn } from "@/lib/utils";

/** Display-level status labels (distinct from the backend's DRAFT/ACTIVE/SUSPENDED enum). */
export type BadgeStatus = "Active" | "Trial" | "Expired" | "Suspended" | "Disabled";

export function StatusBadge({ status, className }: { status: BadgeStatus | string; className?: string }) {
  const map: Record<string, string> = {
    Active: "bg-success/15 text-success-foreground ring-success/30",
    Trial: "bg-info/15 text-info-foreground ring-info/30",
    Expired: "bg-warning/20 text-warning-foreground ring-warning/40",
    Suspended: "bg-destructive/15 text-destructive ring-destructive/30",
    Disabled: "bg-muted text-muted-foreground ring-border",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
      map[status] || "bg-muted text-muted-foreground ring-border",
      className,
    )}>
      <span className={cn(
        "size-1.5 rounded-full",
        status === "Active" && "bg-success",
        status === "Trial" && "bg-info",
        status === "Expired" && "bg-warning",
        status === "Suspended" && "bg-destructive",
      )} />
      {status}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    FREE: "bg-muted text-muted-foreground",
    BASIC: "bg-info/15 text-info-foreground",
    PREMIUM: "bg-accent/15 text-accent-foreground",
    ENTERPRISE: "bg-primary text-primary-foreground",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide",
      map[plan?.toUpperCase()] ?? "bg-muted text-muted-foreground",
    )}>
      {plan}
    </span>
  );
}
