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

interface LandRecord {
  id: string;
  document_id: string;
  page_number: number;
  fields: Record<string, any>;
  confidence_score: number;
  validation_status: string;
  verification_status: string;
  created_at: string;
}

const FILTERS = [
  { value: "all", label: "All records" },
  { value: "safe", label: "Safe" },
  { value: "review", label: "Needs review" },
  { value: "high_risk", label: "High risk" },
];

const STATUS_STYLES: Record<string, string> = {
  safe: "bg-[var(--success-soft)] text-[var(--success)]",
  review: "bg-[var(--warning-soft)] text-warning",
  high_risk: "bg-[var(--destructive-soft)] text-destructive",
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-accent text-accent-foreground",
  rejected: "bg-[var(--destructive-soft)] text-destructive",
};

export default function RecordsPage() {
  const [records, setRecords] = useState<LandRecord[]>([]);
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
      const p = await getUserProfile(session.user.email);
      if (!mounted) return;
      setProfile(p);
      setRecords([
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
      ]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRecords =
    filter === "all" ? records : records.filter((r) => r.validation_status === filter);

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
