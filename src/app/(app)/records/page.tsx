"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SetupNotice } from "@/components/system/states";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { listRecords, type RecordRow } from "@/lib/db";

const FILTERS = [
  { value: "all", label: "All records" },
  { value: "safe", label: "Safe" },
  { value: "review", label: "Needs review" },
  { value: "high_risk", label: "High risk" },
];

const statusBadge: Record<string, string> = {
  safe: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  high_risk: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-800",
};

const verBadge: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  accepted: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  corrected: "bg-purple-100 text-purple-800",
  escalated: "bg-orange-100 text-orange-800",
};

export default function RecordsPage() {
  const { ready, session, configured } = useRequireAuth();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await listRecords(200));
    } catch (e: any) {
      setError(e?.message || "Could not load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && session?.user) load();
  }, [ready, session, load]);

  if (!configured) {
    return (
      <div>
        <PageHeader title="Extracted records" description="Every record digitized by the pipeline." />
        <SetupNotice what="The records registry" />
      </div>
    );
  }

  const filteredRecords =
    filter === "all" ? records : records.filter((r) => r.validation_status === filter);

  return (
    <div>
      <PageHeader
        title="Extracted records"
        description="View and manage digitized land records."
        actions={
          <Link href="/upload">
            <Button className="rounded-full">Upload New Document</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-destructive/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div className="card overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr>
                    {["Record", "Survey No", "Khata No", "Owner Name", "Area", "Confidence", "Validation", "Verification", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/40">
                      <td className="px-5 py-4 font-mono text-sm">{record.record_code ?? record.id.slice(0, 8)}</td>
                      <td className="px-5 py-4 font-mono text-sm">{record.survey_no || "-"}</td>
                      <td className="px-5 py-4 font-mono text-sm">{record.khata_no || "-"}</td>
                      <td className="px-5 py-4 text-sm">{record.owner_name || "-"}</td>
                      <td className="px-5 py-4 text-sm">
                        {record.area_detected != null ? `${record.area_detected} Ha` : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            Number(record.confidence_score ?? 0) >= 0.9
                              ? "bg-green-100 text-green-800"
                              : Number(record.confidence_score ?? 0) >= 0.7
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {(Number(record.confidence_score ?? 0) * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusBadge[record.validation_status] ?? "bg-gray-100 text-gray-800"}`}
                        >
                          {record.validation_status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${verBadge[record.verification_status] ?? "bg-gray-100 text-gray-800"}`}
                        >
                          {record.verification_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/records/${record.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRecords.length === 0 && (
              <EmptyState
                icon={Inbox}
                title={records.length === 0 ? "No records yet" : "No records match this filter"}
                description={
                  records.length === 0
                    ? "Records appear here after you upload and process a document."
                    : "Try a different filter to see more records."
                }
                action={
                  records.length === 0 ? (
                    <Link href="/upload">
                      <Button className="rounded-full">Upload a document</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="rounded-full" onClick={() => setFilter("all")}>
                      Clear filter
                    </Button>
                  )
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
