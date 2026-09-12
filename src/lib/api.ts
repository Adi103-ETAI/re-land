export async function uploadFile(file: File, lang: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("lang", lang);
  const res = await fetch("/api/jobs/upload", { method: "POST", body: fd });
  return res.json();
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}`);
  return res.json();
}

export async function validateRecord(recordId: string) {
  const res = await fetch(`/api/records/${recordId}/validate`, { method: "POST" });
  return res.json();
}

export async function reviewTask(taskId: string, action: string, changes?: any, reason?: string, officerId?: string) {
  const res = await fetch(`/api/verify/${taskId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, field_changes: changes, reason, officer_id: officerId }),
  });
  return res.json();
}