"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Tracker from "@/components/workflow/Tracker";
import { useCaseStore } from "@/store/case-store";

const steps = ["Document uploaded","Image enhancement","Language detection","Layout detection","OCR processing","Handwriting recognition","Information extraction","Validation","Duplicate detection"];
const msgs = ["Preparing document…","Enhancing scan quality…","Detecting document language…","Mapping document layout…","Running OCR across the page…","Reading handwritten entries…","AI is identifying land record entities…","Cross-checking against LRMS records…","Scanning for duplicate records…","Finalizing…"];

export default function Processing() {
  const router = useRouter();
  const { currentCase, uploadedFile } = useCaseStore();
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState(msgs[0]);

  useEffect(() => {
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 9 + 5;
      if (p >= 100) {
        p = 100; clearInterval(t);
        setPct(100); setMsg("AI digitization complete.");
        setTimeout(() => router.push("/extraction"), 700);
      } else {
        setPct(p);
        const idx = Math.min(steps.length - 1, Math.floor((p / 100) * steps.length));
        setMsg(msgs[idx]);
      }
    }, 420);
    return () => clearInterval(t);
  }, [router]);

  const stepIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
  const bgImg = uploadedFile?.isImage && uploadedFile.url ? `url(${uploadedFile.url})` : undefined;

  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">AI processing</h2><p className="text-sm text-[var(--gray-600)]">{currentCase.docLabel}</p></div>
      <Tracker activeIdx={2} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ["DOCUMENT QUALITY CHECK", "Good — scan usable", "92%"],
          ["DOCUMENT TYPE DETECTION", "Gaav Namuna 7/12 Register", "96%"],
          ["LANGUAGE DETECTED", currentCase.lang ?? "Marathi", "97%"],
        ].map(([l, v, c]) => (
          <div key={l} className="card !p-3.5">
            <div className="text-[11px] font-bold text-[var(--gray-500)] mb-1">{l}</div>
            <div className="flex items-center justify-between"><b className="text-[13px] text-[var(--ink-800)]">{v}</b><span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#F0F7EC] text-[#496D21]">{c}</span></div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        <div className="h-[420px] rounded-xl border border-[#DCD2AE] overflow-hidden relative bg-[#EFEAD9]" style={bgImg ? { backgroundImage: bgImg, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 22px,rgba(0,0,0,.05) 22px,rgba(0,0,0,.05) 23px)" }}>
          <div className="absolute left-0 right-0 h-[70px] bg-gradient-to-b from-transparent via-[rgba(248,118,19,0.35)] to-transparent animate-[scan_2.6s_linear_infinite]" />
          <style>{`@keyframes scan{0%{top:-70px}100%{top:100%}}`}</style>
        </div>
        <div className="card">
          <div className="font-mono text-4xl font-bold text-[var(--ink-800)]">{Math.round(pct)}%</div>
          <div className="h-2.5 bg-[var(--border-hairline)] rounded-full overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-[var(--saffron-600)] to-[#3C415B] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} /></div>
          <p className="text-sm text-[var(--gray-600)] mt-3">{msg}</p>
          <ul className="mt-4 divide-y divide-[var(--border-hairline)]">
            {steps.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 py-2.5 text-sm ${i < stepIdx ? "text-[var(--gray-600)]" : i === stepIdx ? "text-[var(--ink-900)] font-bold" : "text-[var(--gray-600)]"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 border ${i < stepIdx ? "bg-[#496D21] text-white border-[#496D21]" : i === stepIdx ? "bg-[var(--saffron-600)] text-white border-[var(--saffron-600)] animate-pulse" : "bg-[var(--surface-raised)] text-[var(--gray-500)] border-[var(--border-hairline)]"}`}>{i < stepIdx ? "✓" : i + 1}</span> {s}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 flex-wrap mt-4">
            {["OCR Engine", "Computer Vision", "NLP Engine", "Validation Engine"].map(t => <span key={t} className="text-[11px] font-mono bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2.5 py-1 rounded-lg text-[var(--gray-600)]">{t}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
