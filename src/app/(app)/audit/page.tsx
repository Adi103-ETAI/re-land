"use client";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FilePlus2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSession, getUserProfile, type Profile } from "@/lib/supabase";

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

const ACTION_META: Record<string, { icon: typeof FilePlus2; cls: string }> = {
  RECORD_CREATED: { icon: FilePlus2, cls: "bg-accent text-accent-foreground" },
  EXTRACTION_COMPLETED: { icon: CheckCircle2, cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  VERIFICATION_ACCEPTED: { icon: ShieldCheck, cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  VERIFICATION_REJECTED: { icon: XCircle, cls: "bg-[var(--destructive-soft)] text-destructive" },
  VALIDATION_FAILED: { icon: AlertTriangle, cls: "bg-[var(--warning-soft)] text-warning" },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
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
      setLogs([
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
      ]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered =
    filter === "all"
      ? logs
      : logs.filter((l) =>
          filter === "created"
            ? l.action === "RECORD_CREATED"
            : filter === "verified"
              ? l.action.includes("VERIFICATION")
              : l.action === "VALIDATION_FAILED"
        );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Complete history of all actions and changes — immutable and attributable."
        actions={
          <>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-9 cursor-pointer rounded-full border border-border bg-card px-3.5 text-sm font-medium outline-none transition-colors hover:bg-muted"
            >
              <option value="all">All actions</option>
              <option value="created">Created</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
            <Button variant="outline" className="rounded-full">
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total events", value: logs.length, icon: ClipboardList },
          { label: "Records created", value: logs.filter((l) => l.action === "RECORD_CREATED").length, icon: FilePlus2 },
          { label: "Verifications", value: logs.filter((l) => l.action.includes("VERIFICATION")).length, icon: ShieldCheck },
          { label: "Alerts", value: logs.filter((l) => l.action === "VALIDATION_FAILED").length, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/80">
            <CardContent className="p-5">
              <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="font-mono text-3xl font-bold">{value}</div>
              <div className="mt-1 text-[13px] font-medium">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity timeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-1">
            {filtered.map((log) => {
              const meta = ACTION_META[log.action] ?? {
                icon: ClipboardList,
                cls: "bg-muted text-muted-foreground",
              };
              const Icon = meta.icon;
              const hasPrev = Object.keys(log.previous_values).length > 0;
              const hasNext = Object.keys(log.new_values).length > 0;
              return (
                <div key={log.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${meta.cls}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-semibold">{log.action.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="rounded-md text-[10px] font-bold uppercase text-muted-foreground">
                        {log.entity_type} · {log.entity_id}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      User <span className="font-mono">{log.user_id}</span> · IP{" "}
                      <span className="font-mono">{log.ip_address}</span>
                    </p>
                    {(hasPrev || hasNext) && (
                      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                        {hasPrev && (
                          <div className="rounded-xl border border-destructive/20 bg-[var(--destructive-soft)]/60 p-3">
                            <div className="mb-1 font-semibold text-destructive">Previous values</div>
                            <pre className="overflow-x-auto font-mono text-destructive/80">
                              {JSON.stringify(log.previous_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {hasNext && (
                          <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] p-3">
                            <div className="mb-1 font-semibold text-[var(--success)]">New values</div>
                            <pre className="overflow-x-auto font-mono text-[var(--success)]/90">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="mt-5 border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Export audit data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Download the complete audit trail for compliance and reporting purposes.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" className="rounded-full">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" className="rounded-full">
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              Print report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
