"use client";
import Link from "next/link";
import { MapPinned, Printer, ShieldCheck } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCaseStore } from "@/store/case-store";

export default function RecordPage() {
  const { currentCase } = useCaseStore();

  const sections: [string, [string, string][]][] = [
    ["OWNERSHIP", [["Owner", currentCase.owner], ["Status", "Verified"]]],
    [
      "LAND IDENTIFICATION",
      [
        ["Survey number", currentCase.survey],
        ["Khata number", currentCase.khata],
      ],
    ],
    [
      "LOCATION",
      [
        ["Village", currentCase.village],
        ["Tehsil", currentCase.tehsil],
        ["District", currentCase.district],
      ],
    ],
    [
      "LAND DETAILS",
      [
        ["Area", currentCase.areaDb + " Hectare"],
        ["Classification", currentCase.classification],
      ],
    ],
    [
      "MUTATION",
      [
        ["Last mutation", currentCase.mutationDate],
        ["Status", "Verified"],
      ],
    ],
  ];

  const health = [
    ["Document Quality", 90],
    ["OCR Confidence", 94],
    ["Data Completeness", 85],
    ["Cross-record Consistency", 82],
    ["Verification", 100],
  ] as const;

  return (
    <div>
      <PageHeader
        title="Verified digital land record"
        description="Generated after officer approval."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
            <Link href="/audit">
              <Button variant="outline" className="rounded-full">View audit trail</Button>
            </Link>
            <Link href="/gis">
              <Button className="rounded-full">
                <MapPinned className="h-4 w-4" /> View on GIS
              </Button>
            </Link>
          </>
        }
      />
      <Tracker activeIdx={6} />

      <Badge variant="outline" className="mb-4 gap-1.5 rounded-full border-warning/40 bg-[var(--warning-soft)] px-3 py-1.5 text-xs font-semibold text-warning">
        <ShieldCheck className="h-3.5 w-3.5" /> Illustrative demo data — not an official land record
      </Badge>

      <div className="grid gap-4">
        {/* Record header */}
        <Card className="border-border/80">
          <CardContent className="flex flex-wrap items-start justify-between gap-5 p-5">
            <div>
              <h2 className="font-mono text-lg font-bold">{currentCase.recId}</h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                Approved 3 Sep 2026 · Officer: R. Deshmukh
              </p>
            </div>
            <div
              className="h-[72px] w-[72px] rounded-xl border border-border"
              style={{ background: "repeating-conic-gradient(#2a2c33 0% 25%, #fff 0% 50%) 0 0/16px 16px" }}
              aria-label="Record QR placeholder"
            />
          </CardContent>
        </Card>

        {/* Health score */}
        <Card className="border-border/80">
          <CardContent className="flex flex-wrap items-center gap-6 p-6">
            <div
              className="grid h-[110px] w-[110px] shrink-0 place-items-center rounded-full"
              style={{ background: "conic-gradient(var(--success) 0 87%, var(--muted) 87% 100%)" }}
            >
              <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-card">
                <b className="font-mono text-2xl">87</b>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="min-w-[260px] flex-1 space-y-2.5">
              <div className="font-bold">Record health score</div>
              {health.map(([l, v]) => (
                <div key={l}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-mono font-semibold">{v}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-[#3c415b]"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detail sections */}
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(([title, rows]) => (
            <Card key={title} className="border-border/80">
              <CardContent className="p-5">
                <h4 className="mb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground">{title}</h4>
                {rows.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-3 border-b border-dashed border-border py-2.5 text-sm last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">{k}</span>
                    <b className="font-mono">{v}</b>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
