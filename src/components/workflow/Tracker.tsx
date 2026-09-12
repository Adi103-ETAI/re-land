"use client";
import { Check } from "lucide-react";
import { WF_STAGES } from "@/data/workflow";

export default function Tracker({ activeIdx }: { activeIdx: number }) {
  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex min-w-[760px] items-start">
        {WF_STAGES.map((s, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative flex flex-1 flex-col items-center gap-2 text-center">
              {i !== 0 && (
                <div
                  className={`absolute left-[calc(-50%+22px)] top-[22px] h-0.5 w-[calc(100%-44px)] ${
                    done ? "bg-[var(--success)]" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`z-10 grid h-11 w-11 place-items-center rounded-2xl border-2 transition-all ${
                  done
                    ? "border-[var(--success)] bg-[var(--success)] text-white"
                    : current
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_rgba(234,106,10,0.18)]"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
              </div>
              <div className={`max-w-[100px] text-[11px] font-semibold leading-tight ${done || current ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">
                {done ? "Complete" : current ? "In progress" : "Pending"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
