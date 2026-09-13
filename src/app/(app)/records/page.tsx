"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSession, getUserProfile, type Profile } from "@/lib/supabase";

interface CaseRecord {
  id: string;
  document_id: string;
  page_number: number;
  fields: Record<string, any>;
  confidence_score: number;
  validation_status: string;
  verification_status: string;
  created_at: string;
}

// Demo rows shown when the backend has no records yet
const DEMO_RECORDS: CaseRecord[] = [
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

export default function RecordsPage() {
  const [records, setRecords] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await getSession();
      if (!session?.user) {
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

      // Fetch records from the backend API; fall back to demo rows
      try {
        const res = await fetch("/api/records", {
          headers: { Authorization: `Bearer ${localStorage.getItem("landlens.access_token") ?? ""}` },
        });
        if (res.ok) {
          const data = await res.json();
          const apiRecords: CaseRecord[] = (data.records ?? []).map((r: any, i: number) => ({
            id: String(r.recId ?? i),
            document_id: String(r.documentId ?? "—"),
            page_number: 1,
            fields: Object.fromEntries((r.fields ?? []).map((f: any) => [f.key, f.value])),
            confidence_score: r.extractionConfidence ?? 0.9,
            validation_status: r.status === "completed" ? "safe" : "review",
            verification_status: "pending",
            created_at: r.validation?.runAt ?? new Date().toISOString(),
          }));
          setRecords(apiRecords.length > 0 ? apiRecords : DEMO_RECORDS);
        } else {
          setRecords(DEMO_RECORDS);
        }
      } catch {
        setRecords(DEMO_RECORDS);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
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
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Extracted records"
        description="View and manage digitized land records."
        actions={
          <Link href="/upload">
            <Button className="rounded-full shadow-md shadow-primary/20">
              <Upload className="h-4 w-4" /> Upload new document
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              filter === value
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden border-border/80 py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              <TableHead className="h-11 rounded-tl-2xl">Survey №</TableHead>
              <TableHead className="h-11">Khata №</TableHead>
              <TableHead className="h-11">Owner name</TableHead>
              <TableHead className="h-11">Area</TableHead>
              <TableHead className="h-11">Confidence</TableHead>
              <TableHead className="h-11">Status</TableHead>
              <TableHead className="h-11 rounded-tr-2xl text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="border-border/70">
                <TableCell className="py-4 font-mono text-sm font-semibold">
                  {record.fields.surveyNo || "—"}
                </TableCell>
                <TableCell className="py-4 font-mono text-sm">{record.fields.khataNo || "—"}</TableCell>
                <TableCell className="py-4 text-sm">{record.fields.ownerName || "—"}</TableCell>
                <TableCell className="py-4 text-sm">{record.fields.area || "—"}</TableCell>
                <TableCell className="py-4">
                  <Badge
                    className={`rounded-md font-mono text-[11px] font-bold ${
                      record.confidence_score >= 0.9
                        ? STATUS_STYLES.safe
                        : record.confidence_score >= 0.7
                          ? STATUS_STYLES.review
                          : STATUS_STYLES.high_risk
                    }`}
                  >
                    {(record.confidence_score * 100).toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <Badge className={`rounded-md text-[10px] font-extrabold tracking-wide ${STATUS_STYLES[record.validation_status] || STATUS_STYLES.pending}`}>
                    {record.validation_status.replace("_", " ").toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-right">
                  <Link
                    href={`/records/${record.id}`}
                    className="text-sm font-medium text-primary transition-colors hover:underline"
                  >
                    View details
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center py-14">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FolderOpen className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">No records found for this filter</p>
            <button onClick={() => setFilter("all")} className="mt-3 text-sm font-medium text-primary hover:underline">
              Clear filter
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
