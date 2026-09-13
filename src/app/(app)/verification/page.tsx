"use client";
import { useEffect, useState } from "react";
import { Check, Lightbulb, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSession, getUserProfile, type Profile } from "@/lib/supabase";

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
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const currentItem = items.find((i) => i.id === currentId);
  const pendingCount = items.filter((i) => i.verification_status === "pending").length;

  const resolve = (status: "accepted" | "rejected") => {
    if (!currentItem) return;
    setItems((prev) =>
      prev.map((item) => (item.id === currentId ? { ...item, verification_status: status } : item))
    );
    const idx = items.findIndex((i) => i.id === currentId);
    if (idx < items.length - 1) setCurrentId(items[idx + 1].id);
    setNote("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Verification queue"
        description={`${pendingCount} pending item${pendingCount === 1 ? "" : "s"} — exceptions the AI is not confident about.`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Queue list */}
        <Card className="h-fit border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Queue <span className="font-mono text-muted-foreground">({pendingCount})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[480px] space-y-2 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentId(item.id)}
                className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                  currentId === item.id
                    ? "border-primary/50 bg-accent shadow-sm"
                    : "border-transparent hover:bg-muted/70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Survey № {item.fields.surveyNo}</span>
                  {item.verification_status !== "pending" && (
                    <Badge
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        item.verification_status === "accepted"
                          ? "bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)]"
                          : "bg-[var(--destructive-soft)] text-destructive hover:bg-[var(--destructive-soft)]"
                      }`}
                    >
                      {item.verification_status}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Khata {item.fields.khataNo} · confidence {(item.confidence_score * 100).toFixed(0)}%
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Detail */}
        {currentItem && (
          <div className="space-y-5 lg:col-span-2">
            <Card className="border-border/80">
              <CardContent className="p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">Record #{currentItem.record_id}</h2>
                  <Badge
                    className={`rounded-md text-[10px] font-extrabold tracking-wide ${
                      currentItem.validation_status === "high_risk"
                        ? "bg-[var(--destructive-soft)] text-destructive hover:bg-[var(--destructive-soft)]"
                        : currentItem.validation_status === "review"
                          ? "bg-[var(--warning-soft)] text-warning hover:bg-[var(--warning-soft)]"
                          : "bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)]"
                    }`}
                  >
                    {currentItem.validation_status.toUpperCase()}
                  </Badge>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "Survey Number", value: currentItem.fields.surveyNo },
                    { label: "Khata Number", value: currentItem.fields.khataNo },
                    { label: "Owner Name", value: currentItem.fields.ownerName },
                    { label: "Area", value: currentItem.fields.area },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-2xl bg-muted/70 p-4">
                      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
                      <div className="truncate font-mono text-sm font-bold">{value || "—"}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted/70 p-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Confidence score</div>
                    <div className="font-mono text-2xl font-bold">
                      {(currentItem.confidence_score * 100).toFixed(1)}%
                    </div>
                  </div>
                  <Progress value={currentItem.confidence_score * 100} className="h-2 w-40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Verification actions</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">
                  Notes <span className="font-normal">(optional)</span>
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mb-4 resize-none rounded-2xl"
                  placeholder="Add verification notes…"
                />
                <div className="flex flex-wrap gap-3">
                  <Button className="flex-1 rounded-full" onClick={() => resolve("accepted")}>
                    <Check className="h-4 w-4" /> Accept record
                  </Button>
                  <Button variant="destructive" className="flex-1 rounded-full" onClick={() => resolve("rejected")}>
                    <X className="h-4 w-4" /> Reject & flag
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">AI recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-[var(--warning-soft)] p-4">
                  <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warning" />
                  <div>
                    <p className="text-sm font-semibold text-warning">Low confidence alert</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-warning/80">
                      Confidence score ({(currentItem.confidence_score * 100).toFixed(0)}%) is below threshold.
                      Manual verification recommended.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-accent p-4">
                  <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-accent-foreground">Format issue detected</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-accent-foreground/80">
                      Owner name format may not match the standard pattern. Please verify.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
