import { getAccessToken } from "@/lib/auth";

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parse<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data as any)?.detail || (data as any)?.error || res.statusText;
    throw new Error(typeof detail === "string" ? detail : `Request failed (${res.status})`);
  }
  return data as T;
}

export async function uploadFile(file: File, lang: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("lang", lang);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: fd,
    headers: authHeaders(),
  });
  return parse(res);
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}`, { headers: authHeaders() });
  return parse(res);
}

export async function validateRecord(recordId: string) {
  const res = await fetch(`/api/records/${recordId}/validate`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parse(res);
}

export async function reviewTask(
  taskId: string,
  action: string,
  changes?: any,
  reason?: string,
  officerId?: string
) {
  const res = await fetch(`/api/verify/${taskId}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action, field_changes: changes, reason, officer_id: officerId }),
  });
  return parse(res);
}
