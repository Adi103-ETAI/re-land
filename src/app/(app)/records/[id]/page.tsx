"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FileText,
  MapPinned,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SetupNotice } from "@/components/system/states";
import { useToast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getSession, isSupabaseConfigured } from "@/lib/supabase";
import {
  getRecord,
  listVerifications,
  resolveVerification,
  type RecordRow,
  type VerificationRow,
} from "@/lib/db";

const FIELD_LABELS: Record<string, string> = {
  surveyNo: "Survey number",
  survey: "Survey number",
  khataNo: "Khata number",
  khata: "Khata number",
  ownerName: "Owner name",
  owner: "Owner name",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  area: "Area",
  classification: "Classification",
  mutationDate: "Mutation date",
  khasra: "Khasra number",
};

const verBadge: Record<string, string> = {
  pending: "bg-[var(--warning-soft)] text-warning",
  accepted: "bg-[var(--success-soft)] text-[var(--success)]",
  rejected: "bg-[var(--destructive-soft)] text-destructive",
  corrected: "bg-accent text-accent-foreground",
  escalated: "bg-muted text-muted-foreground",
};

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { ready, session, configured } = useRequireAuth();
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError("");
    try {
      const rec = await getRecord(params.id);
      if (!rec) setError("This record does not exist.");
      setRecord(rec);
      setVerifications(await listVerifications(params.id));
    } catch (e: any) {
      setError(e?.message || "Could not load this record");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    if (ready && session?.user) load();
  }, [ready, session, load]);

  if (!configured) {
    return (
      <div>
        <PageHeader title="Record details" description="" />
        <SetupNotice what="Record data" />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (error || !record) {
    return (
      <div>
        <PageHeader title="Record details" description="" />
        <EmptyState
          icon={FileText}
          title={error || "Record not found"}
          description="It may have been removed, or the link is incorrect."
          action={
            <Link href="/records">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft className="h-4 w-4" /> Back to records
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const conf = Number(record.confidence_score ?? 0);

  const decide = async (action: "accepted" | "rejected") => {
    if (busy) return;
    setBusy(true);
    try {
      const s = await getSession();
      await resolveVerification({
        recordId: record.id,
        action,
        notes: note || undefined,
        userId: s.user?.id ?? "",
        recordCode: record.record_code,
      });
      toast({
        description:
          action === "accepted"
            ? "Record accepted"
            : "Record rejected and flagged",
      });
      await load();
      setNote("");
    } catch (e: any) {
      toast({ description: e?.message || "Could not save the decision" });
    } finally {
      setBusy(false);
    }
  };

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
        ["Area (detected)", record.area_detected != null ? `${record.area_detected} Hectare` : null],
        ["Area (reference)", record.area_reference != null ? `${record.area_reference} Hectare` : null],
        ["Classification", record.classification],
      ],
    ],
    [
      "PIPELINE",
      [
        ["Validation", record.validation_status.toUpperCase()],
        ["Validation score", record.validation_score != null ? `${record.validation_score} / 100` : null],
        ["Language", record.language],
        ["Duplicate match", record.dup_match_code ? `${record.dup_match_code} (${record.dup_similarity ?? "?"}%)` : "None"],
      ],
    ],
    [
      "VERIFICATION",
      [
        ["Status", record.verification_status.toUpperCase()],
        ["Verified at", record.verified_at ? new Date(record.verified_at).toLocaleString() : null],
        ["Rejection reason", record.rejection_reason],
      ],
    ],
  ];

  return (
    <div>
      <PageHeader
        title={record.record_code ?? record.id.slice(0, 8)}
        description={`Extracted ${new Date(record.created_at).toLocaleString()}`}
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/records")}>
              <ArrowLeft className="h-4 w-4" /> All records
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
            <Link href="/gis">
              <Button variant="outline" className="rounded-full">
                <MapPinned className="h-4 w-4" /> View on GIS
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className={`rounded-md text-[10px] font-extrabold ${verBadge[record.verification_status] ?? "bg-muted"}`}>
          {record.verification_status.toUpperCase()}
        </Badge>
        <Badge variant="outline" className="rounded-md text-[10px] font-extrabold">
          {record.validation_status.replace("_", " ").toUpperCase()}
        </Badge>
        {record.document_id && (
          <Badge variant="outline" className="rounded-md font-mono text-[10px]">
            doc: {record.document_id.slice(0, 8)}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Details */}
        <div className="space-y-4 lg:col-span-2">
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
                        <b className="text-right font-mono">{v}</b>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Raw extracted fields */}
          {record.fields && Object.keys(record.fields).length > 0 && (
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Extracted fields (as stored)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {Object.entries(record.fields).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{FIELD_LABELS[k] ?? k}</span>
                    <b className="truncate font-mono text-[13px]">{String(v ?? "") || "—"}</b>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side panel: confidence + decisions */}
        <div className="space-y-4">
          <Card className="border-border/80">
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">Extraction confidence</div>
              <div className="font-mono text-3xl font-bold">{(conf * 100).toFixed(1)}%</div>
              <Progress value={conf * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>

          {record.verification_status === "pending" ? (
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Decide this record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">
                  Notes <span className="font-normal">(optional)</span>
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mb-4 resize-none rounded-2xl"
                  placeholder="Add verification notes…"
                />
                {/* Both actions always visible — stacked on mobile, side by side on larger screens */}
                <div className="grid grid-cols-1 gap-3">
                  <Button className="h-11 rounded-full text-[15px]" disabled={busy} onClick={() => decide("accepted")}>
                    <Check className="h-4 w-4" /> Accept record
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11 rounded-full text-[15px] text-white shadow-md shadow-destructive/25"
                    disabled={busy}
                    onClick={() => decide("rejected")}
                  >
                    <X className="h-4 w-4" /> Reject &amp; flag
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80">
              <CardContent className="p-5 text-sm">
                <p className="font-semibold">
                  Decision: <span className="capitalize">{record.verification_status}</span>
                </p>
                {record.verified_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(record.verified_at).toLocaleString()}
                  </p>
                )}
                {record.rejection_reason && (
                  <p className="mt-2 rounded-xl bg-[var(--destructive-soft)] px-3 py-2 text-xs text-destructive">
                    {record.rejection_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verification history */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Decision history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {verifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
              ) : (
                verifications.map((v) => (
                  <div key={v.id} className="rounded-xl bg-muted/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <b className="capitalize">{v.action}</b>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
