"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCaseStore } from "@/store/case-store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getJobStatus } from "@/lib/api";
import { createRecord, logAudit, updateDocument } from "@/lib/db";
import { getSession } from "@/lib/supabase";

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
  validating: "Cross-checking against reference records…",
  done: "AI digitization complete.",
  failed: "Extraction failed.",
};

export default function Processing() {
  const router = useRouter();
  const { configured, ready } = useRequireAuth();
  const { uploadedFile, jobId, setCase, setFields, setRecordId, documentId } = useCaseStore();
  const [pct, setPct] = useState(4);
  const [msg, setMsg] = useState(msgs.queued);
  const [error, setError] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const savedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = jobId || (typeof window !== "undefined" ? sessionStorage.getItem("landlens_jobId") : null);

  useEffect(() => {
    if (!ready || !configured) return;
    if (!id) {
      setError("No extraction job is running. Start by uploading a document.");
      return;
    }

    // Keep the job id available across reloads (store itself is in-memory only).
    try {
      sessionStorage.setItem("landlens_jobId", id);
    } catch {
      /* storage unavailable — polling still works for this mount */
    }

    const savedKey = `landlens_saved_${id}`;
    const recordKey = `landlens_record_${id}`;

    // Already finished in this session (store hydrated + persisted) → don't
    // hit the API again, don't re-save, just bounce to the result.
    // This is what stops OCR "restarting" on tab back & forth.
    const st = useCaseStore.getState();
    if (st.recordId && st.fields && st.currentCase) {
      savedRef.current = true;
      setPct(100);
      setMsg(msgs.done);
      setStepIdx(steps.length - 1);
      setCompleted(true);
      timerRef.current = setTimeout(() => router.push("/extraction"), 400);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const j = await getJobStatus(id);
        if (cancelled) return;
        setPct(j.progress || 0);
        setMsg(msgs[j.status] || j.status);
        setStepIdx(Math.min(steps.length - 1, Math.floor(((j.progress || 0) / 100) * steps.length)));

        if (j.status === "done" && j.record) {
          const rec = j.record;
          setCase({
            recId: rec.recId,
            owner: rec.owner ?? "",
            survey: rec.survey ?? "",
            khata: rec.khata ?? "",
            village: rec.village ?? "",
            tehsil: rec.tehsil ?? "",
            district: rec.district ?? "",
            area: Number(rec.area) || 0,
            areaDb: Number(rec.areaDb) || 0,
            classification: rec.classification ?? "",
            mutationDate: rec.mutationDate ?? "",
            dupSim: rec.dupSim ?? 0,
            dupMatch: rec.dupMatch ?? null,
            lang: rec.lang ?? "",
            docLabel: rec.docLabel ?? useCaseStore.getState().uploadedFile?.name ?? "Scanned document",
          });
          setFields(rec.fields ?? []);

          // Persist the extraction result exactly once per job — the ref guards
          // StrictMode / re-renders within a mount, sessionStorage guards
          // remounts (tab back & forth) and page reloads.
          const alreadySaved =
            savedRef.current ||
            (typeof window !== "undefined" && sessionStorage.getItem(savedKey) === "1");
          if (!alreadySaved) {
            savedRef.current = true;
            try {
              const session = await getSession();
              const confList = (rec.fields ?? []).map((f: any) => Number(f.confidence ?? 0)).filter((c: number) => c > 0);
              const avgConf = confList.length ? confList.reduce((s: number, c: number) => s + c, 0) / confList.length : null;
              const saved = await createRecord({
                document_id: documentId,
                created_by: session.user?.id ?? null,
                page_number: 1,
                fields: Object.fromEntries((rec.fields ?? []).map((f: any) => [f.key, f.value])),
                confidence_score: avgConf,
                language: rec.lang ?? null,
                survey_no: rec.survey ?? null,
                khata_no: rec.khata ?? null,
                owner_name: rec.owner ?? null,
                village: rec.village ?? null,
                tehsil: rec.tehsil ?? null,
                district: rec.district ?? null,
                area_detected: rec.area != null ? Number(rec.area) : null,
                area_reference: rec.areaDb != null ? Number(rec.areaDb) : null,
                classification: rec.classification ?? null,
                mutation_date: rec.mutationDate ?? null,
                validation_status: "pending",
                validation_score: rec.validationScore ?? rec.score ?? null,
                dup_similarity: rec.dupSim ?? null,
                dup_match_code: rec.dupMatch ?? null,
              });
              setRecordId(saved.id);
              try {
                sessionStorage.setItem(savedKey, "1");
                sessionStorage.setItem(recordKey, saved.id);
              } catch {
                /* non-fatal */
              }
              if (documentId) await updateDocument(documentId, { status: "completed", processed_at: new Date().toISOString() });
              await logAudit({
                userId: session.user?.id,
                action: "EXTRACTION_COMPLETED",
                entityType: "record",
                entityId: saved.record_code ?? saved.id,
                newValues: { survey_no: rec.survey, owner: rec.owner },
              });
            } catch (e: any) {
              if (!cancelled) setError(`Extraction succeeded but saving failed: ${e?.message || e}`);
            }
          } else {
            // Revisit after a reload: result already persisted — rehydrate the
            // store (incl. recordId for the validation page) without inserting
            // a duplicate row or audit entry.
            savedRef.current = true;
            try {
              const storedRecordId = sessionStorage.getItem(recordKey);
              if (storedRecordId && !useCaseStore.getState().recordId) {
                setRecordId(storedRecordId);
              }
            } catch {
              /* non-fatal */
            }
          }

          setPct(100);
          setMsg(msgs.done);
          setCompleted(true);
          timerRef.current = setTimeout(() => !cancelled && router.push("/extraction"), 700);
        } else if (j.status === "failed") {
          setError(msgs.failed + " " + (j.error || ""));
          if (documentId) await updateDocument(documentId, { status: "failed", error: j.error || "pipeline failed" }).catch(() => {});
        } else {
          timerRef.current = setTimeout(poll, 800);
        }
      } catch {
        if (!cancelled) {
          setError("The extraction service is unreachable right now. Your document is safely stored — you can retry processing once the service is back.");
        }
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ready, configured, id, documentId, router, setCase, setFields, setRecordId]);

  const bgImg = uploadedFile?.isImage && uploadedFile.url ? `url(${uploadedFile.url})` : undefined;

  return (
    <div>
      <PageHeader
        title="AI processing"
        description={`${uploadedFile?.name ?? "Document"}${id ? ` · Job ${id}` : ""}`}
      />

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
            {!error && !completed && (
              <div className="animate-scan absolute left-0 right-0 h-[70px] bg-gradient-to-b from-transparent via-primary/35 to-transparent" />
            )}
          </div>
        </Card>

        {/* Progress panel */}
        <Card className="border-border/80">
          <CardContent className="p-6">
            {error ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">{error}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nothing was saved as an extracted record — your original document is safe and untouched.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-full" onClick={() => router.push("/upload")}>
                    <RefreshCw className="h-4 w-4" /> Start a new upload
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => router.push("/dashboard")}>
                    Back to dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div className="font-mono text-4xl font-bold">{Math.round(pct)}%</div>
                  {completed ? (
                    <Badge variant="outline" className="gap-1.5 rounded-full border-[var(--success)] text-[var(--success)]">
                      <Check className="h-3 w-3" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 rounded-full border-primary/40 text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" /> Processing
                    </Badge>
                  )}
                </div>
                <Progress value={pct} className="mt-3 h-2.5" />
                <p className="mt-3 text-sm text-muted-foreground">{msg}</p>
                {completed && (
                  <Button className="mt-4 rounded-full" onClick={() => router.push("/extraction")}>
                    View extracted record
                  </Button>
                )}

                <ul className="mt-5 max-h-[260px] divide-y divide-border overflow-y-auto">
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
                <p className="mt-4 text-[11px] text-muted-foreground">
                  The extracted record is saved automatically when processing completes.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
