"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, RotateCcw } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { parcels } from "@/data/parcels";
import { useCaseStore } from "@/store/case-store";
import type { Parcel } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  Verified: "bg-[var(--success)]",
  Pending: "bg-[var(--warning)]",
  Conflict: "bg-destructive",
};

export default function GisPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInit = useRef(false);
  const { currentCase } = useCaseStore();
  const [selected, setSelected] = useState<Parcel>(parcels[0]);
  const [qSurvey, setQSurvey] = useState("");
  const [qOwner, setQOwner] = useState("");
  const [qVillage, setQVillage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (mapInit.current || !mapRef.current) return;
    mapInit.current = true;
    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!).setView([18.578, 73.978], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      parcels.forEach((p) => {
        const m = L.marker([p.lat, p.lng]).addTo(map);
        m.bindPopup(`<b>Survey: ${p.survey}</b><br>Owner: ${p.owner}<br>Area: ${p.area}`);
        m.on("click", () => setSelected(p));
      });
      setTimeout(() => map.invalidateSize(), 100);
    });
    if (!document.querySelector('link[href*="leaflet"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
  }, []);

  const filtered = parcels.filter(
    (p) =>
      (!qSurvey || p.survey.toLowerCase().includes(qSurvey.toLowerCase())) &&
      (!qOwner || p.owner.toLowerCase().includes(qOwner.toLowerCase())) &&
      (!qVillage || currentCase.village.toLowerCase().includes(qVillage.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="GIS / land map"
        description="Illustrative parcel data — search filters markers instantly."
      />
      <Tracker activeIdx={6} />

      <div className="mb-3 grid gap-2.5 md:grid-cols-3">
        <Input
          value={qSurvey}
          onChange={(e) => setQSurvey(e.target.value)}
          placeholder="Search by survey number…"
          className="rounded-xl"
        />
        <Input
          value={qOwner}
          onChange={(e) => setQOwner(e.target.value)}
          placeholder="Search by owner name…"
          className="rounded-xl"
        />
        <div className="flex gap-2">
          <Input
            value={qVillage}
            onChange={(e) => setQVillage(e.target.value)}
            placeholder="Search by village…"
            className="rounded-xl"
          />
          {(qSurvey || qOwner || qVillage) && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => {
                setQSurvey("");
                setQOwner("");
                setQVillage("");
                toast({ description: "Filters cleared" });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {filtered.length !== parcels.length && (
        <p className="mb-2 text-xs text-muted-foreground">
          {filtered.length} parcel(s) match — click a marker or result chip below.
        </p>
      )}
      {filtered.length > 0 && filtered.length < 4 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {filtered.map((p) => (
            <button
              key={p.survey}
              onClick={() => {
                setSelected(p);
                toast({ description: `Selected ${p.survey} — ${p.owner}` });
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                selected.survey === p.survey
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {p.survey} · {p.owner}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {Object.entries(STATUS_DOT).map(([label, dot]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {label}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div
          ref={mapRef}
          className="h-[520px] rounded-2xl border border-border/80 bg-muted shadow-sm"
          role="application"
          aria-label="Cadastral map"
        />
        <Card className="h-fit border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" /> Selected parcel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {[
              ["Survey no.", selected.survey],
              ["Owner", selected.owner],
              ["Current case", `${currentCase.survey} · ${currentCase.owner}`],
              ["Area", selected.area],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 border-b border-dashed border-border py-2.5 text-sm last:border-0"
              >
                <span className="text-muted-foreground">{k}</span>
                <b className="text-right font-mono">{v}</b>
              </div>
            ))}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Historical (1962 register): 2.45 Ha. Current (GIS cadastral): 2.40 Ha.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full rounded-full"
              onClick={() => toast({ description: `Opening ${selected.survey} in full GIS — coming soon` })}
            >
              Open in full GIS
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
