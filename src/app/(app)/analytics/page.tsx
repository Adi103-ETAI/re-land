"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, FileStack, FileText, Inbox, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getAnalytics, type AnalyticsData } from "@/lib/db";

export default function AnalyticsPage() {
  const { ready, session, configured } = useRequireAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getAnalytics());
    } catch (e: any) {
      setError(e?.message || "Could not load analytics");
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
        <PageHeader title="Analytics" description="Insights into land record digitization." />
        <SetupNotice what="Analytics" />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const kpis = [
    { label: "Documents", value: data?.totalDocuments ?? 0, icon: FileText },
    { label: "Records extracted", value: (data?.totalRecords ?? 0).toLocaleString(), icon: FileStack },
    { label: "Avg confidence", value: `${data?.avgConfidence ?? 0}%`, icon: BrainCircuit },
    { label: "Acceptance rate", value: `${data?.successRate ?? 0}%`, icon: TrendingUp },
  ];

  const pipelineTotal = Math.max(1, data?.totalRecords ?? 1);
  const validationColors: Record<string, string> = {
    safe: "bg-[var(--success)]",
    review: "bg-[var(--warning)]",
    high_risk: "bg-destructive",
    pending: "bg-muted-foreground/40",
  };

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Insights computed live from your Supabase data."
        actions={
          <Link href="/upload">
            <Button className="rounded-full">Upload document</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-destructive/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && data.totalRecords === 0 && data.totalDocuments === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No data to analyze yet"
          description="Upload and process documents — analytics update automatically as the team works."
          action={
            <Link href="/upload">
              <Button className="rounded-full">Upload a document</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-border/80">
                <CardContent className="p-5">
                  <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="font-mono text-3xl font-bold">{value}</div>
                  <div className="mt-1 text-[13px] font-medium">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Pipeline */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pipeline distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.pipeline ?? []).map((p) => (
                  <div key={p.stage}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-muted-foreground">{p.stage}</span>
                      <span className="font-mono font-semibold">{p.count}</span>
                    </div>
                    <Progress value={(p.count / pipelineTotal) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Validation distribution */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Validation distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.validationDist ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No validation data yet.</p>
                )}
                {(data?.validationDist ?? []).map((v) => (
                  <div key={v.status}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{v.status.replace("_", " ")}</span>
                      <span className="font-mono font-semibold">{v.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${validationColors[v.status] ?? "bg-primary"}`}
                        style={{ width: `${(v.count / pipelineTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Confidence distribution */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Confidence distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.confidenceDist ?? []).map((c) => (
                  <div key={c.range}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-muted-foreground">{c.range}</span>
                      <span className="font-mono font-semibold">{c.count}</span>
                    </div>
                    <Progress value={(c.count / pipelineTotal) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent documents */}
            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent documents</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.recentDocuments ?? []).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[180px] truncate font-medium">{d.filename}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              d.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : d.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {d.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.recentDocuments ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                          No documents uploaded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
