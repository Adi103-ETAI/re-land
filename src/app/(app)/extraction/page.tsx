"use client";
import Link from "next/link";
import { useState } from "react";
import Tracker from "@/components/workflow/Tracker";
import { useCaseStore } from "@/store/case-store";

const FIELD_DEFS: Record<string, string> = {
  owner: "OWNER NAME",
  survey: "SURVEY NUMBER",
  khata: "KHATA NUMBER",
  village: "VILLAGE",
  tehsil: "TEHSIL",
  district: "DISTRICT",
  area: "LAND AREA",
  classification: "CLASSIFICATION",
  mutationDate: "MUTATION DATE",
  khasra: "KHASRA NUMBER",
};

export default function Extraction() {
  const { currentCase, uploadedFile, fields } = useCaseStore();
  const [hl, setHl] = useState<string | null>(null);

  // Dynamic fields from Gemini (replaces constants) — fallback to case if no backend result
  const dynamicFields = fields ? fields.map(f => ({
    key: f.key,
    label: FIELD_DEFS[f.key] || f.key.toUpperCase(),
    conf: Math.round((f.confidence ?? 0.85) * 100),
    value: f.value,
    source: f.source,
  })) : [
    { key: "owner", label: "OWNER NAME", conf: 98, value: currentCase.owner, source: "mock" },
    { key: "survey", label: "SURVEY NUMBER", conf: 96, value: currentCase.survey, source: "mock" },
    { key: "khata", label: "KHATA NUMBER", conf: 94, value: currentCase.khata, source: "mock" },
    { key: "village", label: "VILLAGE", conf: 99, value: currentCase.village, source: "mock" },
    { key: "tehsil", label: "TEHSIL", conf: 97, value: currentCase.tehsil, source: "mock" },
    { key: "district", label: "DISTRICT", conf: 99, value: currentCase.district, source: "mock" },
    { key: "area", label: "LAND AREA", conf: 91, value: currentCase.area + " Hectare", source: "mock" },
    { key: "classification", label: "CLASSIFICATION", conf: 87, value: currentCase.classification, source: "mock" },
    { key: "mutationDate", label: "MUTATION DATE", conf: 64, value: currentCase.mutationDate, source: "mock" },
  ];

  const bboxes: Record<string, { top: number; left: number; w: number; h: number; tag: string }> = {
    owner: { top: 60, left: 30, w: 170, h: 26, tag: "Owner name" },
    survey: { top: 110, left: 220, w: 110, h: 24, tag: "Survey no." },
    khata: { top: 160, left: 40, w: 140, h: 24, tag: "Khata no." },
    village: { top: 210, left: 200, w: 120, h: 24, tag: "Village" },
    tehsil: { top: 260, left: 40, w: 110, h: 24, tag: "Tehsil" },
    district: { top: 260, left: 200, w: 110, h: 24, tag: "District" },
    area: { top: 320, left: 40, w: 130, h: 24, tag: "Area" },
    classification: { top: 370, left: 200, w: 150, h: 24, tag: "Classification" },
    mutationDate: { top: 410, left: 30, w: 160, h: 24, tag: "Mutation" },
  };

  const bgImg = uploadedFile?.isImage && uploadedFile.url ? `url(${uploadedFile.url})` : undefined;
  const isMock = !fields;

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
        <div><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Before vs after — AI extracted information</h2>
        <p className="text-sm text-[var(--gray-600)]">Hover a field to locate it on the source document. {isMock ? "Sample data" : "Live Gemini extraction"}</p></div>
        <Link href="/validation" className="btn btn-primary btn-sm">Continue to validation →</Link>
      </div>
      <Tracker activeIdx={3} />
      {isMock ? <div className="demo-tag mb-3">⚠ Sample Data — Upload a document to see real extraction</div> : <div className="inline-flex items-center gap-2 bg-[#F0F7EC] text-[#496D21] px-3 py-1.5 rounded-full text-xs font-bold mb-3">✓ Live Gemini extraction — per-field confidence from backend</div>}
      <div className="bg-[#FFF3EA] text-[#B5651D] rounded-xl px-3.5 py-2.5 text-sm font-semibold mb-4 flex items-center gap-2">🧠 {isMock ? "Showing sample — upload will replace with careful Gemini + rule fusion" : "AI extracted these values with careful Gemini API + rule validation"}</div>
      <div className="grid grid-cols-2 gap-2.5 mb-2.5 text-[11px] font-extrabold tracking-wide text-[var(--gray-500)]"><div>BEFORE — HISTORICAL SCANNED DOCUMENT</div><div>AFTER — STRUCTURED DIGITAL RECORD</div></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="relative bg-[#EFEAD9] border border-[#DCD2AE] rounded-xl p-4 min-h-[520px] overflow-hidden" style={bgImg ? { backgroundImage: bgImg, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
          {!bgImg && <div className="opacity-50 space-y-2.5">{[70, 40, 85, 55, 30, 65, 50, 75].map((w, i) => <div key={i} className="h-2.5 bg-[#D9CFA9] rounded-sm" style={{ width: `${w}%` }} />)}</div>}
          {Object.entries(bboxes).map(([k, b]) => (
            <div key={k} onMouseEnter={() => setHl(k)} onMouseLeave={() => setHl(null)} className={`absolute border-2 rounded-md cursor-pointer transition ${hl === k ? "bg-[rgba(248,118,19,0.18)] shadow-[0_0_0_3px_rgba(248,118,19,0.25)] border-[var(--saffron-600)]" : "bg-[rgba(248,118,19,0.06)] border-[var(--saffron-600)]"}`} style={{ top: b.top, left: b.left, width: b.w, height: b.h }}>
              <span className="absolute -top-5 left-0 text-[10px] bg-[var(--saffron-600)] text-white px-1.5 py-0.5 rounded whitespace-nowrap">{b.tag}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          {dynamicFields.map(f => {
            const confColor = f.conf >= 93 ? "var(--success)" : f.conf >= 80 ? "var(--warning)" : "var(--error)";
            const barCls = f.conf >= 93 ? "bg-[#496D21]" : f.conf >= 80 ? "bg-[#B5651D]" : "bg-[#A13A2C]";
            return (
              <div key={f.key} onMouseEnter={() => setHl(f.key)} onMouseLeave={() => setHl(null)} className={`border rounded-xl p-3 cursor-pointer transition ${hl === f.key ? "border-[var(--saffron-600)]" : "border-[var(--border-hairline)]"}`}>
                <div className="flex justify-between items-baseline"><span className="text-[11px] font-bold text-[var(--gray-500)]">{f.label}</span><span className="font-mono text-xs font-bold" style={{ color: confColor }}>{f.conf}% <span className="text-[10px] font-normal text-[var(--gray-500)]">{f.source !== "mock" ? `· ${f.source}` : ""}</span></span></div>
                <div className="font-mono font-bold text-[15px] text-[var(--ink-800)] my-1">{f.value}</div>
                <div className="h-1.5 bg-[var(--border-hairline)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${barCls}`} style={{ width: `${f.conf}%` }} /></div>
                {f.conf < 90 && <div className="inline-block mt-2 text-[11px] font-bold bg-[var(--error-bg)] text-[var(--error)] px-2 py-0.5 rounded-md">Needs human verification</div>}
                {f.conf < 70 && <div className="text-[11px] text-[var(--gray-500)] mt-1">Low confidence — will route to verification queue</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
