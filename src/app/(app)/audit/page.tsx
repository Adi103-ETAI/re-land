"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  ip_address: string;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData as Profile);

      // Mock audit logs (replace with real API call)
      const mockLogs: AuditLog[] = [
        {
          id: "log-001",
          user_id: "user-1",
          action: "RECORD_CREATED",
          entity_type: "record",
          entity_id: "rec-001",
          previous_values: {},
          new_values: { surveyNo: "45", khataNo: "234" },
          ip_address: "192.168.1.1",
          created_at: "2026-09-12T08:30:00Z",
        },
        {
          id: "log-002",
          user_id: "user-2",
          action: "EXTRACTION_COMPLETED",
          entity_type: "document",
          entity_id: "doc-001",
          previous_values: { status: "processing" },
          new_values: { status: "completed" },
          ip_address: "192.168.1.2",
          created_at: "2026-09-12T08:32:00Z",
        },
        {
          id: "log-003",
          user_id: "user-2",
          action: "VERIFICATION_ACCEPTED",
          entity_type: "record",
          entity_id: "rec-002",
          previous_values: { verification_status: "pending" },
          new_values: { verification_status: "accepted" },
          ip_address: "192.168.1.2",
          created_at: "2026-09-12T08:45:00Z",
        },
        {
          id: "log-004",
          user_id: "user-1",
          action: "VALIDATION_FAILED",
          entity_type: "record",
          entity_id: "rec-003",
          previous_values: {},
          new_values: { validation_status: "high_risk" },
          ip_address: "192.168.1.1",
          created_at: "2026-09-12T09:00:00Z",
        },
      ];

      setLogs(mockLogs);
      setLoading(false);
    };

    fetchAudit();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "RECORD_CREATED": return "📝";
      case "EXTRACTION_COMPLETED": return "✅";
      case "VERIFICATION_ACCEPTED": return "✓";
      case "VERIFICATION_REJECTED": return "✕";
      case "VALIDATION_FAILED": return "⚠️";
      default: return "📋";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "RECORD_CREATED": return "bg-blue-100 text-blue-800";
      case "EXTRACTION_COMPLETED": return "bg-green-100 text-green-800";
      case "VERIFICATION_ACCEPTED": return "bg-green-100 text-green-800";
      case "VERIFICATION_REJECTED": return "bg-red-100 text-red-800";
      case "VALIDATION_FAILED": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border-hairline)] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-lg text-[var(--ink-800)]">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
            LANDLENS
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Dashboard</Link>
            <Link href="/upload" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Upload</Link>
            <Link href="/records" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Records</Link>
            <Link href="/verification" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Verification</Link>
            <Link href="/audit" className="font-medium text-[var(--ink-800)]">Audit</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-[var(--font-serif)] text-[var(--ink-900)] mb-1">Audit Trail</h1>
            <p className="text-[var(--gray-600)]">Complete history of all actions and changes</p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
            <button className="btn btn-ghost">
              Export Logs
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Events", value: logs.length, icon: "📊" },
            { label: "Records Created", value: logs.filter(l => l.action === "RECORD_CREATED").length, icon: "📝" },
            { label: "Verifications", value: logs.filter(l => l.action.includes("VERIFICATION")).length, icon: "✓" },
            { label: "Alerts", value: logs.filter(l => l.action === "VALIDATION_FAILED").length, icon: "⚠️" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card !p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold text-[var(--ink-900)]">{value}</div>
              <div className="text-sm text-[var(--gray-600)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="card !p-6">
          <h3 className="font-semibold text-[var(--ink-800)] mb-6">Activity Timeline</h3>
          
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="w-px h-full bg-[var(--border-hairline)] mt-2"></div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-[var(--ink-800)]">{log.action.replace(/_/g, " ")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                      {log.entity_type}
                    </span>
                    <span className="text-xs text-[var(--gray-500)]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-[var(--gray-600)]">
                    User: <span className="font-mono">{log.user_id}</span> • IP: <span className="font-mono">{log.ip_address}</span>
                  </p>

                  {/* Changes */}
                  {(Object.keys(log.previous_values).length > 0 || Object.keys(log.new_values).length > 0) && (
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      {Object.keys(log.previous_values).length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-xs text-red-600 font-medium mb-1">Previous Values</div>
                          <pre className="text-xs text-red-800 font-mono overflow-x-auto">
                            {JSON.stringify(log.previous_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {Object.keys(log.new_values).length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-xs text-green-600 font-medium mb-1">New Values</div>
                          <pre className="text-xs text-green-800 font-mono overflow-x-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Section */}
        <div className="mt-8 card !p-6">
          <h3 className="font-semibold text-[var(--ink-800)] mb-4">Export Audit Data</h3>
          <p className="text-sm text-[var(--gray-600)] mb-4">
            Download complete audit trail for compliance and reporting purposes.
          </p>
          <div className="flex gap-3">
            <button className="btn btn-ghost">Export CSV</button>
            <button className="btn btn-ghost">Export JSON</button>
            <button className="btn btn-ghost">Print Report</button>
          </div>
        </div>
      </main>
    </div>
  );
}