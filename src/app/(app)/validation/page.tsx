"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleHelp, Scale, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useCaseStore } from "@/store/case-store";

const answers: Record<string, string> = {
  flag: "This record was flagged because the land area mentioned in the scanned document differs from the cadastral database record. This requires officer verification.",
  lowconf:
    "The <b>Mutation Date</b> field has the lowest AI confidence at 64%, followed by <b>Classification</b> at 87%. Both are below the 90% auto-approval threshold.",
  missing: "No fields are fully missing, but <b>Khata Number</b> was partially legible on similar historical documents.",
  why: "This record needs verification because one AI-extracted value conflicts with an existing database record and one field fell below the confidence threshold.",
};

export default function Validation() {
  const { currentCase, setCase } = useCaseStore();
  const [answer, setAnswer] = useState<string | null>(null);
  const [areaResolved, setAreaResolved] = useState(false);
  const [dupResolved, setDupResolved] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [editArea, setEditArea] = useState(false);
  const [areaInput, setAreaInput] = useState(String(currentCase.areaDb));
  const { toast } = useToast();

  const show = (m: string) => toast({ description: m });
  const mismatch = +(currentCase.area - currentCase.areaDb).toFixed(2);
  const hasMismatch = !areaResolved && Math.abs(mismatch) > 0.001;
  const score = Math.max(
    70,
    Math.round(100 - (hasMismatch ? 6 : 0) - (!dupResolved && currentCase.dupMatch ? 4 : 0) - 2)
  );

  const checks = [
    { title: "Ownership verification", badge: "Match found", left: currentCase.owner, right: currentCase.owner },
    { title: "Survey number", badge: "Valid", left: currentCase.survey, right: currentCase.survey },
    { title: "Location", badge: "Verified", left: currentCase.village, right: `${currentCase.tehsil} / ${currentCase.district}` },
  ];

  return (
    <div>
      <PageHeader
        title="Validation center"
        description="Cross-checking extracted values against LRMS and cadastral databases."
        actions={
          <Link href="/verification">
            <Button className="rounded-full">
              Send to verification <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
            {hasMismatch ? "1 mismatch" : "all fields matched"} ·{" "}
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
                  <b className="block truncate font-mono">{c.left}</b>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Database</span>
                  <b className="block truncate font-mono">{c.right}</b>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <TriangleAlert className="h-4.5 w-4.5 text-warning" /> AI detected issues
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Every issue below was surfaced automatically by the validation engine.
      </p>

      {/* Area mismatch */}
      <Card className={`mb-3 border-border/80 border-l-4 ${hasMismatch ? "border-l-[var(--warning)]" : "border-l-[var(--success)]"}`}>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
            <b className="text-sm">Area mismatch detected</b>
            <Badge
              className={`rounded-md text-[10px] font-extrabold ${
                hasMismatch
                  ? "bg-[var(--warning-soft)] text-warning hover:bg-[var(--warning-soft)]"
                  : "bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)]"
              }`}
            >
              {hasMismatch ? "MEDIUM" : "RESOLVED"}
            </Badge>
          </div>
          <div className="mb-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Detected value</span>
              <b className="block font-mono">{currentCase.area} Hectare</b>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Expected value</span>
              <b className="block font-mono">{currentCase.areaDb} Hectare</b>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">AI confidence</span>
              <b className="block">91%</b>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasMismatch
              ? `Difference: ${Math.abs(mismatch).toFixed(2)} Hectare — flagged for officer review.`
              : "Resolved — officer accepted the corrected area."}
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
                onClick={() => {
                  const v = parseFloat(areaInput);
                  if (!isNaN(v)) {
                    setCase({ ...currentCase, area: v, areaDb: v });
                    setAreaResolved(true);
                    setEditArea(false);
                    show(`Area updated to ${v} Hectare — logged to audit`);
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
                onClick={() => {
                  setCase({ ...currentCase, area: currentCase.areaDb });
                  setAreaResolved(true);
                  show("Accepted AI suggestion: area set to " + currentCase.areaDb + " Hectare — audit logged");
                }}
              >
                Accept AI suggestion
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditArea(true)}>
                Edit manually
              </Button>
              <Link href="/verification">
                <Button size="sm" variant="ghost" className="rounded-full">
                  Send for verification
                </Button>
              </Link>
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
              <span className="text-xs text-muted-foreground">AI confidence</span>
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
              onClick={() => {
                setDupResolved(true);
                show("Marked as not a duplicate — retained as new record " + currentCase.recId);
              }}
            >
              Not a duplicate
            </Button>
            {!dupResolved && currentCase.dupMatch && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  setDupResolved(true);
                  show("Marked as duplicate — linked to " + (currentCase.dupMatch || "") + " and sent to verification");
                }}
              >
                Mark as duplicate
              </Button>
            )}
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
                    <b className="font-mono">{v}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-destructive/25 bg-[var(--destructive-soft)]/60 p-4">
              <div className="mb-2 text-[11px] font-bold tracking-wide text-destructive">
                CONFLICT: {currentCase.dupMatch}
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Owner", currentCase.owner],
                  ["Survey", currentCase.survey],
                  ["Village", currentCase.village],
                  ["Area", "2.40 Ha"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <b className="font-mono">{v}</b>
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
              onClick={() => {
                setShowCompare(false);
                setDupResolved(true);
                show("Resolved: not a duplicate");
              }}
            >
              Not a duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ask AI */}
      <Card className="mt-4 border-border/80">
        <CardContent className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Ask LandLens AI
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Get a plain-language explanation of any flag on this record.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              ["flag", "Why is this record flagged?"],
              ["lowconf", "Which field has low confidence?"],
              ["missing", "What information is missing?"],
              ["why", "Why does this record need verification?"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setAnswer(answers[k])}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" /> {l}
              </button>
            ))}
          </div>
          {answer && (
            <div className="rounded-xl border-l-[3px] border-primary bg-muted/70 px-4 py-3 text-sm leading-relaxed">
              <b>LandLens AI:</b>{" "}
              <span dangerouslySetInnerHTML={{ __html: answer }} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
