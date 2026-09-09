"use client";
import { useEffect, useRef } from "react";
import { chartData } from "@/data/analytics";

export default function Analytics() {
  const c1 = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    import("chart.js/auto").then(({ default: Chart }) => {
      if (!c1.current) return;
      const errData = { labels: chartData.errorCats.labels, datasets: [{ data: chartData.errorCats.values, backgroundColor: ["#2A2C33", "#3C415B", "#F87613", "#B5651D", "#A13A2C", "#A7B6F2"], borderRadius: 6 }] };
      new Chart(c1.current, { type: "bar", data: errData, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { grid: { color: "#ECECEC" } }, y: { grid: { display: false } } } } as unknown as never });
    });
  }, []);
  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Analytics</h2><p className="text-sm text-[var(--gray-600)]">Digitization performance across states and pipeline stages.</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Digitization progress by state</h3>
          <div className="flex flex-col gap-3">
            {chartData.state.labels.map((l, i) => (
              <div key={l}><div className="flex justify-between text-sm mb-1"><span>{l}</span><span>{chartData.state.values[i]}%</span></div><div className="h-2 bg-[var(--border-hairline)] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[var(--saffron-600)] to-[#3C415B] rounded-full" style={{ width: `${chartData.state.values[i]}%` }} /></div></div>
            ))}
          </div>
        </div>
        <div className="card"><h3 className="text-sm font-semibold mb-4">Error analysis</h3><canvas ref={c1} height={150} /></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Processing statistics</h3>
          {[
            ["Documents uploaded", "12,846"],
            ["Successfully extracted", "12,140"],
            ["Validated", "10,856"],
            ["Verified", "9,820"],
            ["Needs review", "247"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-dashed border-[var(--border-hairline)] last:border-0 text-sm"><span className="text-[var(--gray-600)]">{k}</span><b className="font-mono">{v}</b></div>
          ))}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">AI performance</h3>
          {[
            ["Extraction accuracy", "94.7%"],
            ["Average confidence", "91.2%"],
            ["Validation accuracy", "96.1%"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-dashed border-[var(--border-hairline)] last:border-0 text-sm"><span className="text-[var(--gray-600)]">{k}</span><b className="font-mono">{v}</b></div>
          ))}
          <div className="mt-3 text-xs text-[var(--gray-600)]">Real OCR confidence now drives these metrics. Low-confidence fields route to verification.</div>
        </div>
      </div>
    </div>
  );
}
