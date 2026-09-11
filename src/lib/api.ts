/**
 * API client for LANDLENS backend
 */

export interface JobStatus {
  jobId: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  stage?: string;
  result?: any;
  error?: string;
}

export interface ValidationResults {
  routing: "SAFE" | "REVIEW" | "HIGH_RISK";
  confidence_score: number;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  check: string;
  status: "pass" | "fail" | "warning" | "inconclusive";
  severity: "informational" | "minor" | "major" | "critical";
  expected_value?: string;
  actual_value?: string;
  source: string;
  reason?: string;
  confidence?: number;
}

export interface VerificationTask {
  taskId: string;
  recordId: string;
  assignedTo?: string;
  reason: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "escalated";
  createdAt: string;
}

const API_BASE = "/api/v1";

export async function uploadFile(file: File, lang: string = "Marathi"): Promise<{ jobId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lang", lang);
  
  const res = await fetch(`${API_BASE}/records/upload`, {
    method: "POST",
    body: formData,
  });
  
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Failed to get job status`);
  return res.json();
}

export async function pollUntilComplete(
  jobId: string,
  onProgress?: (status: JobStatus) => void,
  intervalMs: number = 2000
): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        onProgress?.(status);
        
        if (status.status === "done" || status.status === "failed") {
          clearInterval(poll);
          status.status === "done" ? resolve(status) : reject(new Error(status.error || "Unknown error"));
        }
      } catch (err) {
        clearInterval(poll);
        reject(err);
      }
    }, intervalMs);
    
    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(poll);
      reject(new Error("Polling timeout"));
    }, 300000);
  });
}

export async function validateRecord(recordId: string): Promise<ValidationResults> {
  const res = await fetch(`${API_BASE}/records/${recordId}/validate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Validation failed`);
  return res.json();
}

export async function reviewTask(
  taskId: string,
  action: "accept" | "correct" | "reject" | "reprocess" | "escalate",
  fieldChanges?: Record<string, any>,
  reason?: string,
  officerId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/verify/${taskId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, field_changes: fieldChanges, reason, officer_id: officerId }),
  });
  if (!res.ok) throw new Error(`Review failed: ${res.status}`);
  return res.json();
}

export async function getVerificationTasks(officerId: string): Promise<{ tasks: VerificationTask[] }> {
  const res = await fetch(`${API_BASE}/tasks/${officerId}`);
  if (!res.ok) throw new Error(`Failed to get tasks`);
  return res.json();
}
