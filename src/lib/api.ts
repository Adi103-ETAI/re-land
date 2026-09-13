import { getApiBase } from "@/lib/auth";

/**
 * Pipeline API (FastAPI extraction worker).
 * NOTE: no Supabase JWT is forwarded — the worker is reached over the
 * same-origin Next.js proxy and performs no user auth. All persistent
 * data lives in Supabase (see src/lib/db.ts).
 */

function base(): string {
  return getApiBase();
}

async function parse<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data as any)?.detail || (data as any)?.error || res.statusText;
    throw new Error(typeof detail === "string" ? detail : `Request failed (${res.status})`);
  }
  return data as T;
}

/** Send a document to the extraction pipeline. Returns { jobId }. */
export async function uploadFile(file: File, lang: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("lang", lang);
  // When using the same-origin Next.js proxy (base === "/api"), hit /api/upload
  // which proxies to BACKEND/api/v1/records/upload. When hitting Render directly
  // (NEXT_PUBLIC_API_URL=https://.../api/v1), hit /records/upload.
  const b = base().replace(/\/$/, "");
  const url = b === "/api" ? `${b}/upload` : `${b}/records/upload`;
  const res = await fetch(url, {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(30000),
  });
  return parse(res);
}

export async function getJobStatus(jobId: string) {
  const b = base().replace(/\/$/, "");
  const url = b === "/api" ? `${b}/jobs/${jobId}` : `${b}/jobs/${jobId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  return parse(res);
}
