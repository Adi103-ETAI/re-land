"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPinned, Printer, ShieldCheck } from "lucide-react";
import Tracker from "@/components/workflow/Tracker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { listRecords, type RecordRow } from "@/lib/db";

export default function RecordPage() {
  const { ready, session, configured } = useRequireAuth();
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listRecords(100);
      const accepted = rows.find((r) => r.verification_status === "accepted") ?? rows[0] ?? null;
      setRecord(accepted);
    } catch (e: any) {
      setError(e?.message || "Could not load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && session?.user) load();
  }, [ready, session, load]);

  if (!configured) {
    return (
      <div>
        <PageHeader title="Verified digital record" description="Generated after officer approval." />
        <SetupNotice what="Verified records" />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!record) {
    return (
      <div>
        <PageHeader title="Verified digital record" description="Generated after officer approval." />
        <EmptyState
          icon={ShieldCheck}
          title="No verified record yet"
          description="Once a record is accepted in the verification queue, its official digital version appears here."
          action={
            <Link href="/records">
              <Button className="rounded-full">Browse records</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const sections: [string, [string, string | null][]][] = [
    ["OWNERSHIP", [["Owner", record.owner_name]]],
    [
      "LAND IDENTIFICATION",
      [
        ["Survey number", record.survey_no],
        ["Khata number", record.khata_no],
      ],
    ],
    [
      "LOCATION",
      [
        ["Village", record.village],
        ["Tehsil", record.tehsil],
        ["District", record.district],
      ],
    ],
    [
      "LAND DETAILS",
      [
        ["Area", record.area_detected != null ? `${record.area_detected} Hectare` : null],
        ["Classification", record.classification],
      ],
    ],
    [
      "VERIFICATION",
      [
        ["Status", record.verification_status.toUpperCase()],
        ["Verified at", record.verified_at ? new Date(record.verified_at).toLocaleString() : null],
        ["Last mutation", record.mutation_date],
      ],
    ],
  ];

  return (
    <div>
      <PageHeader
        title="Verified digital record"
        description="Generated after officer approval — with a full audit trail."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
            <Link href={`/records/${record.id}`}>
              <Button variant="outline" className="rounded-full">Open full details</Button>
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

      <div className="mb-4">
        <Badge className="gap-1.5 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)] hover:bg-[var(--success-soft)]">
          <ShieldCheck className="h-3.5 w-3.5" /> {record.verification_status === "accepted" ? "Verified by an officer" : "Pending officer verification"}
        </Badge>
      </div>

      <div className="grid gap-4">
        {/* Record header */}
        <Card className="border-border/80">
          <CardContent className="flex flex-wrap items-start justify-between gap-5 p-5">
            <div>
              <h2 className="font-mono text-lg font-bold">{record.record_code ?? record.id.slice(0, 8)}</h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {record.verified_at
                  ? `Verified ${new Date(record.verified_at).toLocaleDateString()}`
                  : `Extracted ${new Date(record.created_at).toLocaleDateString()}`}{" "}
                · Survey {record.survey_no ?? "—"} · {record.village ?? "—"}
              </p>
            </div>
            {record.document_id && (
              <div className="rounded-xl bg-muted px-4 py-3 text-right">
                <div className="text-[10px] font-bold tracking-wide text-muted-foreground">SOURCE DOCUMENT</div>
                <div className="font-mono text-xs">{record.document_id.slice(0, 8)}…</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail sections */}
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(([title, rows]) => (
            <Card key={title} className="border-border/80">
              <CardContent className="p-5">
                <h4 className="mb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground">{title}</h4>
                {rows
                  .filter(([, v]) => v != null && v !== "")
                  .map(([k, v]) => (
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
