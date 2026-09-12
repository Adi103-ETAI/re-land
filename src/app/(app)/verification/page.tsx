"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

interface VerificationItem {
  id: string;
  record_id: string;
  fields: Record<string, any>;
  confidence_score: number;
  validation_status: string;
  verification_status: string;
  created_at: string;
}

export default function VerificationPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
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

      // Mock verification queue (replace with real API)
      const mockItems: VerificationItem[] = [
        {
          id: "v1",
          record_id: "rec-001",
          fields: { surveyNo: "45", khataNo: "234", ownerName: "Rajesh Kumar", area: "2.5 acres" },
          confidence_score: 0.72,
          validation_status: "review",
          verification_status: "pending",
          created_at: "2026-09-12T08:30:00Z",
        },
        {
          id: "v2",
          record_id: "rec-002",
          fields: { surveyNo: "46", khataNo: "235", ownerName: "Sita Devi", area: "1.8 acres" },
          confidence_score: 0.65,
          validation_status: "high_risk",
          verification_status: "pending",
          created_at: "2026-09-12T08:35:00Z",
        },
        {
          id: "v3",
          record_id: "rec-003",
          fields: { surveyNo: "47", khataNo: "236", ownerName: "Amit Sharma", area: "3.2 acres" },
          confidence_score: 0.88,
          validation_status: "review",
          verification_status: "pending",
          created_at: "2026-09-12T08:40:00Z",
        },
      ];

      setItems(mockItems);
      setCurrentId(mockItems[0]?.id || null);
      setLoading(false);
    };

    fetchVerification();
  }, []);

  const currentItem = items.find(i => i.id === currentId);

  const handleAccept = async () => {
    if (!currentItem) return;
    
    // Update in Supabase (mock for now)
    setItems(prev => prev.map(item =>
      item.id === currentId ? { ...item, verification_status: "accepted" } : item
    ));
    
    // Move to next
    const currentIndex = items.findIndex(i => i.id === currentId);
    if (currentIndex < items.length - 1) {
      setCurrentId(items[currentIndex + 1].id);
    }
    setNote("");
  };

  const handleReject = async () => {
    if (!currentItem) return;
    
    setItems(prev => prev.map(item =>
      item.id === currentId ? { ...item, verification_status: "rejected" } : item
    ));
    
    const currentIndex = items.findIndex(i => i.id === currentId);
    if (currentIndex < items.length - 1) {
      setCurrentId(items[currentIndex + 1].id);
    }
    setNote("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading verification queue...</p>
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
            <Link href="/verification" className="font-medium text-[var(--ink-800)]">Verification</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-[var(--font-serif)] text-[var(--ink-900)] mb-1">Verification Queue</h1>
            <p className="text-[var(--gray-600)]">
              {items.filter(i => i.verification_status === "pending").length} pending items
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Queue List */}
          <div className="lg:col-span-1">
            <div className="card !p-4">
              <h3 className="font-semibold text-[var(--ink-800)] mb-4">Queue ({items.filter(i => i.verification_status === "pending").length})</h3>
              <div className="space-y-2">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentId(item.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentId === item.id
                        ? "bg-[var(--teal-50)] border border-[var(--teal-200)]"
                        : "hover:bg-[var(--surface-raised)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--ink-800)] text-sm">
                        Survey No: {item.fields.surveyNo}
                      </span>
                      {item.verification_status !== "pending" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.verification_status === "accepted" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {item.verification_status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--gray-600)] mt-1">
                      Khata: {item.fields.khataNo} • Confidence: {(item.confidence_score * 100).toFixed(0)}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Current Item */}
          {currentItem && (
            <div className="lg:col-span-2 space-y-6">
              {/* Record Details */}
              <div className="card !p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[var(--ink-800)]">
                    Record #{currentItem.record_id}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    currentItem.validation_status === "high_risk" ? "bg-red-100 text-red-800" :
                    currentItem.validation_status === "review" ? "bg-yellow-100 text-yellow-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {currentItem.validation_status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Survey Number", value: currentItem.fields.surveyNo },
                    { label: "Khata Number", value: currentItem.fields.khataNo },
                    { label: "Owner Name", value: currentItem.fields.ownerName },
                    { label: "Area", value: currentItem.fields.area },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-4 bg-[var(--surface-raised)] rounded-lg">
                      <div className="text-xs text-[var(--gray-600)] mb-1">{label}</div>
                      <div className="font-medium text-[var(--ink-800)]">{value || "-"}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--surface-raised)] rounded-lg">
                  <div>
                    <div className="text-xs text-[var(--gray-600)]">Confidence Score</div>
                    <div className="text-2xl font-bold text-[var(--ink-800)]">
                      {(currentItem.confidence_score * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-32 h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--teal-600)] rounded-full"
                      style={{ width: `${currentItem.confidence_score * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="card !p-6">
                <h3 className="font-semibold text-[var(--ink-800)] mb-4">Verification Actions</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--ink-700)] mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="input w-full resize-none"
                    placeholder="Add verification notes..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAccept}
                    className="btn btn-teal flex-1"
                  >
                    ✓ Accept Record
                  </button>
                  <button
                    onClick={handleReject}
                    className="btn btn-danger flex-1"
                  >
                    ✕ Reject & Flag
                  </button>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="card !p-6">
                <h3 className="font-semibold text-[var(--ink-800)] mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Low Confidence Alert</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Confidence score ({(currentItem.confidence_score * 100).toFixed(0)}%) is below threshold. Manual verification recommended.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-lg">💡</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Format Issue Detected</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Owner name format may not match standard pattern. Please verify.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}