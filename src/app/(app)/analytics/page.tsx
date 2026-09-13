"use client";
import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, FileText, FileStack, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState({
    totalDocuments: 0,
    totalRecords: 0,
    avgConfidence: 0,
    successRate: 0,
    pendingVerification: 0,
    highRiskCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setMetrics({
        totalDocuments: 156,
        totalRecords: 2847,
        avgConfidence: 87.4,
        successRate: 94.2,
        pendingVerification: 23,
        highRiskCount: 8,
      });
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const kpis = [
    { label: "Total documents", value: metrics.totalDocuments, icon: FileText },
    { label: "Records extracted", value: metrics.totalRecords.toLocaleString(), icon: FileStack },
    { label: "Avg confidence", value: `${metrics.avgConfidence}%`, icon: BrainCircuit },
    { label: "Success rate", value: `${metrics.successRate}%`, icon: TrendingUp },
  ];

  const pipeline = [
    { stage: "Uploaded", count: 156, pct: 100, color: "bg-[#2a2c33]" },
    { stage: "Processing", count: 23, pct: 15, color: "bg-[var(--warning)]" },
    { stage: "Completed", count: 133, pct: 85, color: "bg-[var(--success)]" },
    { stage: "Failed", count: 0, pct: 0, color: "bg-destructive" },
  ];

  const validationDist = [
    { status: "Safe (auto-approved)", count: 1245, pct: 71, color: "bg-[var(--success)]" },
    { status: "Needs review", count: 456, pct: 26, color: "bg-[var(--warning)]" },
    { status: "High risk", count: 89, pct: 5, color: "bg-destructive" },
  ];

  const confidenceDist = [
    { range: "90-100%", count: 1456, pct: 60 },
    { range: "80-90%", count: 623, pct: 26 },
    { range: "70-80%", count: 234, pct: 10 },
    { range: "Below 70%", count: 89, pct: 4 },
  ];

  const rows = [
    { time: "10:23 AM", doc: "Revenue Survey 45.pdf", records: 12, status: "completed", conf: "92%" },
    { time: "10:15 AM", doc: "Mutation Register.pdf", records: 8, status: "completed", conf: "88%" },
    { time: "09:45 AM", doc: "Field Notes Scan.jpg", records: 5, status: "failed", conf: "—" },
    { time: "09:30 AM", doc: "Survey Plan 2023.pdf", records: 24, status: "processing", conf: "—" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse border-border/80">
            <CardContent className="h-28 p-5" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics dashboard"
        description="Real-time insights into land record digitization."
        actions={
          <Badge variant="outline" className="rounded-full font-normal text-muted-foreground">
            Sample data — not official statistics
          </Badge>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5">
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

      <div className="mb-6 grid gap-5 md:grid-cols-2">
        {/* Pipeline */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline.map(({ stage, count, pct, color }) => (
              <div key={stage}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{stage}</span>
                  <span className="font-mono font-semibold">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Validation distribution */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Validation status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationDist.map(({ status, count, pct, color }) => (
              <div key={status}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{status}</span>
                  <span className="font-mono font-semibold">{count.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Verification queue */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verification queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-muted/70 p-5 text-center">
                <div className="font-mono text-3xl font-bold text-[var(--warning)]">
                  {metrics.pendingVerification}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Pending review</div>
              </div>
              <div className="rounded-2xl bg-muted/70 p-5 text-center">
                <div className="font-mono text-3xl font-bold text-destructive">{metrics.highRiskCount}</div>
                <div className="mt-1 text-sm text-muted-foreground">High risk items</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              Average review time: <span className="font-semibold text-foreground">4.2 minutes</span>
            </div>
          </CardContent>
        </Card>

        {/* Confidence distribution */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Confidence distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {confidenceDist.map(({ range, count, pct }) => (
              <div key={range} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">{range}</span>
                <Progress value={pct} className="h-3 flex-1" />
                <span className="w-12 text-right font-mono text-xs font-semibold">{count.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="overflow-hidden border-border/80 py-0">
        <CardHeader className="border-b border-border/70 py-4">
          <CardTitle className="text-base">Recent processing activity</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="h-10">Time</TableHead>
              <TableHead className="h-10">Document</TableHead>
              <TableHead className="h-10">Records</TableHead>
              <TableHead className="h-10">Status</TableHead>
              <TableHead className="h-10">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className="border-border/70">
                <TableCell className="py-3 text-muted-foreground">{row.time}</TableCell>
                <TableCell className="py-3 text-sm font-medium">{row.doc}</TableCell>
                <TableCell className="py-3 font-mono text-sm">{row.records}</TableCell>
                <TableCell className="py-3">
                  <Badge
                    className={`rounded-md text-[10px] font-bold ${
                      row.status === "completed"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : row.status === "processing"
                          ? "bg-[var(--warning-soft)] text-warning"
                          : "bg-[var(--destructive-soft)] text-destructive"
                    }`}
                  >
                    {row.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 font-mono text-sm">{row.conf}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
