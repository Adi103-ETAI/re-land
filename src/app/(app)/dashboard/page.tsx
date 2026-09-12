"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  FileText,
  History,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSession, getUserProfile, type Profile } from "@/lib/supabase";
import { useCaseStore } from "@/store/case-store";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentCase } = useCaseStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await getSession();
      if (!session?.user) {
        window.location.href = "/login";
        return;
      }
      const p = await getUserProfile(session.user.email);
      if (mounted) {
        setProfile(p);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
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

  const stats = [
    { label: "Total Documents", value: 24, icon: FileText, sub: "+3 this week", tone: "text-foreground" },
    { label: "Processing Jobs", value: 3, icon: BrainCircuit, sub: "2 queued · 1 running", tone: "text-foreground" },
    { label: "Pending Verification", value: 12, icon: CheckCircle2, sub: "avg. review 4.2 min", tone: "text-foreground" },
    { label: "High Risk Records", value: 2, icon: ShieldAlert, sub: "needs attention", tone: "text-destructive" },
  ];

  const pipeline = [
    { stage: "Uploaded", count: 24, pct: 100 },
    { stage: "AI processed", count: 18, pct: 75 },
    { stage: "Validated", count: 15, pct: 62 },
    { stage: "Verified", count: 12, pct: 50 },
  ];

  const activity = [
    { action: "Document uploaded", detail: "Revenue Survey No. 45.pdf", time: "2 min ago", ok: true },
    { action: "Extraction completed", detail: `Record ${currentCase.recId} · confidence 94%`, time: "15 min ago", ok: true },
    { action: "Verification pending", detail: "High-risk record #12850 flagged", time: "1 hr ago", ok: false },
    { action: "Record approved", detail: "Khasra No. 234 by Verifier A", time: "2 hrs ago", ok: true },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile?.name || "Officer"}`}
        description="Here's your land record digitization overview for today."
        actions={
          <Link href="/upload">
            <Button className="rounded-full shadow-md shadow-primary/20">
              <Upload className="h-4 w-4" /> Upload document
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, sub, tone }) => (
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

        {/* Current case + activity */}
        <div className="space-y-5">
          <Card className="border-border/80 bg-sidebar text-sidebar-foreground">
            <CardContent className="p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wide text-sidebar-foreground/50">CURRENT CASE</span>
                <Badge className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold">IN REVIEW</Badge>
              </div>
              <div className="font-mono text-lg font-bold">{currentCase.recId}</div>
              <p className="mb-4 text-xs text-sidebar-foreground/60">{currentCase.docLabel}</p>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                {[
                  ["Owner", currentCase.owner],
                  ["Survey no.", currentCase.survey],
                  ["Village", currentCase.village],
                  ["Area", `${currentCase.area} Ha`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.06] px-3 py-2">
                    <div className="text-[10px] text-sidebar-foreground/50">{k}</div>
                    <div className="font-mono font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <Link href="/validation">
                <Button size="sm" variant="secondary" className="mt-4 w-full rounded-full">
                  Open validation center <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

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
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
                  {a.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold leading-tight">{a.action}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{a.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
