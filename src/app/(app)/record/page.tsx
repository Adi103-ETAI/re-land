"use client";
import Link from "next/link";
import Tracker from "@/components/workflow/Tracker";
import { useCaseStore } from "@/store/case-store";

export default function RecordPage() {
  const { currentCase } = useCaseStore();
  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Verified digital land record</h2><p className="text-sm text-[var(--gray-600)]">Generated after officer approval.</p></div>
      <Tracker activeIdx={6} />
      <div className="demo-tag mb-3">⚠ Illustrative Demo Data — Not an Official Land Record</div>
      <div className="card flex justify-between items-start mb-4">
        <div><h2 className="font-mono font-bold text-lg text-[var(--ink-800)]">{currentCase.recId}</h2><p className="text-xs font-mono text-[var(--gray-600)]">Approved 3 Sep 2026 · Officer: R. Deshmukh</p></div>
        <div className="w-[76px] h-[76px] rounded-lg border border-[var(--border-hairline)]" style={{ background: `repeating-conic-gradient(#2A2C33 0% 25%, #fff 0% 50%) 0 0/16px 16px` }} />
      </div>
      <div className="card flex gap-6 items-center mb-4 flex-wrap">
        <div className="w-[110px] h-[110px] rounded-full flex items-center justify-center shrink-0" style={{ background: `conic-gradient(#496D21 0 87%, var(--border-hairline) 87% 100%)` }}>
          <div className="w-[88px] h-[88px] rounded-full bg-white flex flex-col items-center justify-center"><b className="font-mono text-2xl text-[var(--ink-800)]">87</b><span className="text-[11px] text-[var(--gray-500)]">/ 100</span></div>
        </div>
        <div className="flex-1 min-w-[260px] space-y-2.5">
          <div className="font-extrabold text-[var(--ink-800)]">Record Health Score</div>
          {[
            ["Document Quality", 90],
            ["OCR Confidence", 94],
            ["Data Completeness", 85],
            ["Cross-record Consistency", 82],
            ["Verification", 100],
          ].map(([l, v]) => (
            <div key={l as string}><div className="flex justify-between text-xs mb-1"><span>{l as string}</span><span>{v}%</span></div><div className="h-1.5 bg-[var(--border-hairline)] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[var(--saffron-600)] to-[#3C415B] rounded-full" style={{ width: `${v}%` }} /></div></div>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          ["OWNERSHIP", [["Owner", currentCase.owner], ["Status", "✓ Verified"]]],
          ["LAND IDENTIFICATION", [["Survey number", currentCase.survey], ["Khata number", currentCase.khata]]],
          ["LOCATION", [["Village", currentCase.village], ["Tehsil", currentCase.tehsil], ["District", currentCase.district]]],
          ["LAND DETAILS", [["Area", currentCase.areaDb + " Hectare"], ["Classification", currentCase.classification]]],
          ["MUTATION", [["Last mutation", currentCase.mutationDate], ["Status", "✓ Verified"]]],
        ].map(([title, fields]) => (
          <div key={title as string} className="card !p-4">
            <h4 className="text-xs font-bold text-[var(--ink-800)] mb-3 tracking-wide">{title as string}</h4>
            {(fields as string[][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-dashed border-[var(--border-hairline)] last:border-0 text-sm">
                <span className="text-[var(--gray-600)]">{k}</span><b className="font-mono text-[var(--ink-800)]">{v}</b>
              </div>
            ))}
          </div>
        ))}
        <div className="card !p-4">
          <h4 className="text-xs font-bold text-[var(--ink-800)] mb-3">ACTIONS</h4>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => window.print()} className="btn btn-primary btn-sm">Export PDF</button>
            <Link href="/audit" className="btn btn-ghost btn-sm">View audit trail</Link>
            <Link href="/gis" className="btn btn-ghost btn-sm">View on GIS</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
