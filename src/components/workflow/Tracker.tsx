"use client";
import { WF_STAGES } from "@/data/workflow";

export default function Tracker({ activeIdx }: { activeIdx: number }) {
  return (
    <div className="bg-gradient-to-br from-[var(--ink-800)] to-[#3C415B] rounded-2xl px-5 py-5 mb-5 overflow-x-auto">
      <div className="flex items-start gap-0 min-w-[760px]">
        {WF_STAGES.map((s, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <div key={s.label} className="flex flex-col items-center gap-2 flex-1 text-center relative">
              {i !== 0 && <div className={`absolute top-[19px] left-[calc(-50%+19px)] w-[calc(100%-38px)] h-0.5 ${done ? "bg-[#496D21]" : "bg-white/20"}`} />}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm z-10 border-2 ${done ? "bg-[#496D21] border-[#496D21] text-white" : current ? "bg-[var(--saffron-600)] border-white text-white shadow-[0_0_0_5px_rgba(248,118,19,0.28)]" : "bg-white/10 border-white/20 text-[#F0DCC2]"}`}>
                {done ? "✓" : s.ic}
              </div>
              <div className={`text-[11px] font-bold max-w-[100px] ${done || current ? "text-white" : "text-[#E9D3B8]"}`}>{s.label}</div>
              <div className="text-[10px] text-[#B99B7C]">{done ? "Complete" : current ? "In progress" : "Pending"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
