import { NextResponse, type NextRequest } from "next/server";
import { findSummary } from "@/lib/summary";

export async function GET(req: NextRequest) {
  // Solo para la propia web: evita que otros sitios gasten la cuota de las APIs de libros
  if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "No permitido" }, { status: 403 });
  const r = await findSummary(req.nextUrl.searchParams.get("title") || "", req.nextUrl.searchParams.get("author") || "");
  const cache = !r.summary ? "public, max-age=600" : r.translated ? "public, max-age=86400, s-maxage=2592000" : "public, max-age=86400, s-maxage=604800";
  return NextResponse.json(r, { headers: { "Cache-Control": cache } });
}
