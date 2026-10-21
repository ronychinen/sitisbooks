import { NextResponse, type NextRequest } from "next/server";

type Candidate = { url: string; source: "Open Library" | "Google Books"; title: string; author: string; year?: string };

async function openLibrary(title: string, author: string): Promise<Candidate[]> {
  const u = new URL("https://openlibrary.org/search.json");
  u.searchParams.set("title", title);
  if (author) u.searchParams.set("author", author);
  u.searchParams.set("limit", "10");
  u.searchParams.set("fields", "title,author_name,cover_i,first_publish_year");
  const r = await fetch(u, { headers: { "User-Agent": "Sitisbooks/1.0 (intercambio de libros)" }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.docs ?? [])
    .filter((d: { cover_i?: number }) => d.cover_i)
    .map((d: { cover_i: number; title: string; author_name?: string[]; first_publish_year?: number }) => ({
      url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
      source: "Open Library" as const,
      title: d.title,
      author: d.author_name?.[0] ?? "",
      year: d.first_publish_year ? String(d.first_publish_year) : undefined,
    }));
}

async function googleBooks(title: string, author: string): Promise<Candidate[]> {
  const q = `intitle:${title}` + (author ? ` inauthor:${author}` : "");
  const u = new URL("https://www.googleapis.com/books/v1/volumes");
  u.searchParams.set("q", q);
  u.searchParams.set("maxResults", "10");
  u.searchParams.set("printType", "books");
  if (process.env.GOOGLE_BOOKS_API_KEY) u.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return [];
  const j = await r.json();
  type Vol = { volumeInfo?: { title?: string; authors?: string[]; publishedDate?: string; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };
  return (j.items ?? [])
    .map((it: Vol) => it.volumeInfo)
    .filter((v: Vol["volumeInfo"]) => v?.imageLinks?.thumbnail || v?.imageLinks?.smallThumbnail)
    .map((v: NonNullable<Vol["volumeInfo"]>) => ({
      url: (v.imageLinks!.thumbnail || v.imageLinks!.smallThumbnail)!.replace(/^http:/, "https:").replace("&edge=curl", ""),
      source: "Google Books" as const,
      title: v.title ?? "",
      author: v.authors?.[0] ?? "",
      year: v.publishedDate?.slice(0, 4),
    }));
}

export async function GET(req: NextRequest) {
  const title = (req.nextUrl.searchParams.get("title") || "").trim().slice(0, 160);
  const author = (req.nextUrl.searchParams.get("author") || "").trim().slice(0, 120);
  if (title.length < 2) return NextResponse.json({ candidates: [] });
  const [ol, gb] = await Promise.allSettled([openLibrary(title, author), googleBooks(title, author)]);
  const a = ol.status === "fulfilled" ? ol.value : [];
  const b = gb.status === "fulfilled" ? gb.value : [];
  // Intercala ambas fuentes y quita duplicados por URL
  const seen = new Set<string>(); const out: Candidate[] = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < 12; i++) {
    for (const c of [a[i], b[i]]) if (c && !seen.has(c.url)) { seen.add(c.url); out.push(c); }
  }
  return NextResponse.json({ candidates: out.slice(0, 12) }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
