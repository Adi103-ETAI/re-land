/**
 * Catch-all API proxy: /api/v1/* → BACKEND/api/v1/*
 *
 * Lets the browser call the FastAPI backend same-origin (no CORS setup,
 * no exposed backend port). Forwards method, body (JSON or FormData) and
 * the Authorization header. Individual /api/* routes (upload, jobs, …)
 * continue to work alongside this.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "transfer-encoding", "upgrade",
  "proxy-authenticate", "proxy-authorization", "te", "trailer",
]);

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const target = `${BACKEND}/api/v1/${Array.isArray(path) ? path.join("/") : path}`;

  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  }

  const body = req.method === "GET" || req.method === "HEAD"
    ? undefined
    : await req.arrayBuffer();

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error — duplex is valid for streaming bodies in undici
      duplex: "half",
    });

    const resHeaders = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) resHeaders.set("content-type", contentType);

    const data = await res.arrayBuffer();
    return new NextResponse(data, { status: res.status, headers: resHeaders });
  } catch {
    return NextResponse.json(
      { detail: "Backend unreachable — is the API server running?" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
