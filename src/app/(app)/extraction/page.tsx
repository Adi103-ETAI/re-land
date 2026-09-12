"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BrainCircuit, TriangleAlert } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCaseStore } from "@/store/case-store";

const FIELD_DEFS: Record<string, string> = {
  owner: "Owner name",
  survey: "Survey number",
  khata: "Khata number",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  area: "Land area",
  classification: "Classification",
  mutationDate: "Mutation date",
  khasra: "Khasra number",
};

export default function Extraction() {
  const { currentCase, uploadedFile, fields } = useCaseStore();
  const [hl, setHl] = useState<string | null>(null);

  const dynamicFields = fields
    ? fields.map((f) => ({
        key: f.key,
        label: FIELD_DEFS[f.key] || f.key.toUpperCase(),
        conf: Math.round((f.confidence ?? 0) * 100),
        value: f.value,
        source: f.source,
        bbox: f.bbox || null,
      }))
    : [
        { key: "owner", label: "Owner name", conf: 98, value: currentCase.owner, source: "mock", bbox: null },
        { key: "survey", label: "Survey number", conf: 96, value: currentCase.survey, source: "mock", bbox: null },
        { key: "khata", label: "Khata number", conf: 94, value: currentCase.khata, source: "mock", bbox: null },
        { key: "village", label: "Village", conf: 99, value: currentCase.village, source: "mock", bbox: null },
        { key: "tehsil", label: "Tehsil", conf: 97, value: currentCase.tehsil, source: "mock", bbox: null },
        { key: "district", label: "District", conf: 99, value: currentCase.district, source: "mock", bbox: null },
        { key: "area", label: "Land area", conf: 91, value: currentCase.area + " Hectare", source: "mock", bbox: null },
        { key: "classification", label: "Classification", conf: 87, value: currentCase.classification, source: "mock", bbox: null },
        { key: "mutationDate", label: "Mutation date", conf: 64, value: currentCase.mutationDate, source: "mock", bbox: null },
      ];

  const isMock = !fields;
  const visibleBboxes = dynamicFields.filter(
    (f) => f.bbox && f.conf > 0 && f.value !== "—" && f.value !== "-"
  );

  return (
    <div>
      <PageHeader
        title="Before vs after — AI extracted information"
        description={`Hover a field to locate it. ${isMock ? "Sample data" : `${visibleBboxes.length} fields located on document`}`}
        actions={
          <Link href="/validation">
            <Button className="rounded-full">
              Continue to validation <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
      <Tracker activeIdx={3} />

      {isMock ? (
        <Badge variant="outline" className="mb-4 gap-1.5 rounded-full border-warning/40 bg-[var(--warning-soft)] px-3 py-1.5 text-xs font-semibold text-warning">
          <TriangleAlert className="h-3.5 w-3.5" /> Sample data — upload a document to see real extraction
        </Badge>
      ) : (
        <Badge className="mb-4 gap-1.5 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)] hover:bg-[var(--success-soft)]">
          <BrainCircuit className="h-3.5 w-3.5" /> Live Gemini extraction — {visibleBboxes.length} markings on document
        </Badge>
      )}

      <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-warning/25 bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-warning">
        <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
        {isMock
          ? "Showing sample — an upload will replace this with real Gemini extraction + bounding boxes."
          : "Markings are shown only where the model found the field — missing fields have no box."}
      </div>

      <div className="mb-2.5 grid grid-cols-2 gap-2.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
        <div>BEFORE — HISTORICAL SCANNED DOCUMENT</div>
        <div>AFTER — STRUCTURED DIGITAL RECORD</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Scanned document */}
        <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-[#d8cfae] bg-[#efe9dc]">
          {uploadedFile?.url ? (
            <img src={uploadedFile.url} alt="Scanned document" className="block h-auto w-full object-contain" />
          ) : (
            <div className="space-y-2.5 p-4 opacity-50">
              {[70, 40, 85, 55, 30, 65, 50, 75].map((w, i) => (
                <div key={i} className="h-2.5 rounded-sm bg-[#c9bda0]" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
          {visibleBboxes.map((f) => {
            const b = f.bbox as unknown as Record<string, number>;
            let style: React.CSSProperties = {};
            if (b.ymin !== undefined) {
              style = {
                top: `${b.ymin * 100}%`,
                left: `${b.xmin * 100}%`,
                width: `${(b.xmax - b.xmin) * 100}%`,
                height: `${(b.ymax - b.ymin) * 100}%`,
              };
            } else if (b.x !== undefined) {
              style = { top: b.y, left: b.x, width: b.w, height: b.h };
            }
            return (
              <div
                key={f.key}
                onMouseEnter={() => setHl(f.key)}
                onMouseLeave={() => setHl(null)}
                className={`absolute rounded-lg border-2 border-primary transition ${
                  hl === f.key
                    ? "bg-primary/25 shadow-[0_0_0_3px_rgba(234,106,10,0.3)]"
                    : "bg-primary/10"
                }`}
                style={style}
              >
                <span className="absolute -top-5 left-0 whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {f.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Extracted fields */}
        <div className="space-y-2.5">
          {dynamicFields.map((f) => {
            const confColor =
              f.conf >= 93 ? "var(--success)" : f.conf >= 80 ? "var(--warning)" : "var(--destructive)";
            const barCls =
              f.conf >= 93 ? "bg-[var(--success)]" : f.conf >= 80 ? "bg-[var(--warning)]" : "bg-destructive";
            const hasBox = !!f.bbox;
            return (
              <div
                key={f.key}
                onMouseEnter={() => setHl(f.key)}
                onMouseLeave={() => setHl(null)}
                className={`cursor-pointer rounded-2xl border bg-card p-4 transition-all hover:shadow-sm ${
                  hl === f.key ? "border-primary shadow-md shadow-primary/10" : "border-border/80"
                } ${!hasBox && f.value === "—" ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground">
                    {f.label.toUpperCase()}
                    {!hasBox && f.value === "—" && <span className="font-normal normal-case"> · not on paper</span>}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-bold" style={{ color: confColor }}>
                    {f.conf}%
                    {f.source !== "mock" && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {f.source}
                        {hasBox ? " · located" : " · no box"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="my-1.5 font-mono text-[15px] font-bold">{f.value}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${barCls}`} style={{ width: `${f.conf}%` }} />
                </div>
                {f.conf > 0 && f.conf < 90 && (
                  <Badge variant="outline" className="mt-2.5 rounded-md border-destructive/30 bg-[var(--destructive-soft)] text-[10px] font-bold text-destructive">
                    NEEDS HUMAN VERIFICATION
                  </Badge>
                )}
                {f.value === "—" && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Not found on this paper — no marking shown
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
