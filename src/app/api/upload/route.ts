import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  // Proxy to FastAPI — keeps ML deps out of Vercel/Next bundle
  const res = await fetch(`${BACKEND}/api/v1/records/upload`, {
    method: "POST",
    body: form as unknown as BodyInit,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
