"use client";
import Link from "next/link";
import { useState } from "react";
import Tracker from "@/components/workflow/Tracker";
import { useCaseStore } from "@/store/case-store";

const answers: Record<string, string> = {
  flag: "This record was flagged because the land area mentioned in the scanned document differs from the cadastral database record. This requires officer verification.",
  lowconf: "The <b>Mutation Date</b> field has the lowest AI confidence at 64%, followed by <b>Classification</b> at 87%. Both are below the 90% auto-approval threshold.",
  missing: "No fields are fully missing, but <b>Khata Number</b> was partially legible on similar historical documents.",
  why: "This record needs verification because one AI-extracted value conflicts with an existing database record and one field fell below the confidence threshold.",
};

export default function Validation() {
  const { currentCase, setCase } = useCaseStore();
  const [answer, setAnswer] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [areaResolved, setAreaResolved] = useState(false);
  const [dupResolved, setDupResolved] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [editArea, setEditArea] = useState(false);
  const [areaInput, setAreaInput] = useState(String(currentCase.areaDb));
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const mismatch = +(currentCase.area - currentCase.areaDb).toFixed(2);
  const hasMismatch = !areaResolved && Math.abs(mismatch) > 0.001;
  const score = Math.max(70, Math.round(100 - (hasMismatch ? 6 : 0) - (!dupResolved && currentCase.dupMatch ? 4 : 0) - 2));

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
        <div><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Validation center</h2><p className="text-sm text-[var(--gray-600)]">Cross-checking extracted values against LRMS and cadastral databases.</p></div>
        <Link href="/verification" className="btn btn-primary btn-sm">Send to verification →</Link>
      </div>
      <Tracker activeIdx={4} />
      <div className="flex items-center gap-6 bg-gradient-to-br from-[var(--ink-800)] to-[#3C415B] rounded-2xl p-6 text-white mb-5">
        <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center shrink-0" style={{ background: `conic-gradient(var(--saffron-600) 0 ${score}%, rgba(255,255,255,.15) ${score}% 100%)` }}>
          <div className="w-[70px] h-[70px] rounded-full bg-[var(--ink-800)] flex items-center justify-center font-mono font-bold text-xl">{score}</div>
        </div>
        <div><h3 className="font-semibold">Validation score: {score} / 100</h3><p className="text-[#DCE5FE] text-sm">{hasMismatch ? "1 mismatch" : "all fields matched"} · {currentCase.dupMatch ? "1 possible duplicate" : "no duplicates found"}</p></div>
      </div>

      {[
        { title: "Ownership verification", badge: "✓ Match found", color: "bg-[#F0F7EC] text-[#496D21]", left: currentCase.owner, right: currentCase.owner },
        { title: "Survey number", badge: "✓ Valid", color: "bg-[#F0F7EC] text-[#496D21]", left: currentCase.survey, right: currentCase.survey },
        { title: "Location", badge: "✓ Verified", color: "bg-[#F0F7EC] text-[#496D21]", left: currentCase.village, right: `${currentCase.tehsil} / ${currentCase.district}` },
      ].map(c => (
        <div key={c.title} className="card !p-4 mb-3">
          <div className="flex justify-between items-center mb-2"><b className="text-sm text-[var(--ink-800)]">{c.title}</b><span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${c.color}`}>{c.badge}</span></div>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-xs text-[var(--gray-500)]">AI record</span><b className="block font-mono text-[var(--ink-800)]">{c.left}</b></div><div><span className="text-xs text-[var(--gray-500)]">Database</span><b className="block font-mono text-[var(--ink-800)]">{c.right}</b></div></div>
        </div>
      ))}

      <h3 className="font-semibold text-[var(--ink-800)] mt-6 mb-1">⚠ AI Detected Issues</h3>
      <p className="text-sm text-[var(--gray-600)] mb-3">Every issue below was surfaced automatically by the validation engine.</p>

      <div className={`card mb-3 border-l-4 ${hasMismatch ? "border-l-[#B5651D]" : "border-l-[#496D21]"}`}>
        <div className="flex justify-between items-center mb-2"><b className="text-sm">Area mismatch detected</b><span className={`text-[11px] font-extrabold px-2 py-1 rounded-md uppercase ${hasMismatch ? "bg-[#FFF3EA] text-[#B5651D]" : "bg-[#F0F7EC] text-[#496D21]"}`}>{hasMismatch ? "MEDIUM" : "RESOLVED"}</span></div>
        <div className="grid grid-cols-3 gap-3 text-sm mb-2"><div><span className="text-xs text-[var(--gray-500)]">Detected value</span><b className="block font-mono">{currentCase.area} Hectare</b></div><div><span className="text-xs text-[var(--gray-500)]">Expected value</span><b className="block font-mono">{currentCase.areaDb} Hectare</b></div><div><span className="text-xs text-[var(--gray-500)]">AI confidence</span><b className="block">91%</b></div></div>
        <div className="text-xs text-[var(--gray-600)]">{hasMismatch ? `Difference: ${Math.abs(mismatch).toFixed(2)} Hectare — flagged for officer review.` : "Resolved — officer accepted 2.40 Hectare."}</div>
        {editArea ? (
          <div className="flex gap-2 mt-3 items-center"><input value={areaInput} onChange={e=>setAreaInput(e.target.value)} className="px-3 py-2 border border-[var(--border-hairline)] rounded-lg text-sm w-32" placeholder="e.g. 2.40" /><button onClick={()=>{const v=parseFloat(areaInput); if(!isNaN(v)){setCase({...currentCase, area:v, areaDb:v}); setAreaResolved(true); setEditArea(false); show(`Area updated to ${v} Hectare — logged to audit`);}}} className="btn btn-teal btn-sm">Save</button><button onClick={()=>setEditArea(false)} className="btn btn-ghost btn-sm">Cancel</button></div>
        ) : (
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={()=>{setCase({...currentCase, area: currentCase.areaDb}); setAreaResolved(true); show("Accepted AI suggestion: area set to "+currentCase.areaDb+" Hectare — audit logged");}} className="btn btn-teal btn-sm">Accept AI Suggestion</button>
            <button onClick={()=>setEditArea(true)} className="btn btn-ghost btn-sm">Edit Manually</button>
            <Link href="/verification" className="btn btn-ghost btn-sm">Send for Verification</Link>
          </div>
        )}
      </div>

      <div className={`card mb-3 border-l-4 ${!dupResolved && currentCase.dupMatch ? "border-l-[#A13A2C]" : "border-l-[#496D21]"}`}>
        <div className="flex justify-between items-center mb-2"><b className="text-sm">Survey number conflict</b><span className={`text-[11px] font-extrabold px-2 py-1 rounded-md uppercase ${!dupResolved && currentCase.dupMatch ? "bg-[#FDF3F0] text-[#A13A2C]" : "bg-[#F0F7EC] text-[#496D21]"}`}>{!dupResolved && currentCase.dupMatch ? "HIGH" : "RESOLVED"}</span></div>
        <div className="grid grid-cols-3 gap-3 text-sm mb-2"><div><span className="text-xs text-[var(--gray-500)]">Detected value</span><b className="block font-mono">{currentCase.survey}</b></div><div><span className="text-xs text-[var(--gray-500)]">Conflicting record</span><b className="block font-mono">{currentCase.dupMatch ?? "No match found"}</b></div><div><span className="text-xs text-[var(--gray-500)]">AI confidence</span><b className="block">{currentCase.dupSim}%</b></div></div>
        {!dupResolved && currentCase.dupMatch && <div className="text-xs text-[var(--gray-600)] mb-2">Record shares owner, village and survey number with an existing entry — possible duplicate.</div>}
        <div className="flex gap-2 mt-3">
          <button onClick={()=>setShowCompare(true)} className="btn btn-ghost btn-sm">Compare records</button>
          <button onClick={()=>{setDupResolved(true); show("Marked as not a duplicate — retained as new record "+currentCase.recId);}} className="btn btn-teal btn-sm">Not a duplicate</button>
          {!dupResolved && currentCase.dupMatch && <button onClick={()=>{setDupResolved(true); show("Marked as duplicate — linked to "+(currentCase.dupMatch||"")+" and sent to verification");}} className="btn btn-ghost btn-sm">Mark as duplicate</button>}
        </div>
      </div>

      {showCompare && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowCompare(false)}>
          <div className="bg-white rounded-2xl p-6 w-[720px] max-w-full max-h-[80vh] overflow-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="font-semibold mb-1">Compare records</h3>
            <p className="text-sm text-[var(--gray-600)] mb-4">Current vs conflicting record — side-by-side.</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="border border-[var(--border-hairline)] rounded-xl p-4"><div className="text-xs font-bold text-[var(--gray-500)] mb-2">CURRENT: {currentCase.recId}</div><div className="space-y-1"><div className="flex justify-between"><span className="text-[var(--gray-600)]">Owner</span><b className="font-mono">{currentCase.owner}</b></div><div className="flex justify-between"><span className="text-[var(--gray-600)]">Survey</span><b className="font-mono">{currentCase.survey}</b></div><div className="flex justify-between"><span className="text-[var(--gray-600)]">Village</span><b className="font-mono">{currentCase.village}</b></div><div className="flex justify-between"><span className="text-[var(--gray-600)]">Area</span><b className="font-mono">{currentCase.area} Ha</b></div></div></div>
              <div className="border border-[var(--border-hairline)] rounded-xl p-4 bg-[var(--surface-raised)]"><div className="text-xs font-bold text-[var(--gray-500)] mb-2">CONFLICT: {currentCase.dupMatch}</div><div className="space-y-1"><div className="flex justify-between"><span className="text-[var(--gray-600)]">Owner</span><b className="font-mono">{currentCase.owner}</b></div><div className="flex justify-between"><span className="text-[var(--gray-600)]">Survey</span><b className="font-mono">{currentCase.survey}</b></div><div className="flex justify-between"><span className="text-[var(--gray-600)]">Village</span><b className="font-mono">{currentCase.village}</b></div><div className="flex justify-between"><span className="text-[var(--gray-600)]">Area</span><b className="font-mono">2.40 Ha</b></div><div className="text-xs text-[var(--error)] mt-2">Same owner+village+survey — flagged {currentCase.dupSim}% similarity</div></div></div>
            </div>
            <div className="flex gap-2 mt-4"><button onClick={()=>setShowCompare(false)} className="btn btn-ghost btn-sm flex-1">Close</button><button onClick={()=>{setShowCompare(false); setDupResolved(true); show("Resolved: not a duplicate");}} className="btn btn-teal btn-sm flex-1">Not a duplicate</button></div>
          </div>
        </div>
      )}

      <div className="card mt-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">💬 Ask LandLens AI</h3>
        <p className="text-xs text-[var(--gray-600)] mb-3">Get a plain-language explanation of any flag on this record.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            ["flag", "Why is this record flagged?"],
            ["lowconf", "Which field has low confidence?"],
            ["missing", "What information is missing?"],
            ["why", "Why does this record need verification?"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setAnswer(answers[k])} className="bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-3 py-1.5 rounded-full text-xs font-semibold hover:border-[var(--saffron-600)]">{l}</button>
          ))}
        </div>
        {answer && <div className="bg-[var(--surface-raised)] border-l-[3px] border-[var(--saffron-600)] rounded-lg px-3.5 py-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: `🧠 <b>LandLens AI:</b> ${answer}` }} />}
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--ink-800)] text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">{toast}</div>}
    </div>
  );
}
