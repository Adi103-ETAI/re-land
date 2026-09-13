"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, Lightbulb, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "@/lib/supabase";
import { listVerificationQueue, resolveVerification, type RecordRow } from "@/lib/db";

const FIELD_LABELS: Record<string, string> = {
  surveyNo: "Survey number",
  survey: "Survey number",
  khataNo: "Khata number",
  khata: "Khata number",
  ownerName: "Owner name",
  owner: "Owner name",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  area: "Area",
  classification: "Classification",
  mutationDate: "Mutation date",
};

export default function VerificationPage() {
  const { ready, session, configured } = useRequireAuth();
  const [items, setItems] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listVerificationQueue();
      setItems(rows);
      setCurrentId(rows[0]?.id ?? null);
    } catch (e: any) {
      setError(e?.message || "Could not load the verification queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && session?.user) load();
  }, [ready, session, load]);

  const currentItem = items.find((i) => i.id === currentId) ?? null;
  const pendingCount = items.length;

  const resolve = async (status: "accepted" | "rejected") => {
    if (!currentItem || busy) return;
    setBusy(true);
    try {
      const s = await getSession();
      await resolveVerification({
        recordId: currentItem.id,
        action: status,
        notes: note || undefined,
        userId: s.user?.id ?? currentItem.created_by ?? "",
        recordCode: currentItem.record_code,
      });
      toast({
        description:
          status === "accepted"
            ? `Record ${currentItem.record_code ?? ""} accepted — saved to Supabase`
            : `Record ${currentItem.record_code ?? ""} rejected and flagged — saved to Supabase`,
      });
      setItems((prev) => prev.filter((i) => i.id !== currentItem.id));
      setCurrentId((prev) => {
        const rest = items.filter((i) => i.id !== prev);
        return rest[0]?.id ?? null;
      });
      setNote("");
    } catch (e: any) {
      toast({ description: e?.message || "Could not save the decision" });
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <div>
        <PageHeader title="Verification queue" description="Records the AI is not confident about." />
        <SetupNotice what="The verification queue" />
      </div>
    );
  }
  if (!ready || loading) {
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
        description={`${pendingCount} pending item${pendingCount === 1 ? "" : "s"} — every decision is stored in Supabase with your name on it.`}
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-destructive/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Queue is clear"
          description="There are no records waiting for verification right now. New records appear here automatically after extraction and validation."
        />
      ) : (
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
                    <span className="truncate text-sm font-semibold">
                      {item.record_code ?? item.id.slice(0, 8)}
                    </span>
                    {item.validation_status === "high_risk" && (
                      <Badge className="rounded-md bg-[var(--destructive-soft)] px-2 py-0.5 text-[10px] font-bold text-destructive hover:bg-[var(--destructive-soft)]">
                        HIGH RISK
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    Survey {item.survey_no ?? "—"} · {(Number(item.confidence_score ?? 0) * 100).toFixed(0)}% confidence
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
                    <h2 className="text-lg font-semibold tracking-tight">
                      Record {currentItem.record_code ?? currentItem.id.slice(0, 8)}
                    </h2>
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
                      { label: "Survey Number", value: currentItem.survey_no },
                      { label: "Khata Number", value: currentItem.khata_no },
                      { label: "Owner Name", value: currentItem.owner_name },
                      { label: "Area", value: currentItem.area_detected != null ? `${currentItem.area_detected} Ha` : null },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-2xl bg-muted/70 p-4">
                        <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
                        <div className="truncate font-mono text-sm font-bold">{value || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {/* Extracted field-by-field values */}
                  {currentItem.fields && Object.keys(currentItem.fields).length > 0 && (
                    <div className="mb-5 rounded-2xl border border-border p-4">
                      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
                        EXTRACTED FIELDS
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(currentItem.fields).map(([k, v]) => (
                          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-0">
                            <span className="text-xs text-muted-foreground">{FIELD_LABELS[k] ?? k}</span>
                            <b className="truncate font-mono text-[13px]">{String(v ?? "") || "—"}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted/70 p-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Confidence score</div>
                      <div className="font-mono text-2xl font-bold">
                        {(Number(currentItem.confidence_score ?? 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <Progress value={Number(currentItem.confidence_score ?? 0) * 100} className="h-2 w-40" />
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
                    placeholder="Add verification notes… (required context for a rejection is recommended)"
                  />
                  {/* Both decision buttons are always rendered side-by-side
                      (stacked on mobile) so neither can be pushed off-screen
                      or hidden by overflow. */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      className="h-11 rounded-full text-[15px]"
                      disabled={busy}
                      onClick={() => resolve("accepted")}
                    >
                      <Check className="h-4 w-4" /> Accept record
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-11 rounded-full text-[15px] text-white shadow-md shadow-destructive/25"
                      disabled={busy}
                      onClick={() => resolve("rejected")}
                    >
                      <X className="h-4 w-4" /> Reject &amp; flag
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Review hints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Number(currentItem.confidence_score ?? 1) < 0.9 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-[var(--warning-soft)] p-4">
                      <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warning" />
                      <div>
                        <p className="text-sm font-semibold text-warning">Low confidence alert</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-warning/80">
                          Confidence score ({(Number(currentItem.confidence_score) * 100).toFixed(0)}%) is below the 90% threshold.
                          Manual verification is recommended before acceptance.
                        </p>
                      </div>
                    </div>
                  )}
                  {currentItem.dup_match_code && (
                    <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-[var(--destructive-soft)] p-4">
                      <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive" />
                      <div>
                        <p className="text-sm font-semibold text-destructive">Possible duplicate</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-destructive/80">
                          This record matched existing entry {currentItem.dup_match_code} with {currentItem.dup_similarity ?? "?"}% similarity.
                        </p>
                      </div>
                    </div>
                  )}
                  {currentItem.area_detected != null && currentItem.area_reference != null && Math.abs(currentItem.area_detected - currentItem.area_reference) > 0.001 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-accent p-4">
                      <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-accent-foreground">Area mismatch</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-accent-foreground/80">
                          Document shows {currentItem.area_detected} Ha vs reference {currentItem.area_reference} Ha
                          (difference {Math.abs(currentItem.area_detected - currentItem.area_reference).toFixed(2)} Ha).
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
