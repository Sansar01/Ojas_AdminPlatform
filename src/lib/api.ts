/* eslint-disable prettier/prettier */
// Lightweight API client for the MediOps backend.
// Handles bearer tokens, automatic refresh, and JSON parsing.

// export const API_BASE = "http://localhost:3000";
// export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
export const API_BASE = "https://cloud-his-backend.onrender.com";

const ACCESS_KEY = "medi.accessToken";
const REFRESH_KEY = "medi.refreshToken";
const USER_KEY = "medi.user";

export type AuthUser = {
  id: number;
  email: string;
  role: string;
};

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  get user(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set(tokens: { accessToken: string; refreshToken: string; user?: AuthUser }) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    if (tokens.user) localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
    window.dispatchEvent(new Event("medi:auth"));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("medi:auth"));
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let refreshInflight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return null;
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const json = await res.json();
      const data = json?.data ?? json;
      if (data?.accessToken) {
        tokenStore.set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? refreshToken,
          user: data.user ?? tokenStore.user ?? undefined,
        });
        return data.accessToken as string;
      }
      tokenStore.clear();
      return null;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean; raw?: boolean } = {},
): Promise<T> {
  const { auth = true, raw = false, headers, ...rest } = init;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const buildHeaders = (token: string | null): HeadersInit => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string> | undefined),
    };
    if (auth && token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  let res = await fetch(url, { ...rest, headers: buildHeaders(tokenStore.access) });

  if (res.status === 401 && auth) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await fetch(url, { ...rest, headers: buildHeaders(newToken) });
    }
  }

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = (json && (json.message || json.error)) || res.statusText || "Request failed";
    throw new ApiError(res.status, message, json);
  }

  if (raw) return json as T;
  return (json && "data" in json ? json.data : json) as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type HospitalStatus = "DRAFT" | "ACTIVE" | "SUSPENDED";

export type AssignedPackage = {
  id: number;
  packageId: number;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  package: Package;
};

export type Hospital = {
  id: number;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  status: HospitalStatus;
  /** Derived server-side from `status`; see TenantService.withIsActive. */
  isActive: boolean;
  activatedAt?: string | null;
  createdAt: string;
  /** Only present on list/detail reads — status mutations return the bare row. */
  packages?: AssignedPackage[];
};

export type Package = {
  id: number;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxDoctors: number;
  maxStorageGb: number;
  maxBranches: number;
  isPopular: boolean;
  createdAt: string;
  modules?: { module: CatalogModule }[];
  _count?: { assignedPackages: number };
};

export type CatalogModule = {
  id: number;
  name: string;
  description?: string;
};

export type AuditLog = {
  id: number;
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: string;
  targetName: string;
  detail?: string;
  createdAt: string;
};

export type PlatformRole = "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SUPPORT";

/** Shape of PlatformUsersService.toPublicUser — name is pre-joined, status is a boolean. */
export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  isActive: boolean;
  createdAt: string;
};

export type DashboardStats = {
  totalHospitals: number;
  activeHospitals: number;
  totalRevenue: number;
  revenueByMonth: { month: string; revenue: number }[];
  hospitalHealthSnapshot: {
    id: number;
    name: string;
    isActive: boolean;
    packageName: string | null;
  }[];
  recentActivity: AuditLog[];
};

export type SearchResults = {
  query: string;
  results: {
    hospitals: { id: number; name: string; isActive: boolean }[];
    packages: { id: number; name: string; monthlyPrice: number }[];
    users: { id: string; name: string; email: string; role: string }[];
  };
};

export type PendingActivation = {
  id: number;
  name: string;
  code: string;
  createdAt: string;
};

export type ExpiringPackage = {
  hospitalId: number;
  hospitalName: string;
  endDate: string;
  daysLeft: number;
};

export type NotificationsData = {
  pendingActivations: PendingActivation[];
  expiringPackages: ExpiringPackage[];
};

export type AuditLogPage = {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
};

// ---------------------------------------------------------------------------
// Typed endpoints
// ---------------------------------------------------------------------------

export const api = {
  hospitals: {
    list: () => apiFetch<Hospital[]>("/api/hospitals"),
    get: (id: number) => apiFetch<Hospital>(`/api/hospitals/${id}`),
    create: (dto: { name: string; code: string; email: string; phone?: string }) =>
      apiFetch<Hospital>("/api/hospitals", { method: "POST", body: JSON.stringify(dto) }),
    update: (id: number, dto: Partial<Pick<Hospital, "name" | "code" | "email" | "phone">>) =>
      apiFetch<Hospital>(`/api/hospitals/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),
    delete: (id: number) => apiFetch<void>(`/api/hospitals/${id}`, { method: "DELETE" }),
    assignPackage: (id: number, packageId: number) =>
      apiFetch<Hospital>(`/api/hospitals/${id}/packages`, {
        method: "POST",
        body: JSON.stringify({ packageId, startDate: new Date().toISOString() }),
      }),
    activate: (id: number, packageId?: number) =>
      apiFetch<{
        hospital: Hospital;
        admin: { email: string; password?: string };
        created: boolean;
      }>(`/api/hospitals/${id}/activate`, {
        method: "POST",
        body: JSON.stringify({ packageId }),
      }),
    suspend: (id: number) => apiFetch<Hospital>(`/api/hospitals/${id}/suspend`, { method: "POST" }),
    reactivate: (id: number) =>
      apiFetch<Hospital>(`/api/hospitals/${id}/reactivate`, { method: "POST" }),
  },
  packages: {
    list: () => apiFetch<Package[]>("/api/packages"),
    get: (id: number) => apiFetch<Package>(`/api/packages/${id}`),
    create: (dto: Partial<Package>) =>
      apiFetch<Package>("/api/packages", { method: "POST", body: JSON.stringify(dto) }),
    update: (id: number, dto: Partial<Package>) =>
      apiFetch<Package>(`/api/packages/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),
    delete: (id: number) => apiFetch<void>(`/api/packages/${id}`, { method: "DELETE" }),
    attachModule: (packageId: number, moduleId: number) =>
      apiFetch<void>(`/api/packages/${packageId}/modules/${moduleId}`, { method: "POST" }),
    detachModule: (packageId: number, moduleId: number) =>
      apiFetch<void>(`/api/packages/${packageId}/modules/${moduleId}`, { method: "DELETE" }),
  },
  catalog: {
    modules: () => apiFetch<CatalogModule[]>("/api/catalog/modules"),
    features: () => apiFetch<unknown[]>("/api/catalog/features"),
  },
  auditLogs: {
    list: (params?: { page?: number; limit?: number; action?: string; actorEmail?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.action) q.set("action", params.action);
      if (params?.actorEmail) q.set("actorEmail", params.actorEmail);
      // This endpoint's envelope IS the payload ({ data, total, page, limit }),
      // so bypass apiFetch's `data` unwrapping or we'd get the bare array back.
      return apiFetch<AuditLogPage>(`/api/audit-logs?${q}`, { raw: true });
    },
  },
  dashboard: {
    stats: () => apiFetch<DashboardStats>(""),
  },
  platformUsers: {
    list: (role?: string) => {
      const q = role ? `?role=${role}` : "";
      return apiFetch<PlatformUser[]>(`/api/platform-users${q}`);
    },
    get: (id: string) => apiFetch<PlatformUser>(`/api/platform-users/${id}`),
    create: (dto: { name: string; email: string; role: PlatformRole; password?: string }) =>
      apiFetch<PlatformUser>("/api/platform-users", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    update: (id: string, dto: { name?: string; email?: string; role?: PlatformRole }) =>
      apiFetch<PlatformUser>(`/api/platform-users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    delete: (id: string) => apiFetch<void>(`/api/platform-users/${id}`, { method: "DELETE" }),
    disable: (id: string) =>
      apiFetch<void>(`/api/platform-users/${id}/disable`, { method: "POST" }),
    enable: (id: string) => apiFetch<void>(`/api/platform-users/${id}/enable`, { method: "POST" }),
    resetPassword: (id: string, newPassword: string) =>
      apiFetch<{ message: string }>(`/api/platform-users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),
  },
  search: {
    query: (q: string) => apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
  },
  notifications: {
    get: () => apiFetch<NotificationsData>("/api/notifications"),
  },
};

// ---------------------------------------------------------------------------
// Shared formatting helpers
// ---------------------------------------------------------------------------

/** "2h ago", "3d ago" — coarse relative time for audit/activity feeds. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** ₹1,45,000 — Indian digit grouping, no decimals. */
export function formatINR(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value ?? 0)}`;
}
