import { isSpanish } from "@/lib/lang";

// Reseña breve de un libro: Google Books (en español si existe) → Apple Books → Open Library.
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (t: string) => norm(t).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2);

function clean(html: string) {
  return html
    .replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Recorta a ~max caracteres terminando en una oración. */
function brief(t: string, max = 700) {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

const sameBook = (title: string, author: string, t?: string, a?: string) => {
  const tw = words(title), aw = words(author);
  const okT = !tw.length || tw.filter((w) => norm(t ?? "").includes(w)).length >= Math.ceil(tw.length / 2);
  const okA = !aw.length || aw.some((w) => norm(a ?? "").includes(w));
  return okT && okA;
};

async function google(title: string, author: string, lang?: string) {
  const u = new URL("https://www.googleapis.com/books/v1/volumes");
  u.searchParams.set("q", `intitle:${title}` + (author ? ` inauthor:${author}` : ""));
  u.searchParams.set("maxResults", "10");
  u.searchParams.set("printType", "books");
  if (lang) u.searchParams.set("langRestrict", lang);
  if (process.env.GOOGLE_BOOKS_API_KEY) u.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const j = await r.json();
  type V = { volumeInfo?: { title?: string; authors?: string[]; description?: string } };
  const v = (j.items ?? []).map((i: V) => i.volumeInfo)
    .find((v: V["volumeInfo"]) => v?.description && v.description.length > 80 && sameBook(title, author, v.title, v.authors?.join(" ")));
  return v?.description ? clean(v.description) : null;
}

async function apple(title: string, author: string) {
  const u = new URL("https://itunes.apple.com/search");
  u.searchParams.set("term", `${title} ${author}`.trim());
  u.searchParams.set("media", "ebook");
  u.searchParams.set("country", "pe");
  u.searchParams.set("limit", "10");
  const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const j = await r.json();
  type It = { trackName?: string; artistName?: string; description?: string };
  const it = (j.results ?? []).find((x: It) => x.description && x.description.length > 80 && sameBook(title, author, x.trackName, x.artistName));
  return it?.description ? clean(it.description) : null;
}

async function openLibrary(title: string, author: string) {
  const u = new URL("https://openlibrary.org/search.json");
  u.searchParams.set("title", title);
  if (author) u.searchParams.set("author", author);
  u.searchParams.set("limit", "1");
  u.searchParams.set("fields", "key");
  const h = { "User-Agent": "Sitisbooks/1.0 (intercambio de libros)" };
  const r = await fetch(u, { headers: h, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const key = (await r.json()).docs?.[0]?.key;
  if (!key) return null;
  const w = await fetch(`https://openlibrary.org${key}.json`, { headers: h, signal: AbortSignal.timeout(6000) });
  if (!w.ok) return null;
  const d = (await w.json()).description;
  const txt = typeof d === "string" ? d : d?.value;
  return txt && txt.length > 80 ? clean(txt.replace(/\(\[source\][^)]*\)|-{3,}[\s\S]*$/g, "")) : null;
}

// Traducción al español con MyMemory (gratuito, sin clave; máx. ~500 caracteres por consulta)
async function toSpanish(t: string) {
  const sentences = t.match(/[^.!?\n]+[.!?]*\s*/g) ?? [t];
  const chunks: string[] = [];
  for (const s of sentences) {
    const last = chunks[chunks.length - 1];
    if (last !== undefined && (last + s).length <= 450) chunks[chunks.length - 1] = last + s;
    else chunks.push(s.slice(0, 450));
  }
  const out: string[] = [];
  for (const c of chunks) {
    const u = new URL("https://api.mymemory.translated.net/get");
    u.searchParams.set("q", c.trim());
    u.searchParams.set("langpair", "en|es");
    u.searchParams.set("de", "sitisbooks@gmail.com");
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const j = await r.json();
    const tr: string | undefined = j?.responseData?.translatedText;
    if (!tr || j.responseStatus !== 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(tr)) return null;
    out.push(tr.trim());
  }
  return out.join(" ").replace(/\s+([.,;:!?])/g, "$1");
}


export type Summary = { summary: string | null; source?: string; translated?: boolean };

/** Reseña breve en español: primero fuentes en español; si no hay, traduce la primera encontrada. */
export async function findSummary(title: string, author: string): Promise<Summary> {
  title = title.trim().slice(0, 160); author = author.trim().slice(0, 120);
  if (title.length < 2) return { summary: null };
  const tries: [string, () => Promise<string | null>][] = [
    ["Google Books", () => google(title, author, "es")],
    ["Apple Books", () => apple(title, author)],
    ["Google Books", () => google(title, author)],
    ["Open Library", () => openLibrary(title, author)],
  ];
  let fallback: { text: string; source: string } | null = null;
  for (const [source, f] of tries) {
    const s = await f().catch(() => null);
    if (!s) continue;
    if (isSpanish(s)) return { summary: brief(s), source };
    fallback ??= { text: s, source };
  }
  if (fallback) {
    const es = await toSpanish(brief(fallback.text, 650)).catch(() => null);
    if (es && isSpanish(es)) return { summary: es, source: fallback.source, translated: true };
  }
  return { summary: null };
}
