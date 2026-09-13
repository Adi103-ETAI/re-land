/**
 * Backend auth client for LANDLENS.
 * Talks to the FastAPI backend (/api/v1/auth/*) via Next.js API proxies
 * or directly via NEXT_PUBLIC_API_URL when configured.
 */

export type UserRole = "operator" | "verifier" | "senior" | "auditor" | "admin";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  org_scope?: Record<string, string> | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSession {
  user: { id: string; email: string; name?: string; role?: UserRole } | null;
  accessToken: string | null;
}

const TOKEN_KEY = "landlens.access_token";
const REFRESH_KEY = "landlens.refresh_token";
const USER_KEY = "landlens.user";

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function persistTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

function persistUser(user: Profile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("landlens:auth-change", { detail: user }));
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Low-level POST to the backend auth API (through proxy or direct). */
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${getApiBase()}${path}`, init);
  return res;
}

export async function signIn(email: string, password: string) {
  const res = await authFetch("/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: { message: data.detail || "Invalid email or password" }, data: null };
  }
  persistTokens(data.access_token, data.refresh_token);
  const user: Profile = {
    id: String(data.user?.id ?? ""),
    email: data.user?.email ?? email,
    name: data.user?.name ?? "",
    role: (data.user?.role ?? "operator") as UserRole,
    org_scope: data.user?.org_scope ?? null,
  };
  persistUser(user);
  return { data: { user }, error: null };
}

export async function signUp(email: string, password: string, name: string, role: UserRole) {
  const res = await authFetch("/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: { message: data.detail || "Registration failed" }, data: null };
  }
  // Auto sign-in after successful registration
  return signIn(email, password);
}

export async function signOut(): Promise<void> {
  const token = getAccessToken();
  if (token) {
    try {
      await authFetch("/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // best-effort — clear locally regardless
    }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("landlens:auth-change", { detail: null }));
}

export async function getSession(): Promise<AuthSession> {
  if (typeof window === "undefined") return { user: null, accessToken: null };
  const token = getAccessToken();
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return { user: null, accessToken: null };
  try {
    return { user: JSON.parse(rawUser), accessToken: token };
  } catch {
    return { user: null, accessToken: null };
  }
}

/** Fetch the authoritative profile from the backend. */
export async function fetchMe(): Promise<Profile | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const res = await authFetch("/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    const user: Profile = {
      id: String(data.id ?? ""),
      email: data.email ?? "",
      name: data.name ?? "",
      role: (data.role ?? "operator") as UserRole,
      org_scope: data.org_scope ?? null,
    };
    persistUser(user);
    return user;
  } catch {
    return null;
  }
}

export async function getUserProfile(_userId: string): Promise<Profile | null> {
  // Backend is token-based; /auth/me returns the current user's profile.
  return fetchMe();
}

export function subscribeToAuthChanges(callback: (user: Profile | null) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent).detail ?? null);
  window.addEventListener("landlens:auth-change", handler);
  return () => window.removeEventListener("landlens:auth-change", handler);
}
