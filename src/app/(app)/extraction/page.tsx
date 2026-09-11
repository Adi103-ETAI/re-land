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

const TAG_LABEL: Record<string, string> = {
  owner: "Owner name",
  survey: "Survey no.",
  khata: "Khata no.",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  area: "Area",
  classification: "Classification",
  mutationDate: "Mutation",
  khasra: "Khasra",
};

export default function Extraction() {
  const { currentCase, uploadedFile, fields } = useCaseStore();
  const [hl, setHl] = useState<string | null>(null);

  const dynamicFields = fields ? fields.map(f => ({
    key: f.key,
    label: FIELD_DEFS[f.key] || f.key.toUpperCase(),
    conf: Math.round((f.confidence ?? 0) * 100),
    value: f.value,
    source: f.source,
    bbox: f.bbox || null,
  })) : [
    { key: "owner", label: "OWNER NAME", conf: 98, value: currentCase.owner, source: "mock", bbox: null },
    { key: "survey", label: "SURVEY NUMBER", conf: 96, value: currentCase.survey, source: "mock", bbox: null },
    { key: "khata", label: "KHATA NUMBER", conf: 94, value: currentCase.khata, source: "mock", bbox: null },
    { key: "village", label: "VILLAGE", conf: 99, value: currentCase.village, source: "mock", bbox: null },
    { key: "tehsil", label: "TEHSIL", conf: 97, value: currentCase.tehsil, source: "mock", bbox: null },
    { key: "district", label: "DISTRICT", conf: 99, value: currentCase.district, source: "mock", bbox: null },
    { key: "area", label: "LAND AREA", conf: 91, value: currentCase.area + " Hectare", source: "mock", bbox: null },
    { key: "classification", label: "CLASSIFICATION", conf: 87, value: currentCase.classification, source: "mock", bbox: null },
    { key: "mutationDate", label: "MUTATION DATE", conf: 64, value: currentCase.mutationDate, source: "mock", bbox: null },
  ];

  const isMock = !fields;
  // Only show bboxes that Gemini actually returned (confidence >0 and bbox non-null)
  const visibleBboxes = dynamicFields.filter(f => f.bbox && f.conf > 0 && f.value !== "—" && f.value !== "-");

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
        <div><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Before vs after — AI extracted information</h2>
        <p className="text-sm text-[var(--gray-600)]">Hover a field to locate it. {isMock ? "Sample data" : `${visibleBboxes.length} fields located on document`}</p></div>
        <Link href="/validation" className="btn btn-primary btn-sm">Continue to validation →</Link>
      </div>
      <Tracker activeIdx={3} />
      {isMock ? <div className="demo-tag mb-3">⚠ Sample Data — Upload a document to see real extraction</div> : <div className="inline-flex items-center gap-2 bg-[#F0F7EC] text-[#496D21] px-3 py-1.5 rounded-full text-xs font-bold mb-3">✓ Live Gemini extraction — {visibleBboxes.length} markings on document</div>}
      <div className="bg-[#FFF3EA] text-[#B5651D] rounded-xl px-3.5 py-2.5 text-sm font-semibold mb-4 flex items-center gap-2">🧠 {isMock ? "Showing sample — upload will replace with careful Gemini + bbox" : "Markings shown only where Gemini found the field — missing fields have no box"}</div>
      <div className="grid grid-cols-2 gap-2.5 mb-2.5 text-[11px] font-extrabold tracking-wide text-[var(--gray-500)]"><div>BEFORE — HISTORICAL SCANNED DOCUMENT</div><div>AFTER — STRUCTURED DIGITAL RECORD</div></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-[#EFEAD9] border border-[#DCD2AE] rounded-xl overflow-hidden">
          {uploadedFile?.url ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedFile.url} alt="Scanned document" className="w-full h-auto block" />
              {/* Only show bboxes where Gemini returned coordinates — missing fields (khasra/mutation when —) have no box */}
              {visibleBboxes.map(f => {
                const b = f.bbox as unknown as Record<string, number>;
                // Support both {ymin,xmin,ymax,xmax} normalized and legacy {x,y,w,h}
                let style: React.CSSProperties = {};
                if (b.ymin !== undefined) {
                  style = { top: `${b.ymin*100}%`, left: `${b.xmin*100}%`, width: `${(b.xmax-b.xmin)*100}%`, height: `${(b.ymax-b.ymin)*100}%` };
                } else if (b.x !== undefined) {
                  style = { top: (b.y as unknown as string), left: (b.x as unknown as string), width: (b.w as unknown as string), height: (b.h as unknown as string) };
                }
                return (
                  <div key={f.key} onMouseEnter={() => setHl(f.key)} onMouseLeave={() => setHl(null)}
                    className={`absolute border-2 rounded-md cursor-pointer transition ${hl === f.key ? "bg-[rgba(248,118,19,0.22)] shadow-[0_0_0_3px_rgba(248,118,19,0.3)] border-[var(--saffron-600)]" : "bg-[rgba(248,118,19,0.10)] border-[var(--saffron-600)]"}`} style={style}>
                    <span className="absolute -top-5 left-0 text-[10px] bg-[var(--saffron-600)] text-white px-1.5 py-0.5 rounded whitespace-nowrap">{TAG_LABEL[f.key] || f.key}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 opacity-50 space-y-2.5 min-h-[520px]">{[70, 40, 85, 55, 30, 65, 50, 75].map((w, i) => <div key={i} className="h-2.5 bg-[#D9CFA9] rounded-sm" style={{ width: `${w}%` }} />)}</div>
          )}
        </div>
        <div className="space-y-2.5">
          {dynamicFields.map(f => {
            const confColor = f.conf >= 93 ? "var(--success)" : f.conf >= 80 ? "var(--warning)" : "var(--error)";
            const barCls = f.conf >= 93 ? "bg-[#496D21]" : f.conf >= 80 ? "bg-[#B5651D]" : "bg-[#A13A2C]";
            const hasBox = !!(f.bbox);
            return (
              <div key={f.key} onMouseEnter={() => setHl(f.key)} onMouseLeave={() => setHl(null)} className={`border rounded-xl p-3 cursor-pointer transition ${hl === f.key ? "border-[var(--saffron-600)]" : "border-[var(--border-hairline)]"} ${!hasBox && f.value==="—" ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-baseline"><span className="text-[11px] font-bold text-[var(--gray-500)]">{f.label} {!hasBox && f.value==="—" && <span className="font-normal">· not on paper</span>}</span><span className="font-mono text-xs font-bold" style={{ color: confColor }}>{f.conf}% <span className="text-[10px] font-normal text-[var(--gray-500)]">{f.source !== "mock" ? `· ${f.source}${hasBox ? " · located" : " · no box"}` : ""}</span></span></div>
                <div className="font-mono font-bold text-[15px] text-[var(--ink-800)] my-1">{f.value}</div>
                <div className="h-1.5 bg-[var(--border-hairline)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${barCls}`} style={{ width: `${f.conf}%` }} /></div>
                {f.conf > 0 && f.conf < 90 && <div className="inline-block mt-2 text-[11px] font-bold bg-[var(--error-bg)] text-[var(--error)] px-2 py-0.5 rounded-md">Needs human verification</div>}
                {f.value==="—" && <div className="text-[11px] text-[var(--gray-500)] mt-1">Not found on this paper — no marking shown</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
