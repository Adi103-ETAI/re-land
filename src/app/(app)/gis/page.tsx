"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Plus, RotateCcw, Search } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SetupNotice } from "@/components/system/states";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { createParcel, listParcels, type ParcelRow } from "@/lib/db";
import { getSession } from "@/lib/supabase";


const STATUS_DOT: Record<string, string> = {
  Verified: "bg-[var(--success)]",
  Pending: "bg-[var(--warning)]",
  Conflict: "bg-destructive",
};

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function GisPage() {
  const { configured } = useRequireAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInit = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersLayer = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);

  const [parcels, setParcels] = useState<ParcelRow[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(true);
  const [selected, setSelected] = useState<ParcelRow | null>(null);
  const [qSurvey, setQSurvey] = useState("");
  const [qOwner, setQOwner] = useState("");

  // Nominatim place search (real OpenStreetMap geocoding)
  const [placeQuery, setPlaceQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Click-to-add parcel
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ survey: "", owner: "", village: "", area: "", status: "Pending" });
  const [savingPin, setSavingPin] = useState(false);
  const { toast } = useToast();

  const filtered = parcels.filter(
    (p) =>
      (!qSurvey || (p.survey_no ?? "").toLowerCase().includes(qSurvey.toLowerCase())) &&
      (!qOwner || (p.owner_name ?? "").toLowerCase().includes(qOwner.toLowerCase()))
  );

  const renderMarkers = useCallback(() => {
    const L = leafletRef.current;
    const map = mapObj.current;
    if (!L || !map) return;
    if (markersLayer.current) markersLayer.current.remove();
    markersLayer.current = L.layerGroup().addTo(map);
    filtered.forEach((p) => {
      const color = p.status === "Verified" ? "#16a34a" : p.status === "Conflict" ? "#dc2626" : "#ea6a0a";
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(markersLayer.current);
      m.bindPopup(
        `<b>Survey: ${p.survey_no ?? "—"}</b><br>Owner: ${p.owner_name ?? "—"}<br>Area: ${p.area_hectares ?? "—"} Ha<br>Status: ${p.status}`
      );
      m.on("click", () => setSelected(p));
    });
  }, [filtered]);

  const loadParcels = useCallback(async () => {
    setLoadingParcels(true);
    try {
      const rows = await listParcels();
      setParcels(rows);
    } catch (e: any) {
      toast({ description: e?.message || "Could not load parcels" });
    } finally {
      setLoadingParcels(false);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!configured || mapInit.current || !mapRef.current) return;
    mapInit.current = true;
    import("leaflet").then((L) => {
      leafletRef.current = L;
      const map = L.map(mapRef.current!).setView([18.578, 73.978], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: any) => {
        setPendingPin({ lat: e.latlng.lat, lng: e.latlng.lng });
        setForm({ survey: "", owner: "", village: "", area: "", status: "Pending" });
      });
      mapObj.current = map;
      setTimeout(() => map.invalidateSize(), 150);
    });
    if (!document.querySelector('link[data-leaflet]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.dataset.leaflet = "true";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
  }, [configured]);

  // Load parcels from Supabase
  useEffect(() => {
    if (configured) loadParcels();
  }, [configured, loadParcels]);

  // Re-render markers when parcels or filters change
  useEffect(() => {
    if (mapObj.current) renderMarkers();
  }, [parcels, qSurvey, qOwner, renderMarkers]);

  const searchPlace = async () => {
    if (!placeQuery.trim()) return;
    setSearching(true);
    setGeoResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(placeQuery)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      setGeoResults(Array.isArray(data) ? data : []);
    } catch {
      toast({ description: "Place search failed — check your connection" });
    } finally {
      setSearching(false);
    }
  };

  const flyTo = (lat: number, lng: number, label: string) => {
    const map = mapObj.current;
    if (map) map.flyTo([lat, lng], 16, { duration: 1.2 });
    setGeoResults([]);
    setPlaceQuery(label);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast({ description: "Geolocation is not available in this browser" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude, "Your location"),
      () => toast({ description: "Could not get your location — permission denied?" })
    );
  };

  const savePendingParcel = async () => {
    if (!pendingPin) return;
    setSavingPin(true);
    try {
      const session = await getSession();
      const created = await createParcel({
        lat: pendingPin.lat,
        lng: pendingPin.lng,
        survey_no: form.survey || null,
        owner_name: form.owner || null,
        village: form.village || null,
        area_hectares: form.area ? parseFloat(form.area) : null,
        status: form.status as ParcelRow["status"],
        created_by: session.user?.id ?? null,
      });
      setParcels((prev) => [created, ...prev]);
      setSelected(created);
      setPendingPin(null);
      toast({ description: "Parcel saved to Supabase" });
    } catch (e: any) {
      toast({ description: e?.message || "Could not save the parcel" });
    } finally {
      setSavingPin(false);
    }
  };

  if (!configured) {
    return (
      <div>
        <PageHeader title="GIS / land map" description="Parcel positions on the cadastral map." />
        <SetupNotice what="Parcel data" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="GIS / land map"
        description="Live OpenStreetMap — parcels are loaded from and saved to Supabase. Click anywhere on the map to register a parcel pin."
      />
      <Tracker activeIdx={6} />

      {/* Place search (Nominatim) */}
      <div className="mb-3 grid gap-2.5 md:grid-cols-[1fr_auto]">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPlace()}
              placeholder="Search any place on the map (e.g. Wagholi, Pune)…"
              className="rounded-xl pl-10"
            />
          </div>
          <Button className="shrink-0 rounded-full" onClick={searchPlace} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
          <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={locateMe} title="Use my location">
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" /> Verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]" /> Pending
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Conflict
          </span>
        </div>
      </div>

      {geoResults.length > 0 && (
        <Card className="mb-3 border-border/80">
          <CardContent className="divide-y divide-border p-0">
            {geoResults.map((g, i) => (
              <button
                key={i}
                onClick={() => flyTo(parseFloat(g.lat), parseFloat(g.lon), g.display_name)}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mr-2 inline h-3.5 w-3.5 text-primary" />
                {g.display_name}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-3">
          <div
            ref={mapRef}
            className="h-[520px] rounded-2xl border border-border/80 bg-muted shadow-sm"
            role="application"
            aria-label="Cadastral map"
          />
          <p className="text-xs text-muted-foreground">
            Map data © OpenStreetMap contributors · place search by Nominatim
          </p>
        </div>

        <div className="space-y-4">
          {/* Pending pin form */}
          {pendingPin && (
            <Card className="border-primary/40 shadow-md shadow-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4 text-primary" /> New parcel pin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="rounded-xl bg-muted/70 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {pendingPin.lat.toFixed(6)}, {pendingPin.lng.toFixed(6)}
                </p>
                <Input placeholder="Survey number" value={form.survey} onChange={(e) => setForm({ ...form, survey: e.target.value })} className="rounded-xl" />
                <Input placeholder="Owner name" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="rounded-xl" />
                <Input placeholder="Village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className="rounded-xl" />
                <Input placeholder="Area (Hectares)" type="number" step="0.01" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-xl" />
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-9 w-full cursor-pointer rounded-xl border border-border bg-card px-3 text-sm outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Verified">Verified</option>
                  <option value="Conflict">Conflict</option>
                </select>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button className="rounded-full" onClick={savePendingParcel} disabled={savingPin}>
                    {savingPin ? "Saving…" : "Save to Supabase"}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setPendingPin(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected parcel */}
          <Card className="h-fit border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> {selected ? "Selected parcel" : "Parcels"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-3">
                  {[
                    ["Survey no.", selected.survey_no],
                    ["Owner", selected.owner_name],
                    ["Village", selected.village],
                    ["Area", selected.area_hectares != null ? `${selected.area_hectares} Ha` : null],
                    ["Coordinates", `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-3 border-b border-dashed border-border py-2 text-sm last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <b className="text-right font-mono">{v || "—"}</b>
                    </div>
                  ))}
                  <Badge
                    className={`rounded-md text-[10px] font-bold ${
                      selected.status === "Verified"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : selected.status === "Conflict"
                          ? "bg-[var(--destructive-soft)] text-destructive"
                          : "bg-[var(--warning-soft)] text-warning"
                    }`}
                  >
                    {selected.status}
                  </Badge>
                  {selected.record_id && (
                    <a href={`/records/${selected.record_id}`} className="block text-sm font-medium text-primary hover:underline">
                      Open linked record →
                    </a>
                  )}
                </div>
              ) : loadingParcels ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 rounded-xl" />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {parcels.length === 0
                    ? "No parcels saved yet. Search for a place, then click the map to add the first parcel pin."
                    : "Click a marker on the map to see its details."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Parcel list with filter */}
          <Card className="h-fit border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Saved parcels <span className="font-mono text-muted-foreground">({filtered.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input value={qSurvey} onChange={(e) => setQSurvey(e.target.value)} placeholder="Survey…" className="rounded-xl" />
                <Input value={qOwner} onChange={(e) => setQOwner(e.target.value)} placeholder="Owner…" className="rounded-xl" />
                {(qSurvey || qOwner) && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={() => {
                      setQSurvey("");
                      setQOwner("");
                    }}
                    title="Clear filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="max-h-[200px] space-y-1.5 overflow-y-auto pt-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelected(p);
                      flyTo(p.lat, p.lng, p.survey_no ?? "Parcel");
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selected?.id === p.id ? "border-primary bg-accent" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <span className="truncate font-medium">{p.survey_no ?? p.id.slice(0, 8)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{p.owner_name ?? "—"}</span>
                  </button>
                ))}
                {filtered.length === 0 && parcels.length > 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">No parcels match the filter.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
