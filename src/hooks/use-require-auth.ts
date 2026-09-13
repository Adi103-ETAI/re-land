"use client";
import { useEffect, useState } from "react";
import { getSession, isSupabaseConfigured, type SessionInfo } from "@/lib/supabase";

/**
 * Page-level guard: waits for the Supabase session, redirects to /login
 * when signed out. Returns { ready, session, configured }.
 */
export function useRequireAuth() {
  const [state, setState] = useState<{
    ready: boolean;
    session: SessionInfo | null;
    configured: boolean;
  }>({ ready: false, session: null, configured: true });

  useEffect(() => {
    const configured = isSupabaseConfigured();
    if (!configured) {
      setState({ ready: true, session: null, configured: false });
      return;
    }
    let mounted = true;
    (async () => {
      const session = await getSession();
      if (!mounted) return;
      if (!session.user) {
        window.location.href = "/login";
        return;
      }
      setState({ ready: true, session, configured: true });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
