"use client";
import Tracker from "@/components/workflow/Tracker";
import { useCaseStore } from "@/store/case-store";

export default function Audit() {
  const { currentCase } = useCaseStore();
  const score = Math.max(70, Math.round(100 - (Math.abs(currentCase.area - currentCase.areaDb) > 0.001 ? 6 : 0) - (currentCase.dupMatch ? 4 : 0) - 2));
  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Audit trail</h2><p className="text-sm text-[var(--gray-600)]">Record {currentCase.recId} · Full history</p></div>
      <Tracker activeIdx={6} />
      <div className="card">
        <div className="relative pl-6 border-l-2 border-[var(--border-hairline)] space-y-0">
          {[
            { time: "09:42", title: "Document uploaded", badge: "✓ Complete", ok: true, desc: currentCase.docLabel, meta: ["User: R. Deshmukh", "Role: Officer"] },
            { time: "09:43", title: "OCR completed", badge: "✓ Complete", ok: true, desc: `${currentCase.lang} text extracted via Tesseract.js`, meta: ["System: OCR engine (Tesseract)"] },
            { time: "09:43", title: "AI extraction completed", badge: "✓ Complete", ok: true, desc: "8 fields extracted, 2 flagged below confidence threshold", meta: ["System: Extraction engine"] },
            { time: "09:44", title: "Validation performed", badge: "⚠ Issues found", ok: false, desc: `Validation score ${score}/100 · area ${Math.abs(currentCase.area - currentCase.areaDb) > 0.001 ? "mismatch" : "ok"} and ${currentCase.dupMatch ? "possible duplicate" : "no duplicate"}`, meta: ["System: Validation engine"] },
            { time: "09:47", title: "Officer reviewed", badge: "✓ Complete", ok: true, desc: `Record ${currentCase.recId} opened for review`, meta: ["User: R. Deshmukh", "Role: Officer"] },
            { time: "09:49", title: "Area corrected", badge: "✓ Complete", ok: true, desc: `Previous: ${currentCase.area} Hectare → New: ${currentCase.areaDb} Hectare`, meta: [`Previous: ${currentCase.area} Ha`, `New: ${currentCase.areaDb} Ha`] },
            { time: "09:50", title: "Record approved", badge: "✓ Verified", ok: true, desc: `Digital record ${currentCase.recId} generated and verified`, meta: ["User: R. Deshmukh", "Role: Officer"] },
          ].map(ev => (
            <div key={ev.title} className="relative pb-5 last:pb-0">
              <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--saffron-600)] border-2 border-white shadow-[0_0_0_2px_var(--saffron-600)]" />
              <div className="font-mono text-xs text-[var(--gray-500)]">{ev.time}</div>
              <h4 className="font-semibold text-sm text-[var(--ink-800)] mt-0.5">{ev.title} <span className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-md ${ev.ok ? "bg-[#F0F7EC] text-[#496D21]" : "bg-[#FFF3EA] text-[#B5651D]"}`}>{ev.badge}</span></h4>
              <p className="text-xs text-[var(--gray-600)] mt-0.5">{ev.desc}</p>
              <div className="flex gap-2 mt-1.5 flex-wrap">{ev.meta.map(m => <span key={m} className="bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2 py-0.5 rounded-md text-[11px] text-[var(--gray-600)]">{m}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
