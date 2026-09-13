/**
 * LANDLENS auth — compatibility layer.
 *
 * Authentication is Supabase Auth (see src/lib/supabase.ts). This module
 * re-exports the same helpers under the "@/lib/auth" import path used by
 * the login / signup pages and older components.
 */
export {
  signIn,
  signUp,
  signOut,
  getSession,
  getUserProfile,
  subscribeToAuthChanges,
  isSupabaseConfigured,
  getSupabase,
  requireSupabase,
  type Profile,
  type UserRole,
  type SessionInfo,
} from "@/lib/supabase";

import { getSession } from "@/lib/supabase";

/** Base URL for the extraction pipeline API (same-origin proxy by default). */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

/** Access token of the signed-in Supabase user (null when signed out). */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session.accessToken;
}
