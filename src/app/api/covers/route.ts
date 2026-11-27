import { NextResponse, type NextRequest } from "next/server";

type Candidate = { url: string; source: "Apple Books" | "Open Library" | "Google Books"; title: string; author: string; year?: string };

async function openLibrary(title: string, author: string): Promise<Candidate[]> {
  const strict = await openLibraryQuery({ title, ...(author ? { author } : {}) });
  return strict.length ? strict : openLibraryQuery({ q: `${title} ${author}`.trim() });
}

async function openLibraryQuery(params: Record<string, string>): Promise<Candidate[]> {
  const u = new URL("https://openlibrary.org/search.json");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
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

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Apple Books: sin API key y con buena cobertura de ediciones en español.
async function appleBooks(title: string, author: string): Promise<Candidate[]> {
  const u = new URL("https://itunes.apple.com/search");
  u.searchParams.set("term", `${title} ${author}`.trim());
  u.searchParams.set("media", "ebook");
  u.searchParams.set("country", "pe");
  u.searchParams.set("limit", "15");
  const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return [];
  const j = await r.json();
  const authorWords = norm(author).split(/\s+/).filter((w) => w.length > 2);
  type Item = { trackName?: string; artistName?: string; artworkUrl100?: string; releaseDate?: string };
  return (j.results ?? [])
    .filter((it: Item) => it.artworkUrl100 && it.trackName)
    // Evita resúmenes y guías de otros autores
    .filter((it: Item) => !authorWords.length || authorWords.some((w) => norm(it.artistName ?? "").includes(w)))
    .map((it: Item) => ({
      url: it.artworkUrl100!.replace(/\/\d+x\d+bb\./, "/600x600bb."),
      source: "Apple Books" as const,
      title: it.trackName!,
      author: it.artistName ?? "",
      year: it.releaseDate?.slice(0, 4),
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
  // Solo para la propia web: evita que otros sitios gasten la cuota de las APIs de libros
  if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "No permitido" }, { status: 403 });
  const title = (req.nextUrl.searchParams.get("title") || "").trim().slice(0, 160);
  const author = (req.nextUrl.searchParams.get("author") || "").trim().slice(0, 120);
  if (title.length < 2) return NextResponse.json({ candidates: [] });
  // Sugerencias mientras se escribe: Apple Books (rápido); si la última palabra está a medias, Open Library con comodín.
  // Solo se muestran títulos que contienen lo escrito (cada palabra como inicio de una palabra del título).
  if (req.nextUrl.searchParams.get("suggest")) {
    const tokens = norm(title).split(/\s+/).filter(Boolean);
    const matches = (c: Candidate) => {
      const words = norm(c.title).split(/[^a-z0-9ñ]+/).filter(Boolean);
      return tokens.every((t) => words.some((w) => w.startsWith(t)));
    };
    let list = (await appleBooks(title, "").catch(() => [])).filter(matches);
    if (list.length < 3) {
      const wild = tokens.map((t) => t.replace(/[^a-z0-9ñ]/g, "")).filter(Boolean).join(" ") + "*";
      const ol = await openLibraryQuery({ q: `title:(${wild})` }).catch(() => []);
      list = list.concat(ol.filter(matches));
    }
    const seen = new Set<string>();
    const out = list.filter((c) => { const k = norm(`${c.title}|${c.author}`); if (seen.has(k)) return false; seen.add(k); return true; });
    return NextResponse.json({ candidates: out.slice(0, 6) }, { headers: { "Cache-Control": out.length ? "public, max-age=600" : "no-store" } });
  }
  const results = await Promise.allSettled([appleBooks(title, author), openLibrary(title, author), googleBooks(title, author)]);
  const lists = results.map((r) => (r.status === "fulfilled" ? r.value : []));
  // Intercala las fuentes (Apple primero) y quita duplicados por URL
  const seen = new Set<string>(); const out: Candidate[] = [];
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max && out.length < 12; i++) {
    for (const l of lists) { const c = l[i]; if (c && !seen.has(c.url)) { seen.add(c.url); out.push(c); } }
  }
  // Sin resultados no se guarda en caché: puede que una fuente haya fallado por un momento
  return NextResponse.json({ candidates: out.slice(0, 12) }, { headers: { "Cache-Control": out.length > 1 ? "public, max-age=600" : "no-store" } });
}
