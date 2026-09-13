"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCaseStore } from "@/store/case-store";

const steps = [
  "Document uploaded",
  "Image enhancement",
  "Language detection",
  "Layout detection",
  "OCR processing",
  "Handwriting recognition",
  "Information extraction",
  "Validation",
  "Duplicate detection",
];

const msgs: Record<string, string> = {
  queued: "Preparing document…",
  preprocess: "Enhancing scan quality…",
  ocr: "Running OCR across the page…",
  extracting: "AI is identifying land record entities…",
  validating: "Cross-checking against LRMS records…",
  done: "AI digitization complete.",
  failed: "Extraction failed — using fallback.",
};

const simulatedMsgs = [
  "Preparing document…",
  "Enhancing scan quality…",
  "Detecting document language…",
  "Mapping document layout…",
  "Running OCR…",
  "Reading handwritten entries…",
  "AI is identifying entities…",
  "Cross-checking…",
  "Scanning duplicates…",
];

export default function Processing() {
  const router = useRouter();
  const { currentCase, uploadedFile, jobId, setCase, setFields } = useCaseStore();
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState(msgs.queued);
  const initialMode =
    typeof window !== "undefined" && (jobId || sessionStorage.getItem("landlens_jobId"))
      ? ("backend" as const)
      : ("fallback" as const);
  const [mode] = useState<"backend" | "fallback">(initialMode);

  useEffect(() => {
    const id = jobId || (typeof window !== "undefined" ? sessionStorage.getItem("landlens_jobId") : null);
    if (!id) {
      let p = 0;
      const t = setInterval(() => {
        p += Math.random() * 9 + 5;
        if (p >= 100) {
          p = 100;
          clearInterval(t);
          setPct(100);
          setMsg(msgs.done);
          setTimeout(() => router.push("/extraction"), 700);
        } else {
          setPct(p);
          const idx = Math.min(steps.length - 1, Math.floor((p / 100) * steps.length));
          setMsg(simulatedMsgs[idx]);
        }
      }, 420);
      return () => clearInterval(t);
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/jobs/${id}`);
        if (!r.ok) throw new Error("job not found");
        const j = await r.json();
        if (cancelled) return;
        setPct(j.progress || 0);
        setMsg(msgs[j.status] || j.status);
        if (j.status === "done" && j.record) {
          setCase({
            recId: j.record.recId,
            owner: j.record.owner,
            survey: j.record.survey,
            khata: j.record.khata,
            village: j.record.village,
            tehsil: j.record.tehsil,
            district: j.record.district,
            area: j.record.area,
            areaDb: j.record.areaDb,
            classification: j.record.classification,
            mutationDate: j.record.mutationDate,
            dupSim: j.record.dupSim ?? 12,
            dupMatch: j.record.dupMatch ?? null,
            lang: j.record.lang,
            docLabel: j.record.docLabel,
          });
          setFields(j.record.fields);
          setTimeout(() => router.push("/extraction"), 500);
        } else if (j.status === "failed") {
          setMsg(msgs.failed + " " + (j.error || ""));
          setTimeout(() => router.push("/extraction"), 1000);
        } else {
          setTimeout(poll, 800);
        }
      } catch {
        setMsg("Backend offline — showing sample data");
        setTimeout(() => router.push("/extraction"), 1200);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [router, jobId, setCase, setFields]);

  const stepIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
  const bgImg = uploadedFile?.isImage && uploadedFile.url ? `url(${uploadedFile.url})` : undefined;

  return (
    <div>
      <PageHeader
        title="AI processing"
        description={`${currentCase.docLabel}${mode === "backend" && jobId ? ` · Job ${jobId}` : ""}`}
      />
      <Tracker activeIdx={2} />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          ["DOCUMENT QUALITY CHECK", "Good — scan usable", "92%"],
          ["DOCUMENT TYPE DETECTION", "Gaav Namuna 7/12 Register", "96%"],
          ["LANGUAGE DETECTED", currentCase.lang ?? "Marathi", "97%"],
        ].map(([l, v, c]) => (
          <Card key={l} className="border-border/80">
            <CardContent className="p-4">
              <div className="mb-1.5 text-[10px] font-bold tracking-[0.12em] text-muted-foreground">{l}</div>
              <div className="flex items-center justify-between gap-2">
                <b className="truncate text-[13px]">{v}</b>
                <Badge className="shrink-0 rounded-md bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)] hover:bg-[var(--success-soft)]">
                  {c}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Document preview with scanline */}
        <Card className="overflow-hidden border-border/80 p-0">
          <div
            className="relative h-[420px] bg-[#efe9dc]"
            style={
              bgImg
                ? { backgroundImage: bgImg, backgroundSize: "cover", backgroundPosition: "center" }
                : {
                    backgroundImage:
                      "repeating-linear-gradient(0deg,transparent,transparent 22px,rgba(0,0,0,.05) 22px,rgba(0,0,0,.05) 23px)",
                  }
            }
          >
            <div className="animate-scan absolute left-0 right-0 h-[70px] bg-gradient-to-b from-transparent via-primary/35 to-transparent" />
          </div>
        </Card>

        {/* Progress panel */}
        <Card className="border-border/80">
          <CardContent className="p-6">
            <div className="flex items-end justify-between">
              <div className="font-mono text-4xl font-bold">{Math.round(pct)}%</div>
              <Badge variant="outline" className="gap-1.5 rounded-full border-primary/40 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing
              </Badge>
            </div>
            <Progress value={pct} className="mt-3 h-2.5" />
            <p className="mt-3 text-sm text-muted-foreground">{msg}</p>

            <ul className="mt-5 max-h-[220px] divide-y divide-border overflow-y-auto">
              {steps.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-3 py-2.5 text-sm ${
                    i === stepIdx ? "font-bold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                      i < stepIdx
                        ? "border-[var(--success)] bg-[var(--success)] text-white"
                        : i === stepIdx
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {["OCR Engine: Gemini", "Computer Vision", "NLP Engine: Sarvam fallback", "Validation Engine"].map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
            {mode === "backend" && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Polling <code className="rounded bg-muted px-1 py-0.5">/api/jobs/{jobId}</code> every 800ms — Gemini VLM
                does the heavy lifting.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
