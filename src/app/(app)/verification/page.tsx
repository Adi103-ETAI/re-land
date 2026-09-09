"use client";
import { useState } from "react";
import Tracker from "@/components/workflow/Tracker";
import { verificationRows } from "@/data/verification";
import type { VerificationRow } from "@/lib/types";

export default function Verification() {
  const [filter, setFilter] = useState("All");
  const [rows, setRows] = useState<VerificationRow[]>(verificationRows);
  const [modal, setModal] = useState<VerificationRow | null>(null);
  const [officerVal, setOfficerVal] = useState("");

  const filtered = filter === "All" ? rows : rows.filter(r => r.category === filter);
  const open = (r: VerificationRow) => { setModal(r); setOfficerVal(r.officer); };
  const approve = () => {
    if (!modal) return;
    setRows(prev => prev.map(r => r.id === modal.id ? { ...r, status: "Approved" as const } : r));
    setModal(null);
  };

  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Human verification</h2><p className="text-sm text-[var(--gray-600)]">247 records require verification — human-in-the-loop review before approval.</p></div>
      <Tracker activeIdx={5} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
        {[
          ["247", "Pending records", ""],
          ["58", "High priority", "hi"],
          ["121", "Medium priority", "md"],
          ["68", "Low priority", "lo"],
        ].map(([n, l, t]) => (
          <div key={l} className="card !p-3.5">
            <b className={`block font-mono text-xl ${t === "hi" ? "text-[#A13A2C]" : t === "md" ? "text-[#B5651D]" : t === "lo" ? "text-[#496D21]" : "text-[var(--ink-800)]"}`}>{n}</b>
            <span className="text-xs text-[var(--gray-600)]">{l}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {["All", "Low confidence", "Data mismatch", "Duplicate", "Handwriting", "Missing field"].map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${filter === c ? "bg-[var(--ink-800)] text-white border-[var(--ink-800)]" : "bg-white text-[var(--gray-600)] border-[var(--border-hairline)]"}`}>{c}</button>
        ))}
      </div>
      <div className="bg-white border border-[var(--border-hairline)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-[var(--surface-raised)] text-xs text-[var(--gray-500)]"><th className="text-left px-4 py-3">Priority</th><th className="text-left px-4 py-3">Survey No.</th><th className="text-left px-4 py-3">Issue</th><th className="text-left px-4 py-3">AI Confidence</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Action</th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-[var(--border-hairline)]">
                <td className="px-4 py-3"><span className={`text-[11px] font-extrabold px-2 py-1 rounded-md uppercase ${r.priority === "High" ? "bg-[#FDF3F0] text-[#A13A2C]" : r.priority === "Medium" ? "bg-[#FFF3EA] text-[#B5651D]" : "bg-[#F0F7EC] text-[#496D21]"}`}>{r.priority}</span></td>
                <td className="px-4 py-3 font-mono">{r.surveyNo}</td>
                <td className="px-4 py-3">{r.issue}</td>
                <td className="px-4 py-3 font-mono">{r.conf}</td>
                <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-md ${r.status === "Approved" ? "bg-[#F0F7EC] text-[#496D21]" : r.status === "Rejected" ? "bg-[#FDF3F0] text-[#A13A2C]" : "bg-[#FFF3EA] text-[#B5651D]"}`}>{r.status}</span></td>
                <td className="px-4 py-3 flex gap-2 flex-wrap">
                  <button onClick={() => open(r)} className="text-[var(--saffron-600)] font-bold text-xs">Review</button>
                  <button onClick={() => setRows(prev => prev.map(x => x.id === r.id ? { ...x, status: "Approved" as const } : x))} className="text-[var(--saffron-600)] font-bold text-xs">Approve</button>
                  <button onClick={() => setRows(prev => prev.map(x => x.id === r.id ? { ...x, status: "Rejected" as const } : x))} className="text-[var(--saffron-600)] font-bold text-xs">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-[rgba(42,44,51,0.45)] flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-7 w-[520px] max-w-full shadow-[0_20px_60px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[var(--ink-800)]">Verify record {modal.id}</h3>
            <p className="text-xs font-mono text-[var(--gray-600)] mb-4">{modal.issue} · AI confidence {modal.conf}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border border-[var(--border-hairline)] rounded-xl p-3"><div className="text-[11px] font-bold text-[var(--gray-500)]">AI VALUE</div><b className="block font-mono mt-1">{modal.ai}</b></div>
              <div className="border border-[var(--border-hairline)] rounded-xl p-3"><div className="text-[11px] font-bold text-[var(--gray-500)]">OFFICER VALUE</div><input value={officerVal} onChange={e => setOfficerVal(e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-[var(--border-hairline)] rounded-lg font-mono text-sm" /></div>
            </div>
            <div className="bg-[var(--surface-raised)] rounded-xl p-3 text-sm text-[var(--gray-600)] italic mb-4">&quot;{modal.reason}&quot;</div>
            <div className="flex gap-2.5"><button onClick={() => setModal(null)} className="btn btn-ghost btn-sm flex-1">Reject</button><button onClick={() => setModal(null)} className="btn btn-ghost btn-sm flex-1">Correct</button><button onClick={approve} className="btn btn-teal btn-sm flex-1">Approve</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
