"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState({
    totalDocuments: 0,
    totalRecords: 0,
    avgConfidence: 0,
    successRate: 0,
    pendingVerification: 0,
    highRiskCount: 0,
    byRole: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setMetrics({
        totalDocuments: 156,
        totalRecords: 2847,
        avgConfidence: 87.4,
        successRate: 94.2,
        pendingVerification: 23,
        highRiskCount: 8,
        byRole: { operator: 45, verifier: 12, senior: 3 },
      });
      setLoading(false);
    };

    fetchData();
  }, []);

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
            <Link href="/analytics" className="font-medium text-[var(--ink-800)]">Analytics</Link>
            <Link href="/audit" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Audit</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-[var(--font-serif)] text-[var(--ink-900)] mb-1">Analytics Dashboard</h1>
            <p className="text-[var(--gray-600)]">Real-time insights into land record digitization</p>
          </div>
          <span className="text-xs text-[var(--gray-500)]">Sample Data — Not Official Statistics</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Documents", value: metrics.totalDocuments, icon: "📄", color: "bg-blue-50" },
            { label: "Records Extracted", value: metrics.totalRecords, icon: "📝", color: "bg-green-50" },
            { label: "Avg Confidence", value: `${metrics.avgConfidence}%`, icon: "✓", color: "bg-purple-50" },
            { label: "Success Rate", value: `${metrics.successRate}%`, icon: "📊", color: "bg-yellow-50" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`card !p-5 ${color}`}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold text-[var(--ink-900)]">{value}</div>
              <div className="text-sm text-[var(--gray-600)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Processing Pipeline Status */}
          <div className="card !p-6">
            <h3 className="font-semibold text-[var(--ink-800)] mb-4">Pipeline Progress</h3>
            <div className="space-y-3">
              {[
                { stage: "Uploaded", count: 156, pct: 100, color: "bg-blue-500" },
                { stage: "Processing", count: 23, pct: 15, color: "bg-yellow-500" },
                { stage: "Completed", count: 133, pct: 85, color: "bg-green-500" },
                { stage: "Failed", count: 0, pct: 0, color: "bg-red-500" },
              ].map(({ stage, count, pct, color }) => (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--ink-700)]">{stage}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Status Distribution */}
          <div className="card !p-6">
            <h3 className="font-semibold text-[var(--ink-800)] mb-4">Validation Status</h3>
            <div className="space-y-3">
              {[
                { status: "Safe (Auto-Approved)", count: 1245, pct: 71, color: "bg-green-500" },
                { status: "Needs Review", count: 456, pct: 26, color: "bg-yellow-500" },
                { status: "High Risk", count: 89, pct: 5, color: "bg-red-500" },
              ].map(({ status, count, pct, color }) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--ink-700)]">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Queue */}
          <div className="card !p-6">
            <h3 className="font-semibold text-[var(--ink-800)] mb-4">Verification Queue</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-[var(--surface-raised)] rounded-lg">
                <div className="text-3xl font-bold text-[var(--yellow-600)]">{metrics.pendingVerification}</div>
                <div className="text-sm text-[var(--gray-600)]">Pending Review</div>
              </div>
              <div className="text-center p-4 bg-[var(--surface-raised)] rounded-lg">
                <div className="text-3xl font-bold text-[var(--red-600)]">{metrics.highRiskCount}</div>
                <div className="text-sm text-[var(--gray-600)]">High Risk Items</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-[var(--gray-600)]">
              Average review time: <span className="font-medium">4.2 minutes</span>
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="card !p-6">
            <h3 className="font-semibold text-[var(--ink-800)] mb-4">Confidence Distribution</h3>
            <div className="space-y-2">
              {[
                { range: "90-100%", count: 1456, pct: 60 },
                { range: "80-90%", count: 623, pct: 26 },
                { range: "70-80%", count: 234, pct: 10 },
                { range: "Below 70%", count: 89, pct: 4 },
              ].map(({ range, count, pct }) => (
                <div key={range} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--gray-600)] w-20">{range}</span>
                  <div className="flex-1 h-3 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--teal-600)] rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium w-12">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="card !p-6">
          <h3 className="font-semibold text-[var(--ink-800)] mb-4">Recent Processing Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-raised)]">
                <tr>
                  <th className="text-left px-4 py-2">Time</th>
                  <th className="text-left px-4 py-2">Document</th>
                  <th className="text-left px-4 py-2">Records</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {[
                  { time: "10:23 AM", doc: "Revenue Survey 45.pdf", records: 12, status: "completed", conf: "92%" },
                  { time: "10:15 AM", doc: "Mutation Register.pdf", records: 8, status: "completed", conf: "88%" },
                  { time: "09:45 AM", doc: "Field Notes Scan.jpg", records: 5, status: "failed", conf: "-" },
                  { time: "09:30 AM", doc: "Survey Plan 2023.pdf", records: 24, status: "processing", conf: "—" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-[var(--gray-600)]">{row.time}</td>
                    <td className="px-4 py-3 font-medium">{row.doc}</td>
                    <td className="px-4 py-3">{row.records}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.status === "completed" ? "bg-green-100 text-green-800" :
                        row.status === "processing" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{row.conf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}