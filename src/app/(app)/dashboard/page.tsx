"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { chartData } from "@/data/analytics";

export default function Dashboard() {
  const c1 = useRef<HTMLCanvasElement>(null);
  const c2 = useRef<HTMLCanvasElement>(null);
  const c3 = useRef<HTMLCanvasElement>(null);
  const c4 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("chart.js/auto").then(({ default: Chart }) => {
      if (cancelled) return;
      (Chart.defaults.font as unknown as { family: string }).family = "Inter,sans-serif";
      (Chart.defaults as unknown as { color: string }).color = "#717171";
      const teal = "#F87613";
      const navy = "#2A2C33";
      const blue = "#3C415B";
      const warn = "#B5651D", err = "#A13A2C", line = "#ECECEC";
      if (c1.current) new Chart(c1.current, { type: "line", data: { labels: chartData.processed.labels, datasets: [{ label: "Documents processed", data: chartData.processed.values, borderColor: teal, backgroundColor: "rgba(248,118,19,0.12)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: line } }, x: { grid: { display: false } } } } });
      if (c2.current) new Chart(c2.current, { type: "doughnut", data: { labels: chartData.validation.labels, datasets: [{ data: chartData.validation.values, backgroundColor: [teal, warn, err], borderWidth: 0 }] }, options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } } }, cutout: "68%" } });
      if (c3.current) new Chart(c3.current, { type: "bar", data: { labels: chartData.state.labels, datasets: [{ data: chartData.state.values, backgroundColor: blue, borderRadius: 6, maxBarThickness: 34 } as unknown as never] }, options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: line }, max: 100 }, x: { grid: { display: false } } } } });
      const errData = { labels: chartData.errorCats.labels, datasets: [{ data: chartData.errorCats.values, backgroundColor: [navy, blue, teal, warn, err, "#A7B6F2"], borderRadius: 6 }] };
      if (c4.current) new Chart(c4.current, { type: "bar", data: errData, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { grid: { color: line } }, y: { grid: { display: false } } } } as unknown as never });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
        <div><h2 className="font-[var(--font-serif)] text-2xl font-semibold text-[var(--ink-900)]">Digitization overview</h2><p className="text-sm text-[var(--gray-600)]">Pune district · Maharashtra land records division</p></div>
        <Link href="/upload" className="btn btn-teal btn-sm">+ Upload record</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 mb-6">
        {[
          ["Total records", "14,320", "↑ 3.1% this month"],
          ["Records processed", "12,846", "↑ 4.2% this month"],
          ["Records verified", "9,820", "↑ 62 today"],
          ["Pending verification", "247", ""],
          ["Issues detected", "473", ""],
          ["Average AI confidence", "91.2%", ""],
        ].map(([l, v, d]) => (
          <div key={l} className="card !p-4">
            <div className="text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wide">{l}</div>
            <div className="font-mono text-xl font-bold text-[var(--ink-800)] mt-1">{v}</div>
            {d && <div className="text-[11px] text-[#496D21] font-semibold">{d}</div>}
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--ink-800)] mb-4">AI processing funnel</h3>
          <div className="flex flex-col gap-0">
            {chartData.funnel.map(f => (
              <div key={f.label} className="flex items-center gap-3.5 py-2.5 border-b border-dashed border-[var(--border-hairline)] last:border-0">
                <div className="w-[150px] shrink-0 text-sm font-semibold text-[var(--ink-900)]">{f.label}</div>
                <div className="h-[30px] rounded-lg bg-gradient-to-r from-[var(--saffron-600)] to-[#3C415B] flex items-center px-3 text-white font-mono text-xs font-bold" style={{ width: `${Math.round(f.value / 14320 * 100)}%` }}>{f.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--ink-800)] mb-4">Recent activity</h3>
          <div className="flex flex-col">
            {[
              ["AI extraction completed for LR-MH-2026-000257", "2 min ago"],
              ["Officer R. Deshmukh approved LR-MH-2026-000184", "14 min ago"],
              ["Area mismatch flagged on LR-1024", "22 min ago"],
              ["Duplicate check cleared for LR-MH-2026-000233", "41 min ago"],
              ["126 documents uploaded from Khed tehsil", "1 hr ago"],
            ].map(([m, t]) => (
              <div key={m} className="flex justify-between items-center py-2.5 border-b border-[var(--border-hairline)] last:border-0 text-sm">
                <span className="text-[var(--ink-900)]">{m}</span><span className="text-xs font-mono text-[var(--gray-600)]">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card"><h3 className="text-sm font-semibold text-[var(--ink-800)] mb-4">Documents processed over time</h3><canvas ref={c1} height={150} /></div>
        <div className="card"><h3 className="text-sm font-semibold text-[var(--ink-800)] mb-4">Validation status</h3><canvas ref={c2} height={150} /></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card"><h3 className="text-sm font-semibold text-[var(--ink-800)] mb-4">State-wise digitization progress</h3><canvas ref={c3} height={140} /></div>
        <div className="card"><h3 className="text-sm font-semibold text-[var(--ink-800)] mb-4">Error categories</h3><canvas ref={c4} height={140} /></div>
      </div>
    </div>
  );
}
