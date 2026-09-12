/**
 * LANDLENS auth client.
 *
 * Resolution chain (first available wins):
 *  1. "backend"  — the FastAPI backend (NEXT_PUBLIC_API_URL, default :8000).
 *                  Real accounts, PBKDF2-hashed passwords, session tokens.
 *  2. "supabase" — Supabase credentials via env (full passthrough).
 *  3. "demo"     — no backend reachable: a local session is kept in
 *                  localStorage so the product UI remains explorable (SIH demo).
 *
 * All exports keep their historical shapes so pages need no changes.
 */
import { createClient } from '@supabase/supabase-js'

// ── Config ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Backend base URL. Empty string = same-origin: requests hit the Next.js
 * proxy route (/api/v1/[...path] -> BACKEND_URL), so auth works identically
 * in dev, Docker, and production without CORS or build-time URL baking.
 * Set NEXT_PUBLIC_API_URL to bypass the proxy and call the API directly.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const AUTH_TIMEOUT_MS = 2500

// ── Types ───────────────────────────────────────────────────────────────

export type UserRole = 'operator' | 'verifier' | 'senior' | 'auditor' | 'admin'

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

interface SessionUser {
  id: string
  email: string
}

interface StoredSession {
  mode: 'backend' | 'demo'
  user: SessionUser
  profile?: Profile
  tokens?: { access: string; refresh: string }
  expiresAt?: number
}

// Backend role values -> frontend UserRole
const ROLE_MAP: Record<string, UserRole> = {
  digitization_officer: 'operator',
  verification_officer: 'verifier',
  senior_officer: 'senior',
  auditor: 'auditor',
  administrator: 'admin',
}
const ROLE_TO_BACKEND: Record<UserRole, string> = {
  operator: 'digitization_officer',
  verifier: 'verification_officer',
  senior: 'senior_officer',
  auditor: 'auditor',
  admin: 'administrator',
}

// ── Local session storage ───────────────────────────────────────────────

const SESSION_KEY = 'landlens_session'

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(session: StoredSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
  // legacy key from the previous demo-only client
  window.localStorage.removeItem('landlens_demo_session')
}

function fail(message: string): { data: { session: null }; error: { message: string } } {
  return { data: { session: null }, error: { message } }
}

// ── Backend helpers ─────────────────────────────────────────────────────

async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = AUTH_TIMEOUT_MS) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeoutMs),
  })
}

function profileFromBackendUser(user: { id: number | string; email: string; name: string; role: string }): Profile {
  const now = new Date().toISOString()
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: ROLE_MAP[user.role] ?? 'operator',
    created_at: now,
    updated_at: now,
  }
}

async function backendLogin(email: string, password: string) {
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    // Backend answered authoritatively — do not fall through on bad creds.
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    const detail = body?.detail
    const message =
      typeof detail === 'string'
        ? res.status === 401
          ? 'Invalid email or password.'
          : detail
        : res.status === 401
          ? 'Invalid email or password.'
          : `Login failed (${res.status}).`
    return { ok: false as const, message }
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    user: { id: number; email: string; name: string; role: string }
  }
  const profile = profileFromBackendUser(data.user)
  writeSession({
    mode: 'backend',
    user: { id: profile.id, email: profile.email },
    profile,
    tokens: { access: data.access_token, refresh: data.refresh_token },
    expiresAt: Date.now() + data.expires_in * 1000,
  })
  return { ok: true as const }
}

// ── Public API ──────────────────────────────────────────────────────────

export const signUp = async (email: string, password: string, name: string, role: UserRole) => {
  // 1. FastAPI backend
  try {
    const res = await apiFetch('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role: ROLE_TO_BACKEND[role] ?? 'digitization_officer' }),
    })
    if (res.ok) {
      // Auto-login so the signup flow lands on /dashboard with a real session.
      const login = await backendLogin(email, password)
      if (login.ok) return { user: { id: email, email } }
      return { user: { id: email, email } } // registered — let the user sign in
    }
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    const detail = body?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg?.replace(/^Value error,\s*/, '') ?? String(d)).join('; ')
          : `Registration failed (${res.status}).`
    throw new Error(message)
  } catch (err: any) {
    // Network-level failure (backend offline) — fall through to supabase/demo.
    if (err instanceof TypeError || err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, email, name, role })
        }
        return data
      }
      writeSession({ mode: 'demo', user: { id: `demo-${Date.now()}`, email } })
      return { user: { id: `demo-${Date.now()}`, email } }
    }
    throw err
  }
}

export const signIn = async (email: string, password: string) => {
  // 1. FastAPI backend (authoritative when it answers)
  try {
    const login = await backendLogin(email, password)
    if (login.ok) {
      return { data: { session: { user: readSession()?.user ?? null } }, error: null }
    }
    return fail(login.message)
  } catch (err: any) {
    // Backend unreachable → try supabase, then demo.
    if (isSupabaseConfigured) {
      return await supabase.auth.signInWithPassword({ email, password })
    }
    if (!email || password.length < 6) {
      return fail('Invalid credentials. Password must be at least 6 characters.')
    }
    const session: StoredSession = { mode: 'demo', user: { id: 'demo-officer-001', email } }
    writeSession(session)
    return { data: { session: { user: session.user } }, error: null }
  }
}

export const signOut = async () => {
  const stored = readSession()
  if (stored?.mode === 'backend' && stored.tokens?.access) {
    // Best-effort server-side invalidation; clear locally regardless.
    await apiFetch(
      '/api/v1/auth/logout',
      { method: 'POST', headers: { Authorization: `Bearer ${stored.tokens.access}` } },
      1500,
    ).catch(() => undefined)
  }
  clearSession()
  if (isSupabaseConfigured) {
    return await supabase.auth.signOut()
  }
  return { error: null }
}

export const getSession = async (): Promise<{ user: SessionUser } | null> => {
  if (isSupabaseConfigured) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return { user: { id: session.user.id, email: session.user.email ?? '' } }
  }
  const stored = readSession()
  if (stored) return { user: stored.user }
  return null
}

export const getUserProfile = async (userEmail?: string): Promise<Profile | null> => {
  const stored = readSession()
  if (stored?.mode === 'backend') {
    if (stored.profile) return stored.profile
    // Session predating the profile cache — reconstruct the minimum shape.
    return {
      id: stored.user.id,
      email: stored.user.email,
      name: stored.user.email.split('@')[0],
      role: 'operator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
  if (isSupabaseConfigured && userEmail) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    if (!error && data) return data as Profile
  }
  // Demo profile — presented as the signed-in revenue officer
  return {
    id: 'demo-officer-001',
    email: userEmail || 'operator@landlens.local',
    name: 'R. Deshmukh',
    role: 'operator',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: new Date().toISOString(),
  }
}

export const subscribeToAuthChanges = (callback: (user: any) => void) => {
  if (isSupabaseConfigured) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? readSession()?.user ?? null)
    })
  }
  // No observable in backend/demo modes — report the local session once
  callback(readSession()?.user ?? null)
  return { data: { subscription: { unsubscribe: () => {} } } }
}
