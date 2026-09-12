"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, getSession } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/supabase";

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: "operator", label: "Field Operator", color: "bg-blue-100 text-blue-800" },
  { value: "verifier", label: "Verifier", color: "bg-green-100 text-green-800" },
  { value: "senior", label: "Senior Officer", color: "bg-yellow-100 text-yellow-800" },
  { value: "auditor", label: "Auditor", color: "bg-purple-100 text-purple-800" },
  { value: "admin", label: "Administrator", color: "bg-red-100 text-red-800" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processingJobs: 0,
    pendingVerification: 0,
    highRiskRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      setProfile(profileData as Profile);

      // Fetch stats (in production, this would query actual backend)
      setStats({
        totalDocuments: 24,
        processingJobs: 3,
        pendingVerification: 12,
        highRiskRecords: 2,
      });

      setLoading(false);
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        window.location.href = "/login";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const currentRole = ROLES.find(r => r.value === profile?.role);

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border-hairline)] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-lg text-[var(--ink-800)]">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
              LANDLENS
            </Link>
            
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/dashboard" className="font-medium text-[var(--ink-800)]">Dashboard</Link>
              <Link href="/upload" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Upload</Link>
              <Link href="/records" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Records</Link>
              <Link href="/verification" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Verification</Link>
              <Link href="/audit" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Audit</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-[var(--ink-800)]">{profile?.name || user?.email?.split("@")[0]}</div>
              {currentRole && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${currentRole.color}`}>
                  {currentRole.label}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-[var(--font-serif)] text-[var(--ink-900)] mb-2">
            Welcome back, {profile?.name || user?.email?.split("@")[0]}!
          </h1>
          <p className="text-[var(--gray-600)]">
            Here&apos;s your land record digitization overview for today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Documents", value: stats.totalDocuments, icon: "📄", color: "bg-blue-50" },
            { label: "Processing Jobs", value: stats.processingJobs, icon: "⚙️", color: "bg-yellow-50" },
            { label: "Pending Verification", value: stats.pendingVerification, icon: "✓", color: "bg-green-50" },
            { label: "High Risk Records", value: stats.highRiskRecords, icon: "⚠️", color: "bg-red-50" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`card !p-5 ${color}`}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold text-[var(--ink-900)]">{value}</div>
              <div className="text-sm text-[var(--gray-600)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card !p-6 mb-8">
          <h2 className="font-semibold text-[var(--ink-900)] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/upload" className="btn btn-teal">
              Upload Document
            </Link>
            <Link href="/verification" className="btn btn-ghost">
              Review Queue
            </Link>
            <Link href="/records" className="btn btn-ghost">
              View Records
            </Link>
            <Link href="/audit" className="btn btn-ghost">
              Audit Trail
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card !p-6">
          <h2 className="font-semibold text-[var(--ink-900)] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: "Document uploaded", detail: "Revenue Survey No. 45.pdf", time: "2 minutes ago", icon: "📄" },
              { action: "Extraction completed", detail: "Record #12847 - Confidence: 94%", time: "15 minutes ago", icon: "✓" },
              { action: "Verification pending", detail: "High-risk record #12850 flagged", time: "1 hour ago", icon: "⚠️" },
              { action: "Record approved", detail: "Khasra No. 234 by Verifier A", time: "2 hours ago", icon: "✅" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--border-hairline)] last:border-0">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-[var(--ink-800)]">{item.action}</div>
                  <div className="text-sm text-[var(--gray-600)]">{item.detail}</div>
                </div>
                <div className="text-xs text-[var(--gray-500)]">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}