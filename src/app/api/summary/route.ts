import { NextResponse, type NextRequest } from "next/server";
import { findSummary } from "@/lib/summary";

export async function GET(req: NextRequest) {
  const r = await findSummary(req.nextUrl.searchParams.get("title") || "", req.nextUrl.searchParams.get("author") || "");
  const cache = !r.summary ? "public, max-age=600" : r.translated ? "public, max-age=86400, s-maxage=2592000" : "public, max-age=86400, s-maxage=604800";
  return NextResponse.json(r, { headers: { "Cache-Control": cache } });
}
