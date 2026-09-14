"use client";
import { useCallback, useEffect, useState } from "react";
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
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { listAuditLogs, type AuditLogRow } from "@/lib/db";

const FIELD_LABELS: Record<string, string> = {
  survey_no: "Survey number",
  khata_no: "Khata number",
  owner_name: "Owner",
  owner: "Owner",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  area_detected: "Area (document)",
  area_reference: "Area (reference)",
  classification: "Classification",
  mutation_date: "Mutation date",
  validation_status: "Validation",
  verification_status: "Verification",
  validation_score: "Validation score",
  record_code: "Record",
  notes: "Notes",
};

function prettyField(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  // Title-case simple status words, keep the rest as-is (names, numbers)
  if (/^(pending|accepted|rejected|review|safe|high_risk|corrected|escalated|completed|failed|uploaded|processing)$/i.test(s)) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function prettyAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function ValuesList({ values, tone }: { values: Record<string, unknown>; tone: "red" | "green" }) {
  const entries = Object.entries(values);
  if (entries.length === 0) return null;
  return (
    <dl className="divide-y divide-dashed divide-border/70">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 py-1.5">
          <dt className="text-muted-foreground">{prettyField(k)}</dt>
          <dd className={`truncate font-medium ${tone === "red" ? "text-destructive" : "text-[var(--success)]"}`}>
            {prettyValue(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const ACTION_META: Record<string, { icon: typeof FilePlus2; cls: string }> = {
  RECORD_CREATED: { icon: FilePlus2, cls: "bg-accent text-accent-foreground" },
  RECORD_AREA_CORRECTED: { icon: CheckCircle2, cls: "bg-accent text-accent-foreground" },
  RECORD_AREA_ACCEPTED: { icon: CheckCircle2, cls: "bg-accent text-accent-foreground" },
  EXTRACTION_COMPLETED: { icon: CheckCircle2, cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  VERIFICATION_ACCEPTED: { icon: ShieldCheck, cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  VERIFICATION_REJECTED: { icon: XCircle, cls: "bg-[var(--destructive-soft)] text-destructive" },
  VALIDATION_FAILED: { icon: AlertTriangle, cls: "bg-[var(--warning-soft)] text-warning" },
  RECORD_SENT_TO_VERIFICATION: { icon: ClipboardList, cls: "bg-muted text-muted-foreground" },
  RECORD_DUPLICATE_DISMISSED: { icon: CheckCircle2, cls: "bg-muted text-muted-foreground" },
};

export default function AuditPage() {
  const { ready, session, configured } = useRequireAuth();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLogs(await listAuditLogs(200));
    } catch (e: any) {
      setError(e?.message || "Could not load the audit trail");
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
        <PageHeader title="Audit trail" description="Complete history of all actions and changes." />
        <SetupNotice what="The audit trail" />
      </div>
    );
  }

  const filtered =
    filter === "all"
      ? logs
      : logs.filter((l) =>
          filter === "created"
            ? l.action === "RECORD_CREATED" || l.action === "EXTRACTION_COMPLETED"
            : filter === "verified"
              ? l.action.includes("VERIFICATION")
              : l.action === "VALIDATION_FAILED"
        );

  const exportAs = (format: "csv" | "json") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
      triggerDownload(blob, `landlens-audit-${Date.now()}.json`);
    } else {
      const header = ["id", "created_at", "action", "entity_type", "entity_id", "user_id"];
      const rows = logs.map((l) => [
        l.id,
        l.created_at,
        l.action,
        l.entity_type,
        l.entity_id ?? "",
        l.user_id ?? "",
      ]);
      const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      triggerDownload(blob, `landlens-audit-${Date.now()}.csv`);
    }
  };

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
          </>
        }
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-destructive/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total events", value: logs.length, icon: ClipboardList },
          { label: "Records created", value: logs.filter((l) => l.action === "RECORD_CREATED" || l.action === "EXTRACTION_COMPLETED").length, icon: FilePlus2 },
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
          {loading ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No audit events yet"
              description="Every upload, correction and verification decision is recorded here automatically."
            />
          ) : (
            <div className="space-y-1">
              {filtered.map((log) => {
                const meta = ACTION_META[log.action] ?? { icon: ClipboardList, cls: "bg-muted text-muted-foreground" };
                const Icon = meta.icon;
                const hasPrev = !!log.previous_values && Object.keys(log.previous_values).length > 0;
                const hasNext = !!log.new_values && Object.keys(log.new_values).length > 0;
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
                        <span className="text-sm font-semibold">{prettyAction(log.action)}</span>
                        <Badge variant="outline" className="rounded-md text-[10px] font-bold uppercase text-muted-foreground">
                          {log.entity_type} · {log.entity_id ?? "—"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        User{" "}
                        <span className="font-mono" title={log.user_id ?? ""}>
                          {log.user_id ? `${log.user_id.slice(0, 8)}…` : "—"}
                        </span>
                      </p>
                      {(hasPrev || hasNext) && (
                        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                          {hasPrev && (
                            <div className="rounded-xl border border-destructive/20 bg-[var(--destructive-soft)]/60 p-3">
                              <div className="mb-1 font-semibold text-destructive">Before</div>
                              <ValuesList values={log.previous_values as Record<string, unknown>} tone="red" />
                            </div>
                          )}
                          {hasNext && (
                            <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] p-3">
                              <div className="mb-1 font-semibold text-[var(--success)]">After</div>
                              <ValuesList values={log.new_values as Record<string, unknown>} tone="green" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
            <Button variant="outline" className="rounded-full" onClick={() => exportAs("csv")} disabled={logs.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => exportAs("json")} disabled={logs.length === 0}>
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
