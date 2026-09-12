import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy for the FastAPI backend (/api/v1/* -> BACKEND_URL).
 *
 * Keeping auth + data calls on one origin avoids CORS in every environment
 * (dev, docker, preview) — the browser never needs to know the backend URL.
 * NEXT_PUBLIC_API_URL can still override this for direct browser->API setups.
 */
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const incoming = new URL(req.url);
  const target = `${BACKEND}/api/v1/${path.join("/")}${incoming.search}`;

  const headers = new Headers();
  for (const key of ["authorization", "content-type", "accept"]) {
    const value = req.headers.get(key);
    if (value) headers.set(key, value);
  }

  try {
    const backendRes = await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : await req.arrayBuffer(),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) resHeaders.set(key, value);
    });
    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch {
    return NextResponse.json({ detail: "Backend unavailable" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
