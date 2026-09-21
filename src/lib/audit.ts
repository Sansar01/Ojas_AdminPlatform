/* eslint-disable prettier/prettier */
// Presentation helpers for backend audit-log action codes.

const LABELS: Record<string, string> = {
  HOSPITAL_CREATED: "Hospital Created",
  HOSPITAL_SUSPENDED: "Hospital Suspended",
  HOSPITAL_REACTIVATED: "Hospital Reactivated",
  PACKAGE_CREATED: "Package Created",
  PACKAGE_UPDATED: "Package Updated",
  PACKAGE_DELETED: "Package Deleted",
  USER_PASSWORD_RESET: "Password Reset",
};

/** "HOSPITAL_CREATED" → "Hospital Created"; unknown codes get title-cased. */
export function actionLabel(action: string): string {
  if (LABELS[action]) return LABELS[action];
  return action
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Background class for the timeline dot / activity bullet. */
export function actionDotColor(action: string): string {
  if (action === "HOSPITAL_CREATED" || action === "PACKAGE_CREATED") return "bg-success";
  if (
    action === "HOSPITAL_SUSPENDED" ||
    action === "HOSPITAL_DELETED" ||
    action === "PACKAGE_DELETED"
  )
    return "bg-destructive";
  if (action === "PACKAGE_UPDATED" || action === "HOSPITAL_REACTIVATED") return "bg-info";
  return "bg-muted-foreground";
}

/** Ring/pill classes for the audit table's action badge — same colour family as the dot. */
export function actionBadgeClass(action: string): string {
  const dot = actionDotColor(action);
  if (dot === "bg-success") return "bg-success/15 text-success-foreground ring-success/30";
  if (dot === "bg-destructive") return "bg-destructive/15 text-destructive ring-destructive/30";
  if (dot === "bg-info") return "bg-info/15 text-info-foreground ring-info/30";
  return "bg-muted text-muted-foreground ring-border";
}

export const AUDIT_ACTIONS = [
  "HOSPITAL_CREATED",
  "HOSPITAL_SUSPENDED",
  "HOSPITAL_REACTIVATED",
  "PACKAGE_CREATED",
  "PACKAGE_UPDATED",
  "PACKAGE_DELETED",
  "USER_PASSWORD_RESET",
] as const;
