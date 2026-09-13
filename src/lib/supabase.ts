/**
 * LANDLENS auth compatibility layer.
 *
 * The app previously used Supabase auth (with placeholder keys — never worked).
 * Auth is now backed by the LANDLENS FastAPI backend (src/lib/auth.ts).
 * This module keeps the OLD import surface (`@/lib/supabase`) working so all
 * pages keep compiling while being connected to the real backend.
 */
import {
  signIn as backendSignIn,
  signUp as backendSignUp,
  signOut as backendSignOut,
  getSession as backendGetSession,
  getUserProfile as backendGetUserProfile,
  fetchMe,
  subscribeToAuthChanges as backendSubscribe,
  type Profile,
  type UserRole,
} from "@/lib/auth";

export type { Profile, UserRole };

// ── Auth helper functions (same signatures as before) ────────────────────────

export const signIn = async (email: string, password: string) =>
  backendSignIn(email, password);

export const signUp = async (email: string, password: string, name: string, role: UserRole) =>
  backendSignUp(email, password, name, role);

export const signOut = async () => backendSignOut();

export const getSession = async () => backendGetSession();

export const getUserProfile = async (userId: string): Promise<Profile | null> =>
  backendGetUserProfile(userId);

export const subscribeToAuthChanges = (callback: (user: any) => void) =>
  backendSubscribe(callback);

// ── Minimal supabase-like client shim ────────────────────────────────────────

type Thenable<T> = { then: (onfulfilled: (value: T) => any) => any };

interface ProfileQuery {
  select: (_cols: string) => ProfileQuery;
  eq: (_col: string, _val: any) => ProfileQuery;
  single: () => Thenable<{ data: Profile | null; error: null }>;
  insert: (values: Record<string, any>) => Thenable<{ data: null; error: { message: string } | null }>;
}

function makeProfileQuery(): ProfileQuery {
  const chain: ProfileQuery = {
    select: () => chain,
    eq: () => chain,
    single: () =>
      fetchMe().then((data) => ({ data, error: null as null })),
    insert: () =>
      Promise.resolve({ data: null, error: { message: "profiles are managed by the backend" } }),
  };
  return chain;
}

export const supabase = {
  auth: {
    getSession: async () => {
      const session = await backendGetSession();
      return { data: { session: session.user ? { user: session.user } : null }, error: null };
    },
    signInWithPassword: async (creds: { email: string; password: string }) =>
      backendSignIn(creds.email, creds.password),
    signOut: async () => {
      await backendSignOut();
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: { user: any } | null) => void) => {
      backendGetSession().then((session) => {
        callback("INITIAL_SESSION", session.user ? { user: session.user } : null);
      });
      const unsubscribe = backendSubscribe((user) => {
        callback(user ? "SIGNED_IN" : "SIGNED_OUT", user ? { user } : null);
      });
      return { data: { subscription: { unsubscribe } } };
    },
  },
  from: (table: string): ProfileQuery => {
    if (table === "profiles") return makeProfileQuery();
    throw new Error(`Table "${table}" is served by the backend API, not the client shim`);
  },
};
