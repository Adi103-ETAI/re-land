/**
 * LANDLENS — Supabase data layer.
 *
 * Every persisted thing in the app flows through here: documents (with
 * files in Supabase Storage), extracted records, human verification
 * decisions, GIS parcels and the append-only audit trail.
 *
 * All functions throw when Supabase env vars are missing — pages are
 * expected to check `isSupabaseConfigured()` first and render a setup
 * notice instead of demo data.
 */
import { getSupabase } from "@/lib/supabase";

// ── Row types (mirror supabase/migrations/*.sql) ─────────────

export interface DocumentRow {
  id: string;
  owner_id: string;
  filename: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  doc_type: string | null;
  language: string | null;
  status: "uploaded" | "processing" | "completed" | "failed";
  job_id: string | null;
  page_count: number | null;
  error: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface RecordRow {
  id: string;
  document_id: string | null;
  created_by: string | null;
  record_code: string | null;
  page_number: number;
  fields: Record<string, any>;
  raw_ocr_text: string | null;
  confidence_score: number | null;
  language: string | null;
  survey_no: string | null;
  khata_no: string | null;
  owner_name: string | null;
  village: string | null;
  tehsil: string | null;
  district: string | null;
  area_detected: number | null;
  area_reference: number | null;
  classification: string | null;
  mutation_date: string | null;
  validation_status: "pending" | "safe" | "review" | "high_risk";
  validation_score: number | null;
  verification_status: "pending" | "accepted" | "rejected" | "corrected" | "escalated";
  dup_similarity: number | null;
  dup_match_code: string | null;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRow {
  id: string;
  record_id: string;
  verifier_id: string | null;
  action: "accepted" | "rejected" | "corrected" | "escalated";
  previous_status: string | null;
  notes: string | null;
  field_changes: Record<string, any> | null;
  created_at: string;
}

export interface ParcelRow {
  id: string;
  survey_no: string | null;
  owner_name: string | null;
  village: string | null;
  tehsil: string | null;
  district: string | null;
  area_hectares: number | null;
  lat: number;
  lng: number;
  status: "Verified" | "Pending" | "Conflict";
  record_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────

function sb() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured — add your keys to .env.local");
  return client;
}

/** Human-friendly record code, e.g. LR-2026-48F3K2 */
export function makeRecordCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LR-${year}-${rand}`;
}

// ── Documents ────────────────────────────────────────────────

export async function uploadDocumentFile(file: File, userId: string): Promise<{ bucket: string; path: string }> {
  const client = sb();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await client.storage.from("documents").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { bucket: "documents", path };
}

export async function createDocument(row: {
  owner_id: string;
  filename: string;
  storage_path: string;
  mime_type?: string;
  file_size?: number;
  doc_type?: string | null;
  language?: string | null;
  status?: DocumentRow["status"];
  job_id?: string | null;
  metadata?: Record<string, any>;
}): Promise<DocumentRow> {
  const { data, error } = await sb()
    .from("documents")
    .insert({ ...row, storage_bucket: "documents" })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save document: ${error.message}`);
  return data as DocumentRow;
}

export async function updateDocument(id: string, patch: Partial<DocumentRow>): Promise<void> {
  const { error } = await sb().from("documents").update(patch).eq("id", id);
  if (error) throw new Error(`Could not update document: ${error.message}`);
}

export async function listDocuments(limit = 50): Promise<DocumentRow[]> {
  const { data, error } = await sb()
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load documents: ${error.message}`);
  return (data ?? []) as DocumentRow[];
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const { data, error } = await sb().from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load document: ${error.message}`);
  return (data as DocumentRow) ?? null;
}

/** Signed URL for previewing a stored document (valid for 1 hour). */
export async function getDocumentFileUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await sb().storage.from("documents").createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ── Records ──────────────────────────────────────────────────

export async function createRecord(row: Partial<RecordRow> & { created_by?: string | null }): Promise<RecordRow> {
  const payload = { record_code: makeRecordCode(), ...row };
  const { data, error } = await sb().from("records").insert(payload).select("*").single();
  if (error) throw new Error(`Could not save record: ${error.message}`);
  return data as RecordRow;
}

export async function updateRecord(id: string, patch: Partial<RecordRow>): Promise<void> {
  const { error } = await sb().from("records").update(patch).eq("id", id);
  if (error) throw new Error(`Could not update record: ${error.message}`);
}

export async function listRecords(limit = 100): Promise<RecordRow[]> {
  const { data, error } = await sb()
    .from("records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load records: ${error.message}`);
  return (data ?? []) as RecordRow[];
}

export async function getRecord(id: string): Promise<RecordRow | null> {
  const { data, error } = await sb().from("records").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load record: ${error.message}`);
  return (data as RecordRow) ?? null;
}

export async function listVerificationQueue(limit = 100): Promise<RecordRow[]> {
  const { data, error } = await sb()
    .from("records")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Could not load verification queue: ${error.message}`);
  return (data ?? []) as RecordRow[];
}

// ── Verifications ────────────────────────────────────────────

export async function listVerifications(recordId?: string, limit = 50): Promise<VerificationRow[]> {
  let query = sb().from("verifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (recordId) query = query.eq("record_id", recordId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load verifications: ${error.message}`);
  return (data ?? []) as VerificationRow[];
}

/**
 * Persist a verification decision: updates the record, writes a
 * verifications row and appends audit-log entries. Used by both the
 * verification queue and the record detail page.
 */
export async function resolveVerification(opts: {
  recordId: string;
  action: "accepted" | "rejected" | "corrected" | "escalated";
  notes?: string;
  fieldChanges?: Record<string, any>;
  userId: string;
  recordCode?: string | null;
}): Promise<void> {
  const client = sb();
  const { data: current, error: fetchErr } = await client
    .from("records")
    .select("verification_status, record_code")
    .eq("id", opts.recordId)
    .maybeSingle();
  if (fetchErr) throw new Error(`Could not load record: ${fetchErr.message}`);

  const patch: Partial<RecordRow> = {
    verification_status: opts.action,
    verified_by: opts.userId,
    verified_at: new Date().toISOString(),
  };
  if (opts.action === "rejected") patch.rejection_reason = opts.notes || "Rejected during verification";
  if (opts.action === "accepted") patch.rejection_reason = null;
  if (opts.fieldChanges && Object.keys(opts.fieldChanges).length > 0) patch.fields = opts.fieldChanges;

  const { error: updErr } = await client.from("records").update(patch).eq("id", opts.recordId);
  if (updErr) throw new Error(`Could not save decision: ${updErr.message}`);

  const { error: verErr } = await client.from("verifications").insert({
    record_id: opts.recordId,
    verifier_id: opts.userId,
    action: opts.action,
    previous_status: current?.verification_status ?? "pending",
    notes: opts.notes || null,
    field_changes: opts.fieldChanges || null,
  });
  if (verErr) throw new Error(`Could not log verification: ${verErr.message}`);

  await logAudit({
    userId: opts.userId,
    action: opts.action === "accepted" ? "VERIFICATION_ACCEPTED" : "VERIFICATION_REJECTED",
    entityType: "record",
    entityId: opts.recordCode || opts.recordId,
    previousValues: { verification_status: current?.verification_status ?? "pending" },
    newValues: { verification_status: opts.action, notes: opts.notes || null },
  });
}

// ── Parcels (GIS) ────────────────────────────────────────────

export async function listParcels(limit = 500): Promise<ParcelRow[]> {
  const { data, error } = await sb()
    .from("parcels")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load parcels: ${error.message}`);
  return (data ?? []) as ParcelRow[];
}

export async function createParcel(row: {
  lat: number;
  lng: number;
  survey_no?: string | null;
  owner_name?: string | null;
  village?: string | null;
  tehsil?: string | null;
  district?: string | null;
  area_hectares?: number | null;
  status?: ParcelRow["status"];
  record_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): Promise<ParcelRow> {
  const { data, error } = await sb().from("parcels").insert(row).select("*").single();
  if (error) throw new Error(`Could not save parcel: ${error.message}`);
  return data as ParcelRow;
}

export async function deleteParcel(id: string): Promise<void> {
  const { error } = await sb().from("parcels").delete().eq("id", id);
  if (error) throw new Error(`Could not delete parcel: ${error.message}`);
}

// ── Audit trail ──────────────────────────────────────────────

export async function logAudit(entry: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}): Promise<void> {
  try {
    await sb().from("audit_logs").insert({
      user_id: entry.userId ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      previous_values: entry.previousValues ?? null,
      new_values: entry.newValues ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    // Never let audit failures break the main user flow.
  }
}

export async function listAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const { data, error } = await sb()
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load audit trail: ${error.message}`);
  return (data ?? []) as AuditLogRow[];
}

// ── Aggregates (dashboard + analytics) ───────────────────────

export interface DashboardStats {
  totalDocuments: number;
  processingJobs: number;
  pendingVerification: number;
  highRiskRecords: number;
  completedRecords: number;
  validationCounts: Record<string, number>;
  verificationCounts: Record<string, number>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const client = sb();
  const [docsRes, recsRes] = await Promise.all([
    client.from("documents").select("id,status"),
    client.from("records").select("id,validation_status,verification_status,confidence_score"),
  ]);
  if (docsRes.error) throw new Error(`Could not load document stats: ${docsRes.error.message}`);
  if (recsRes.error) throw new Error(`Could not load record stats: ${recsRes.error.message}`);

  const docs = (docsRes.data ?? []) as any[];
  const recs = (recsRes.data ?? []) as any[];

  const validationCounts: Record<string, number> = {};
  const verificationCounts: Record<string, number> = {};
  for (const r of recs) {
    validationCounts[r.validation_status] = (validationCounts[r.validation_status] ?? 0) + 1;
    verificationCounts[r.verification_status] = (verificationCounts[r.verification_status] ?? 0) + 1;
  }

  return {
    totalDocuments: docs.length,
    processingJobs: docs.filter((d) => d.status === "processing").length,
    pendingVerification: verificationCounts["pending"] ?? 0,
    highRiskRecords: validationCounts["high_risk"] ?? 0,
    completedRecords: verificationCounts["accepted"] ?? 0,
    validationCounts,
    verificationCounts,
  };
}

export interface AnalyticsData {
  totalDocuments: number;
  totalRecords: number;
  avgConfidence: number; // 0..100
  successRate: number; // 0..100
  pendingVerification: number;
  highRiskCount: number;
  validationDist: { status: string; count: number }[];
  confidenceDist: { range: string; count: number }[];
  recentDocuments: DocumentRow[];
  pipeline: { stage: string; count: number }[];
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const client = sb();
  const [docsRes, recsRes] = await Promise.all([
    client.from("documents").select("*").order("created_at", { ascending: false }).limit(10),
    client.from("records").select("id,validation_status,verification_status,confidence_score,created_at"),
  ]);
  if (docsRes.error) throw new Error(`Could not load analytics: ${docsRes.error.message}`);
  if (recsRes.error) throw new Error(`Could not load analytics: ${recsRes.error.message}`);

  const recs = (recsRes.data ?? []) as any[];
  const withConf = recs.filter((r) => r.confidence_score != null);
  const avgConfidence = withConf.length
    ? Math.round((withConf.reduce((s, r) => s + Number(r.confidence_score), 0) / withConf.length) * 100)
    : 0;

  const validationCounts: Record<string, number> = {};
  const verificationCounts: Record<string, number> = {};
  for (const r of recs) {
    validationCounts[r.validation_status] = (validationCounts[r.validation_status] ?? 0) + 1;
    verificationCounts[r.verification_status] = (verificationCounts[r.verification_status] ?? 0) + 1;
  }

  const buckets: Record<string, number> = { "90-100%": 0, "80-90%": 0, "70-80%": 0, "Below 70%": 0 };
  for (const r of withConf) {
    const c = Number(r.confidence_score);
    if (c >= 0.9) buckets["90-100%"]++;
    else if (c >= 0.8) buckets["80-90%"]++;
    else if (c >= 0.7) buckets["70-80%"]++;
    else buckets["Below 70%"]++;
  }

  const total = recs.length || 1;
  return {
    totalDocuments: (docsRes.data ?? []).length === 10 ? 10 : (docsRes.data ?? []).length,
    totalRecords: recs.length,
    avgConfidence,
    successRate: Math.round(((verificationCounts["accepted"] ?? 0) / total) * 100),
    pendingVerification: verificationCounts["pending"] ?? 0,
    highRiskCount: validationCounts["high_risk"] ?? 0,
    validationDist: Object.entries(validationCounts).map(([status, count]) => ({ status, count })),
    confidenceDist: Object.entries(buckets).map(([range, count]) => ({ range, count })),
    recentDocuments: (docsRes.data ?? []) as DocumentRow[],
    pipeline: [
      { stage: "Uploaded", count: recs.length },
      { stage: "Validated", count: recs.filter((r) => r.validation_status !== "pending").length },
      { stage: "Accepted", count: verificationCounts["accepted"] ?? 0 },
      { stage: "Rejected", count: verificationCounts["rejected"] ?? 0 },
    ],
  };
}
