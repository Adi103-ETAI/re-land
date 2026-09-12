/**
 * LANDLENS auth client.
 *
 * Two modes:
 *  - "supabase": real Supabase project credentials provided via env — full passthrough.
 *  - "demo":     no credentials configured — a local session is kept in localStorage
 *                so the entire product UI remains explorable (SIH prototype demo).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Session types
export type UserRole = 'operator' | 'verifier' | 'senior' | 'auditor' | 'admin'

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

interface DemoSession {
  user: { id: string; email: string }
}

const DEMO_KEY = 'landlens_demo_session'

const DEMO_PROFILE: Profile = {
  id: 'demo-officer-001',
  email: 'operator@landlens.local',
  name: 'R. Deshmukh',
  role: 'operator',
  created_at: '2026-01-15T09:00:00Z',
  updated_at: '2026-09-01T09:00:00Z',
}

// ── Demo session helpers ────────────────────────────────────────────────

function readDemoSession(): DemoSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEMO_KEY)
    return raw ? (JSON.parse(raw) as DemoSession) : null
  } catch {
    return null
  }
}

function writeDemoSession(session: DemoSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_KEY, JSON.stringify(session))
}

function clearDemoSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DEMO_KEY)
}

// ── Auth helpers (supabase first, demo fallback) ────────────────────────

export const signUp = async (email: string, password: string, name: string, role: UserRole) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, email, name, role })
    }
    return data
  }
  // Demo mode — accept the registration locally
  writeDemoSession({ user: { id: `demo-${Date.now()}`, email } })
  return { user: { id: `demo-${Date.now()}`, email } }
}

export const signIn = async (email: string, password: string) => {
  if (isSupabaseConfigured) {
    return await supabase.auth.signInWithPassword({ email, password })
  }
  // Demo mode — accept the showcased demo credentials (or any well-formed login)
  if (!email || password.length < 6) {
    return { data: { session: null }, error: { message: 'Invalid credentials. Password must be at least 6 characters.' } }
  }
  const session = { user: { id: DEMO_PROFILE.id, email } }
  writeDemoSession(session)
  return { data: session, error: null }
}

export const signOut = async () => {
  clearDemoSession()
  if (isSupabaseConfigured) {
    return await supabase.auth.signOut()
  }
  return { error: null }
}

export const getSession = async () => {
  if (isSupabaseConfigured) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return session
  }
  const demo = readDemoSession()
  if (demo) {
    return { user: demo.user } as unknown as { user: { id: string; email: string } }
  }
  return null
}

export const getUserProfile = async (userEmail?: string): Promise<Profile | null> => {
  if (isSupabaseConfigured && userEmail) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    if (!error && data) return data as Profile
  }
  // Demo profile — presented as the signed-in revenue officer
  return { ...DEMO_PROFILE, email: userEmail || DEMO_PROFILE.email }
}

export const subscribeToAuthChanges = (callback: (user: any) => void) => {
  if (isSupabaseConfigured) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? readDemoSession()?.user ?? null)
    })
  }
  // Demo mode — no observable; report the local session once
  callback(readDemoSession()?.user ?? null)
  return { data: { subscription: { unsubscribe: () => {} } } }
}
