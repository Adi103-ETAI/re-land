import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const auth = req.headers.get("authorization");
  const res = await fetch(`${BACKEND}/api/v1/jobs/${jobId}`, {
    headers: auth ? { Authorization: auth } : {},
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
