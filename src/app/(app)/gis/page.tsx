"use client";
import { useEffect, useRef, useState } from "react";
import Tracker from "@/components/workflow/Tracker";
import { parcels } from "@/data/parcels";
import { useCaseStore } from "@/store/case-store";
import type { Parcel } from "@/lib/types";

export default function GisPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInit = useRef(false);
  const { currentCase } = useCaseStore();
  const [selected, setSelected] = useState<Parcel>(parcels[0]);
  const [qSurvey, setQSurvey] = useState("");
  const [qOwner, setQOwner] = useState("");
  const [qVillage, setQVillage] = useState("");

  useEffect(() => {
    if (mapInit.current || !mapRef.current) return;
    mapInit.current = true;
    import("leaflet").then(L => {
      const map = L.map(mapRef.current!).setView([18.578, 73.978], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      parcels.forEach(p => {
        const m = L.marker([p.lat, p.lng]).addTo(map);
        m.bindPopup(`<b>Survey: ${p.survey}</b><br>Owner: ${p.owner}<br>Area: ${p.area}`);
        m.on("click", () => setSelected(p));
      });
      setTimeout(() => map.invalidateSize(), 100);
    });
    // inject leaflet css
    if (!document.querySelector('link[href*="leaflet"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
  }, []);

  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">GIS / land map</h2><p className="text-sm text-[var(--gray-600)]">Illustrative parcel data for the prototype.</p></div>
      <Tracker activeIdx={6} />
      <div className="grid md:grid-cols-3 gap-2 mb-3">
        <input value={qSurvey} onChange={e => setQSurvey(e.target.value)} placeholder="Search by survey number…" className="px-3 py-2.5 border border-[var(--border-hairline)] rounded-xl text-sm bg-white" />
        <input value={qOwner} onChange={e => setQOwner(e.target.value)} placeholder="Search by owner name…" className="px-3 py-2.5 border border-[var(--border-hairline)] rounded-xl text-sm bg-white" />
        <input value={qVillage} onChange={e => setQVillage(e.target.value)} placeholder="Search by village…" className="px-3 py-2.5 border border-[var(--border-hairline)] rounded-xl text-sm bg-white" />
      </div>
      <div className="flex gap-4 mb-3 text-xs text-[var(--gray-600)] flex-wrap">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#496D21]" />Verified</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#B5651D]" />Pending</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#A13A2C]" />Conflict</span>
      </div>
      <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-4">
        <div ref={mapRef} className="h-[520px] rounded-2xl border border-[var(--border-hairline)] bg-[#F5F5F5]" />
        <div className="card">
          <h3 className="font-semibold text-[var(--ink-800)] mt-0">Selected parcel</h3>
          <div className="flex justify-between py-2 border-b border-dashed border-[var(--border-hairline)] text-sm"><span className="text-[var(--gray-600)]">Survey no.</span><b className="font-mono">{selected.survey}</b></div>
          <div className="flex justify-between py-2 border-b border-dashed border-[var(--border-hairline)] text-sm"><span className="text-[var(--gray-600)]">Owner</span><b className="font-mono">{selected.owner}</b></div>
          <div className="flex justify-between py-2 border-b border-dashed border-[var(--border-hairline)] text-sm"><span className="text-[var(--gray-600)]">Current case</span><b className="font-mono">{currentCase.survey} · {currentCase.owner}</b></div>
          <div className="flex justify-between py-2 text-sm"><span className="text-[var(--gray-600)]">Area</span><b className="font-mono">{selected.area}</b></div>
          <div className="text-xs text-[var(--gray-600)] mt-3">Historical (1962 register): 2.45 Ha. Current (GIS cadastral): 2.40 Ha.</div>
        </div>
      </div>
    </div>
  );
}
