import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const res = await fetch(`${BACKEND}/api/v1/jobs/${jobId}`);
  const data = await res.json();
  return NextResponse.json(data);
}
