"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

interface Record {
  id: string;
  document_id: string;
  page_number: number;
  fields: Record<string, any>;
  confidence_score: number;
  validation_status: string;
  verification_status: string;
  created_at: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
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

      // Fetch records (mock for now, replace with real API call)
      const mockRecords: Record[] = [
        {
          id: "1",
          document_id: "doc-001",
          page_number: 1,
          fields: { surveyNo: "45", khataNo: "234", ownerName: "Rajesh Kumar", area: "2.5 acres" },
          confidence_score: 0.94,
          validation_status: "safe",
          verification_status: "pending",
          created_at: "2026-09-12T08:30:00Z",
        },
        {
          id: "2",
          document_id: "doc-001",
          page_number: 2,
          fields: { surveyNo: "46", khataNo: "235", ownerName: "Sita Devi", area: "1.8 acres" },
          confidence_score: 0.87,
          validation_status: "review",
          verification_status: "pending",
          created_at: "2026-09-12T08:31:00Z",
        },
        {
          id: "3",
          document_id: "doc-002",
          page_number: 1,
          fields: { surveyNo: "47", khataNo: "236", ownerName: "Amit Sharma", area: "3.2 acres" },
          confidence_score: 0.91,
          validation_status: "safe",
          verification_status: "accepted",
          created_at: "2026-09-12T07:45:00Z",
        },
      ];

      setRecords(mockRecords);
      setLoading(false);
    };

    fetchRecords();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      safe: "bg-green-100 text-green-800",
      review: "bg-yellow-100 text-yellow-800",
      high_risk: "bg-red-100 text-red-800",
      pending: "bg-gray-100 text-gray-800",
      accepted: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const filteredRecords = filter === "all" 
    ? records 
    : records.filter(r => r.validation_status === filter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading records...</p>
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
            <Link href="/records" className="font-medium text-[var(--ink-800)]">Records</Link>
            <Link href="/verification" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Verification</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-[var(--font-serif)] text-[var(--ink-900)] mb-1">Extracted Records</h1>
            <p className="text-[var(--gray-600)]">View and manage digitized land records</p>
          </div>
          <Link href="/upload" className="btn btn-teal">
            Upload New Document
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: "all", label: "All Records" },
            { value: "safe", label: "Safe" },
            { value: "review", label: "Needs Review" },
            { value: "high_risk", label: "High Risk" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-[var(--teal-600)] text-white"
                  : "bg-white text-[var(--gray-600)] hover:bg-[var(--gray-50)] border border-[var(--border-hairline)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Records Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--surface-raised)] border-b border-[var(--border-hairline)]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Survey No</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Khata No</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Owner Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Area</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Confidence</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--gray-600)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-[var(--surface-raised)]">
                  <td className="px-6 py-4 font-mono text-sm">{record.fields.surveyNo || "-"}</td>
                  <td className="px-6 py-4 font-mono text-sm">{record.fields.khataNo || "-"}</td>
                  <td className="px-6 py-4 text-sm">{record.fields.ownerName || "-"}</td>
                  <td className="px-6 py-4 text-sm">{record.fields.area || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      record.confidence_score >= 0.9 ? "bg-green-100 text-green-800" :
                      record.confidence_score >= 0.7 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {(record.confidence_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.validation_status)}`}>
                      {record.validation_status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/records/${record.id}`}
                      className="text-sm text-[var(--teal-600)] hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-[var(--gray-600)]">No records found for this filter</p>
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-sm text-[var(--teal-600)] hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}