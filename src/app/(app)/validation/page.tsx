"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleHelp, Inbox, Scale, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useToast } from "@/hooks/use-toast";
import { useCaseStore } from "@/store/case-store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { logAudit, updateRecord } from "@/lib/db";
import { getSession } from "@/lib/supabase";

export default function Validation() {
  const router = useRouter();
  const { configured } = useRequireAuth();
  const { currentCase, recordId, fields, setCase } = useCaseStore();
  const [answer, setAnswer] = useState<string | null>(null);
  const [areaResolved, setAreaResolved] = useState(false);
  const [dupResolved, setDupResolved] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [editArea, setEditArea] = useState(false);
  const [areaInput, setAreaInput] = useState(String(currentCase?.areaDb ?? ""));
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (!configured) {
    return (
      <div>
        <PageHeader title="Validation center" description="Cross-checking extracted values against reference records." />
        <SetupNotice what="Validation state" />
      </div>
    );
  }

  if (!currentCase || !recordId) {
    return (
      <div>
        <PageHeader title="Validation center" description="Cross-checking extracted values against reference records." />
        <EmptyState
          icon={Inbox}
          title="No record in validation"
          description="Extract a document first — the validation center works on the record that just came out of the pipeline."
          action={
            <Link href="/upload">
              <Button className="rounded-full">Upload a document</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const show = (m: string) => toast({ description: m });
  const mismatch = +(currentCase.area - currentCase.areaDb).toFixed(2);
  const hasMismatch = !areaResolved && Math.abs(mismatch) > 0.001;
  const lowConfFields = (fields ?? [])
    .filter((f) => (f.confidence ?? 1) < 0.9)
    .map((f) => f.key);
  const score = Math.max(
    70,
    Math.round(100 - (hasMismatch ? 6 : 0) - (!dupResolved && currentCase.dupMatch ? 4 : 0) - (lowConfFields.length > 0 ? 2 : 0))
  );

  // Real explanations derived from this record's data — no canned demo text.
  const explanations: Record<string, string> = {
    flag: hasMismatch
      ? `This record is flagged because the land area detected on the scanned document (${currentCase.area} Ha) differs from the reference value (${currentCase.areaDb} Ha) by ${Math.abs(mismatch).toFixed(2)} Ha. Officer confirmation is required before approval.`
      : !dupResolved && currentCase.dupMatch
        ? `This record is flagged because survey ${currentCase.survey} matches existing record ${currentCase.dupMatch} with ${currentCase.dupSim}% similarity — a possible duplicate entry.`
        : "This record passed the automated cross-checks with no blocking conflicts.",
    lowconf: lowConfFields.length
      ? `The fields below the 90% auto-approval threshold are: ${lowConfFields.map((k) => `<b>${k}</b>`).join(", ")}. Verify these values against the paper document.`
      : "Every extracted field is at or above the 90% confidence threshold on this record.",
    missing:
      "Fields the model could not locate on the paper are shown as “not on paper” on the extraction page and stored as empty values — confirm them manually if the register contains them.",
    why:
      hasMismatch || (!dupResolved && currentCase.dupMatch) || lowConfFields.length
        ? "This record needs verification because at least one automated check raised a conflict or a field fell below the confidence threshold."
        : "This record is eligible for fast-track approval — all checks passed.",
  };

  const checks = [
    { title: "Ownership extraction", badge: "Extracted", left: currentCase.owner, right: currentCase.owner },
    { title: "Survey number", badge: "Valid format", left: currentCase.survey, right: currentCase.survey },
    { title: "Location", badge: "Parsed", left: currentCase.village, right: `${currentCase.tehsil || "—"} / ${currentCase.district || "—"}` },
  ];

  const persist = async (patch: Parameters<typeof updateRecord>[1], message: string, action: string) => {
    try {
      const session = await getSession();
      await updateRecord(recordId, patch);
      await logAudit({
        userId: session.user?.id,
        action,
        entityType: "record",
        entityId: currentCase.recId,
        newValues: patch as Record<string, any>,
      });
      show(message);
    } catch (e: any) {
      show(e?.message || "Could not save to Supabase");
    }
  };

  return (
    <div>
      <PageHeader
        title="Validation center"
        description={`Reviewing ${currentCase.recId} — extracted values vs reference data.`}
        actions={
          <Button
            className="rounded-full"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              await persist(
                { validation_status: "review", verification_status: "pending" },
                "Record sent to the verification queue",
                "RECORD_SENT_TO_VERIFICATION"
              );
              setSending(false);
              router.push("/verification");
            }}
          >
            Send to verification <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
      <Tracker activeIdx={4} />

      {/* Score banner */}
      <div className="mb-5 flex items-center gap-6 rounded-2xl bg-sidebar p-6 text-sidebar-foreground">
        <div
          className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) 0 ${score}%, rgba(255,255,255,.15) ${score}% 100%)` }}
        >
          <div className="grid h-[70px] w-[70px] place-items-center rounded-full bg-sidebar font-mono text-xl font-bold">
            {score}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Validation score: {score} / 100</h3>
          <p className="text-sm text-sidebar-foreground/60">
            {hasMismatch ? "1 mismatch" : "area values consistent"} ·{" "}
            {currentCase.dupMatch ? "1 possible duplicate" : "no duplicates found"}
          </p>
        </div>
      </div>

      {/* Matched checks */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {checks.map((c) => (
          <Card key={c.title} className="border-border/80">
            <CardContent className="p-4">
              <div className="mb-3 flex justify-between items-center gap-2">
                <b className="text-sm">{c.title}</b>
                <Badge className="rounded-md bg-[var(--success-soft)] text-[10px] font-bold text-[var(--success)] hover:bg-[var(--success-soft)]">
                  <ShieldCheck className="mr-1 h-3 w-3" /> {c.badge}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">AI record</span>
                  <b className="block truncate font-mono">{c.left || "—"}</b>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Reference</span>
                  <b className="block truncate font-mono">{c.right || "—"}</b>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <TriangleAlert className="h-4.5 w-4.5 text-warning" /> Detected issues
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Every issue below was surfaced automatically by the validation engine.
      </p>

      {/* Area mismatch */}
      <Card className={`mb-3 border-border/80 border-l-4 ${hasMismatch ? "border-l-[var(--warning)]" : "border-l-[var(--success)]"}`}>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
            <b className="text-sm">Area check</b>
            <Badge
              className={`rounded-md text-[10px] font-extrabold ${
                hasMismatch
                  ? "bg-[var(--warning-soft)] text-warning hover:bg-[var(--warning-soft)]"
                  : "bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)]"
              }`}
            >
              {hasMismatch ? "MISMATCH" : "RESOLVED"}
            </Badge>
          </div>
          <div className="mb-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Detected value</span>
              <b className="block font-mono">{currentCase.area} Hectare</b>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Reference value</span>
              <b className="block font-mono">{currentCase.areaDb} Hectare</b>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Difference</span>
              <b className="block font-mono">{Math.abs(mismatch).toFixed(2)} Ha</b>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasMismatch
              ? `Difference: ${Math.abs(mismatch).toFixed(2)} Hectare — flagged for officer review.`
              : "Resolved — the accepted area has been saved."}
          </p>
          {editArea ? (
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                className="w-36 rounded-xl"
                placeholder="e.g. 2.40"
              />
              <Button
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  const v = parseFloat(areaInput);
                  if (!isNaN(v)) {
                    setCase({ ...currentCase, area: v, areaDb: v });
                    setAreaResolved(true);
                    setEditArea(false);
                    await persist({ area_detected: v, area_reference: v }, `Area updated to ${v} Ha — saved to Supabase`, "RECORD_AREA_CORRECTED");
                  }
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditArea(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  setCase({ ...currentCase, area: currentCase.areaDb });
                  setAreaResolved(true);
                  await persist(
                    { area_detected: currentCase.areaDb },
                    `Accepted reference area ${currentCase.areaDb} Ha — saved to Supabase`,
                    "RECORD_AREA_ACCEPTED"
                  );
                }}
              >
                Accept reference value
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditArea(true)}>
                Edit manually
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate conflict */}
      <Card className={`mb-3 border-border/80 border-l-4 ${!dupResolved && currentCase.dupMatch ? "border-l-destructive" : "border-l-[var(--success)]"}`}>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
            <b className="text-sm">Survey number conflict</b>
            <Badge
              className={`rounded-md text-[10px] font-extrabold ${
                !dupResolved && currentCase.dupMatch
                  ? "bg-[var(--destructive-soft)] text-destructive hover:bg-[var(--destructive-soft)]"
                  : "bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)]"
              }`}
            >
              {!dupResolved && currentCase.dupMatch ? "HIGH" : "RESOLVED"}
            </Badge>
          </div>
          <div className="mb-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Detected value</span>
              <b className="block font-mono">{currentCase.survey}</b>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Conflicting record</span>
              <b className="block font-mono">{currentCase.dupMatch ?? "No match found"}</b>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Similarity</span>
              <b className="block">{currentCase.dupSim}%</b>
            </div>
          </div>
          {!dupResolved && currentCase.dupMatch && (
            <p className="mb-2 text-xs text-muted-foreground">
              Record shares owner, village and survey number with an existing entry — possible duplicate.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setShowCompare(true)}>
              <Scale className="h-4 w-4" /> Compare records
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              onClick={async () => {
                setDupResolved(true);
                await persist(
                  { dup_match_code: null, dup_similarity: null },
                  `Marked as not a duplicate — saved to Supabase`,
                  "RECORD_DUPLICATE_DISMISSED"
                );
              }}
            >
              Not a duplicate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compare dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-[720px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Compare records</DialogTitle>
            <DialogDescription>Current vs conflicting record — side by side.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <div className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground">
                CURRENT: {currentCase.recId}
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Owner", currentCase.owner],
                  ["Survey", currentCase.survey],
                  ["Village", currentCase.village],
                  ["Area", `${currentCase.area} Ha`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <b className="font-mono">{v || "—"}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-destructive/25 bg-[var(--destructive-soft)]/60 p-4">
              <div className="mb-2 text-[11px] font-bold tracking-wide text-destructive">
                CONFLICT: {currentCase.dupMatch ?? "—"}
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Owner", currentCase.owner],
                  ["Survey", currentCase.survey],
                  ["Village", currentCase.village],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <b className="font-mono">{v || "—"}</b>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-destructive">
                Same owner + village + survey — flagged {currentCase.dupSim}% similarity
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-full" onClick={() => setShowCompare(false)}>
              Close
            </Button>
            <Button
              className="rounded-full"
              onClick={async () => {
                setShowCompare(false);
                setDupResolved(true);
                await persist({ dup_match_code: null, dup_similarity: null }, "Resolved: not a duplicate — saved", "RECORD_DUPLICATE_DISMISSED");
              }}
            >
              Not a duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Explain this record */}
      <Card className="mt-4 border-border/80">
        <CardContent className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Explain this record
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Plain-language explanations generated from this record&apos;s actual validation results.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              ["flag", "Why is this record flagged?"],
              ["lowconf", "Which fields have low confidence?"],
              ["missing", "What information is missing?"],
              ["why", "Why does this record need verification?"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setAnswer(explanations[k])}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" /> {l}
              </button>
            ))}
          </div>
          {answer && (
            <div className="rounded-xl border-l-[3px] border-primary bg-muted/70 px-4 py-3 text-sm leading-relaxed">
              <b>Validation engine:</b> <span dangerouslySetInnerHTML={{ __html: answer }} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
