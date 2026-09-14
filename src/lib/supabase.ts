/**
 * LANDLENS — real Supabase client.
 *
 * Auth, database and file storage all run through Supabase.
 * Credentials come from .env.local (see .env.example):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
 *
 * Before the keys are filled in, `getSupabase()` returns null and every
 * page renders a setup notice instead of fake/demo data.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type UserRole = "operator" | "verifier" | "senior" | "auditor" | "admin";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  district?: string | null;
  created_at?: string;
  updated_at?: string;
}

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Returns the shared Supabase client, or null when env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Same as getSupabase() but throws a descriptive error. */
export function requireSupabase(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }
  return sb;
}

// ── Auth helpers ─────────────────────────────────────────────

function mapProfile(row: any): Profile | null {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email ?? "",
    name: row.name ?? "",
    role: (row.role ?? "operator") as UserRole,
    phone: row.phone ?? null,
    district: row.district ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function signIn(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: { message: "Supabase is not configured — add your keys to .env.local" } };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { data: null, error: { message: error.message } };
  return { data: { user: data.user }, error: null };
}

export async function signUp(email: string, password: string, name: string, role: UserRole) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: { message: "Supabase is not configured — add your keys to .env.local" } };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name, role } }, // consumed by the handle_new_user trigger
  });
  if (error) return { data: null, error: { message: error.message } };
  // If the project requires email confirmation there is no session yet.
  return { data: { user: data.user, needsConfirmation: !data.session }, error: null };
}

export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) return { data: null, error: { message: "Supabase is not configured — add your keys to .env.local" } };
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { data: null, error: { message: error.message } };
  // Supabase returns { provider, url } and redirects the browser to the URL.
  // The actual session is available after redirect via detectSessionInUrl.
  if (data?.url && typeof window !== "undefined") {
    window.location.href = data.url;
  }
  return { data, error: null };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

export interface SessionInfo {
  user: { id: string; email?: string } | null;
  accessToken: string | null;
}

export async function getSession(): Promise<SessionInfo> {
  const sb = getSupabase();
  if (!sb) return { user: null, accessToken: null };
  const { data } = await sb.auth.getSession();
  const user = data.session?.user ?? null;
  return { user: user ? { id: user.id, email: user.email } : null, accessToken: data.session?.access_token ?? null };
}

/** Fetch the profile row for a user (defaults to the signed-in user). */
export async function getUserProfile(userIdOrEmail?: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: sessionData } = await sb.auth.getSession();
  const sessionUser = sessionData.session?.user;
  if (!sessionUser) return null;

  const query = sb.from("profiles").select("*");
  const { data, error } =
    userIdOrEmail && userIdOrEmail.includes("@")
      ? await query.eq("email", userIdOrEmail).limit(1)
      : userIdOrEmail
        ? await query.eq("id", userIdOrEmail).limit(1)
        : await query.eq("id", sessionUser.id).limit(1);
  if (error) return null;
  const found = mapProfile(Array.isArray(data) ? data[0] : data);
  if (found) return found;

  // No profile row (e.g. signed up before the trigger existed, or Google
  // OAuth) — create one from the auth metadata so the UI never falls back
  // to a generic "Officer" label. Best effort: fail open with a local stub.
  if (!userIdOrEmail || userIdOrEmail === sessionUser.id) {
    const meta = (sessionUser.user_metadata ?? {}) as Record<string, unknown>;
    const fallback: Profile = {
      id: sessionUser.id,
      email: sessionUser.email ?? "",
      name:
        (typeof meta.name === "string" && meta.name) ||
        (typeof meta.full_name === "string" && meta.full_name) ||
        (sessionUser.email ?? "").split("@")[0] ||
        "Officer",
      role: (typeof meta.role === "string" ? meta.role : "operator") as Profile["role"],
    };
    try {
      const { error: insertError } = await sb.from("profiles").insert({
        id: fallback.id,
        email: fallback.email,
        name: fallback.name,
        role: fallback.role,
      });
      if (insertError) return fallback;
      return fallback;
    } catch {
      return fallback;
    }
  }
  return null;
}

/** Subscribe to auth state changes; returns an unsubscribe function. */
export function subscribeToAuthChanges(callback: (user: { id: string; email?: string } | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? { id: session.user.id, email: session.user.email } : null);
  });
  return () => data.subscription.unsubscribe();
}
