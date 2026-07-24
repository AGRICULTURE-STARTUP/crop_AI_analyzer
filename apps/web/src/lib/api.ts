import type { TokenPair } from "./types";

const ACCESS_KEY = "agriscan_access";
const REFRESH_KEY = "agriscan_refresh";

export function getApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:8000"
  );
}

export function getStoredTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(ACCESS_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!access || !refresh) return null;
  return { access, refresh };
}

export function storeTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message || `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function refreshAccess(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh) return null;
  const res = await fetch(`${getApiBase()}/api/v1/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string; refresh?: string };
  storeTokens({
    access: data.access,
    refresh: data.refresh || tokens.refresh,
  });
  return data.access;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  retry?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, formData, auth = true, retry = true } = options;
  const headers: Record<string, string> = {};

  if (!formData) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const tokens = getStoredTokens();
    if (tokens?.access) {
      headers.Authorization = `Bearer ${tokens.access}`;
    }
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers,
    body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const newAccess = await refreshAccess();
    if (newAccess) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const detail =
      typeof parsed === "object" &&
      parsed &&
      "detail" in parsed &&
      typeof (parsed as { detail: unknown }).detail === "string"
        ? (parsed as { detail: string }).detail
        : undefined;
    throw new ApiError(res.status, parsed, detail);
  }

  return parsed as T;
}

export function roleHome(role: string): string {
  switch (role) {
    case "farmer":
      return "/farmer/scan";
    case "buyer":
      return "/buyer/dashboard";
    case "agency":
      return "/agency/dashboard";
    case "lender":
      return "/lender/dashboard";
    case "admin":
      return "/admin/revenue";
    default:
      return "/";
  }
}
