"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  FileText,
  History,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getUserProfile, type Profile } from "@/lib/supabase";
import { getDashboardStats, listAuditLogs, listRecords, type AuditLogRow, type DashboardStats, type RecordRow } from "@/lib/db";

const ACTIVITY_META: Record<string, { icon: typeof FileText; ok: boolean }> = {
  RECORD_CREATED: { icon: FileText, ok: true },
  EXTRACTION_COMPLETED: { icon: BrainCircuit, ok: true },
  VERIFICATION_ACCEPTED: { icon: ShieldCheck, ok: true },
  VERIFICATION_REJECTED: { icon: ShieldAlert, ok: false },
  VALIDATION_FAILED: { icon: ShieldAlert, ok: false },
};

export default function DashboardPage() {
  const { ready, session, configured } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<AuditLogRow[]>([]);
  const [latestRecord, setLatestRecord] = useState<RecordRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError("");
    try {
      const [p, s, logs, recs] = await Promise.all([
        getUserProfile(session.user.id),
        getDashboardStats(),
        listAuditLogs(5),
        listRecords(1),
      ]);
      setProfile(p);
      setStats(s);
      setActivity(logs);
      setLatestRecord(recs[0] ?? null);
    } catch (e: any) {
      setError(e?.message || "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (ready && session) load();
  }, [ready, session, load]);

  if (!configured) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Your land record digitization overview." />
        <SetupNotice what="Everything on this page" />
      </div>
    );
  }
  if (!ready || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const statsCards = [
    {
      label: "Documents",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      sub: `${stats?.processingJobs ?? 0} processing now`,
      tone: "text-foreground",
    },
    {
      label: "Records extracted",
      value: (stats?.validationCounts ?? {})["safe"] + (stats?.validationCounts ?? {})["review"] + (stats?.validationCounts ?? {})["high_risk"] + (stats?.validationCounts ?? {})["pending"] || 0,
      icon: BrainCircuit,
      sub: "across all uploads",
      tone: "text-foreground",
    },
    {
      label: "Pending verification",
      value: stats?.pendingVerification ?? 0,
      icon: CheckCircle2,
      sub: "waiting on an officer",
      tone: "text-foreground",
    },
    {
      label: "High-risk records",
      value: stats?.highRiskRecords ?? 0,
      icon: ShieldAlert,
      sub: "needs attention",
      tone: "text-destructive",
    },
  ];

  const total = Math.max(1, (stats?.validationCounts ?? {})["pending"] + (stats?.validationCounts ?? {})["safe"] + (stats?.validationCounts ?? {})["review"] + (stats?.validationCounts ?? {})["high_risk"]);
  const pipeline = [
    { stage: "Uploaded", count: stats?.totalDocuments ?? 0, pct: 100 },
    { stage: "Extracted", count: (stats?.validationCounts ?? {})["pending"] ?? 0, pct: Math.round((((stats?.validationCounts ?? {})["pending"] ?? 0) / total) * 100) },
    { stage: "Accepted", count: stats?.completedRecords ?? 0, pct: Math.round((((stats?.completedRecords ?? 0) / total) * 100)) },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile?.name || session?.user?.email?.split("@")[0] || "Officer"}`}
        description="Here's your land record digitization overview for today."
        actions={
          <Link href="/upload">
            <Button className="rounded-full shadow-md shadow-primary/20">
              <Upload className="h-4 w-4" /> Upload document
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-destructive/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsCards.map(({ label, value, icon: Icon, sub, tone }) => (
          <Card key={label} className="border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <Icon className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <div className={`font-mono text-3xl font-bold ${tone}`}>{value}</div>
              <div className="mt-1 text-[13px] font-medium">{label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Pipeline */}
        <div className="space-y-5">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Digitization pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pipeline.map((p) => (
                <div key={p.stage}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.stage}</span>
                    <span className="font-mono font-semibold">{p.count}</span>
                  </div>
                  <Progress value={p.pct} className="h-2" />
                </div>
              ))}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <Link href="/upload"><Button size="sm" className="rounded-full">Upload document</Button></Link>
                <Link href="/verification"><Button size="sm" variant="outline" className="rounded-full">Review queue</Button></Link>
                <Link href="/records"><Button size="sm" variant="outline" className="rounded-full">View records</Button></Link>
                <Link href="/audit"><Button size="sm" variant="outline" className="rounded-full">Audit trail</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest record + activity */}
        <div className="space-y-5">
          {latestRecord ? (
            <Card className="border-border/80 bg-sidebar text-sidebar-foreground">
              <CardContent className="p-5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wide text-sidebar-foreground/50">LATEST RECORD</span>
                  <Badge className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold">
                    {latestRecord.verification_status.toUpperCase()}
                  </Badge>
                </div>
                <div className="font-mono text-lg font-bold">{latestRecord.record_code ?? latestRecord.id.slice(0, 8)}</div>
                <p className="mb-4 text-xs text-sidebar-foreground/60">
                  Survey {latestRecord.survey_no ?? "—"} · {latestRecord.village ?? "—"}
                </p>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  {[
                    ["Owner", latestRecord.owner_name],
                    ["Survey no.", latestRecord.survey_no],
                    ["Village", latestRecord.village],
                    ["Area", latestRecord.area_detected != null ? `${latestRecord.area_detected} Ha` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/[0.06] px-3 py-2">
                      <div className="text-[10px] text-sidebar-foreground/50">{k}</div>
                      <div className="truncate font-mono font-semibold">{v || "—"}</div>
                    </div>
                  ))}
                </div>
                <Link href={`/records/${latestRecord.id}`}>
                  <Button size="sm" variant="secondary" className="mt-4 w-full rounded-full">
                    Open record <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No records yet"
              description="Upload your first land record document to start the digitization pipeline."
              action={
                <Link href="/upload">
                  <Button size="sm" className="rounded-full">Upload document</Button>
                </Link>
              }
            />
          )}

          <Card className="border-border/80">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-muted-foreground" /> Recent activity
              </CardTitle>
              <Link href="/audit" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-1 pt-1">
              {activity.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No activity yet — actions will appear here as the team works.
                </p>
              ) : (
                activity.map((a) => {
                  const meta = ACTIVITY_META[a.action] ?? { icon: FileText, ok: true };
                  const Icon = meta.icon;
                  return (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
                      {meta.ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold leading-tight">{a.action.replace(/_/g, " ")}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {a.entity_type} · {a.entity_id ?? "—"}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
