import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSession, createClient } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import GenreTag from "@/components/GenreTag";
import ShareButtons from "@/components/ShareButtons";
import { CONDITION_RANK, copiesLabel, type CatalogBook, type CatalogGroup } from "@/lib/constants";
import { bookPath, bookShareUrl, keyFromSlug } from "@/lib/share";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { findSummary } from "@/lib/summary";
import { isSpanish } from "@/lib/lang";

export const dynamic = "force-dynamic";

// Reseña: la guardada si está en español; si no, la buscamos y la guardamos en caché 30 días
const cachedSummary = unstable_cache(async (title: string, author: string) => (await findSummary(title, author)).summary, ["book-summary-v2"], { revalidate: 60 * 60 * 24 * 30 });

const load = cache(async (slug: string) => {
  const key = keyFromSlug(slug);
  if (!key) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("catalog_groups").select("*").eq("book_key", key).maybeSingle();
  const g = data as CatalogGroup | null;
  if (!g) return { key, group: null, summary: null };
  const summary = g.description && isSpanish(g.description) ? g.description : await cachedSummary(g.title, g.author).catch(() => null);
  return { key, group: g, summary };
});

const clip = (t: string, n: number) => (t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, "") + "…");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d?.group) return { title: "Libro no disponible", robots: { index: false, follow: true } };
  const { group: g, summary } = d;
  const title = `${g.title} de ${g.author}`;
  const description = clip(`Pide "${g.title}" de ${g.author} en Sitisbooks: dona los libros que ya leíste y recibe los que quieres leer en Lima. ${summary ?? ""}`.trim(), 160);
  const url = `${SITE_URL}${bookPath(g.book_key)}`;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { type: "book", title: `${title} · ${SITE_NAME}`, description, url, ...(g.cover_url ? { images: [{ url: g.cover_url, alt: `Portada de ${g.title}` }] } : {}) },
    twitter: { card: g.cover_url ? "summary_large_image" : "summary", title: `${title} · ${SITE_NAME}`, description, ...(g.cover_url ? { images: [g.cover_url] } : {}) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [d, { supabase, user, profile }] = await Promise.all([load(slug), getSession()]);

  if (!d?.group) {
    return (
      <div className="empty" style={{ maxWidth: 640, margin: "0 auto" }}>
        <h3>Este libro ya no está disponible</h3>
        <p>Alguien ya lo pidió o el donante lo retiró. Agrégalo a tu lista de deseos y te avisamos por correo cuando alguien lo vuelva a publicar.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/deseos">Agregar a mi lista de deseos</Link>
          <Link className="btn ghost" href="/#catalogo">Ver catálogo</Link>
        </div>
      </div>
    );
  }

  const { group: g, summary } = d;
  const [{ data: copiesData }, { data: relData }] = await Promise.all([
    supabase.from("catalog").select("id, condition, is_mine, created_at").eq("book_key", g.book_key),
    supabase.from("catalog_groups").select("*").eq("genre", g.genre).neq("book_key", g.book_key).order("created_at", { ascending: false }).limit(6),
  ]);
  const copies = ((copiesData ?? []) as Pick<CatalogBook, "id" | "condition" | "is_mine" | "created_at">[])
    .filter((c) => !c.is_mine)
    .sort((x, y) => (CONDITION_RANK[x.condition] ?? 9) - (CONDITION_RANK[y.condition] ?? 9) || x.created_at.localeCompare(y.created_at));
  const related = (relData ?? []) as CatalogGroup[];
  const pedir = (id: string) => (user ? `/pedir/${id}` : `/ingresar?next=${encodeURIComponent(`/pedir/${id}`)}`);
  const url = `${SITE_URL}${bookPath(g.book_key)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Book", "@id": `${url}#book`, name: g.title, author: { "@type": "Person", name: g.author }, genre: g.genre, url, ...(g.cover_url ? { image: g.cover_url } : {}), ...(summary ? { description: clip(summary, 500) } : {}) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Catálogo", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: g.genre, item: `${SITE_URL}/?g=${encodeURIComponent(g.genre)}#catalogo` },
        { "@type": "ListItem", position: 3, name: g.title, item: url },
      ] },
    ],
  };

  return (
    <div className="stack" style={{ gap: 32 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="muted crumbs" aria-label="Ruta">
        <Link href="/#catalogo">Catálogo</Link> › <Link href={`/?g=${encodeURIComponent(g.genre)}#catalogo`}>{g.genre}</Link> › <span>{g.title}</span>
      </nav>

      <div className="split">
        <div style={{ maxWidth: 300, width: "100%" }}><BookCover title={g.title} author={g.author} url={g.cover_url} /></div>
        <section className="stack">
          <div className="stack" style={{ gap: 6 }}>
            <div><GenreTag genre={g.genre} /></div>
            <h1 style={{ fontSize: 34, margin: 0, lineHeight: 1.15 }}>{g.title}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 17 }}>{g.author}</p>
          </div>

          {copies.length > 0 ? (
            <div className="panel stack" style={{ gap: 12 }}>
              <b>{copiesLabel(copies.length)} {copies.length === 1 ? "disponible" : "disponibles"} en Lima</b>
              {copies.length > 1 && (
                <div className="row" style={{ gap: 8 }}>
                  {copies.map((c) => <Link key={c.id} className="opt" href={pedir(c.id)}>{c.condition}</Link>)}
                </div>
              )}
              <Link className="btn lg" style={{ alignSelf: "flex-start" }} href={pedir(copies[0].id)}>Pedir este libro</Link>
              <span className="muted" style={{ fontSize: 13 }}>Usas 1 crédito y pagas solo el delivery y una comisión fija. {user ? "" : "Al registrarte recibes 1 crédito de bienvenida."}</span>
            </div>
          ) : (
            <p className="note">Este ejemplar es tuyo. Compártelo para que encuentre lector más rápido.</p>
          )}

          <ShareButtons small url={bookShareUrl(g.book_key, profile?.referral_code)} label="Compartir"
            text={`Mira "${g.title}" de ${g.author} en Sitisbooks, la comunidad para intercambiar libros en Lima 📚`} />
        </section>
      </div>

      <section className="stack" style={{ gap: 10, maxWidth: 760 }}>
        <h2 style={{ margin: 0 }}>De qué trata</h2>
        {summary
          ? <div className="rm-text" style={{ maxHeight: "none" }}>{summary.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
          : <p className="muted">Aún no tenemos una reseña de este libro.</p>}
      </section>

      <section className="panel stack" style={{ gap: 8, maxWidth: 760 }}>
        <b>¿Cómo funciona Sitisbooks?</b>
        <ol className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Dona los libros que ya leíste: por cada uno que llega a su nuevo lector ganas 1 crédito.</li>
          <li>Usa tus créditos para pedir los libros que quieres leer.</li>
          <li>Nosotros recogemos y entregamos en Lima. Tus datos nunca se comparten con otros usuarios.</li>
        </ol>
      </section>

      {related.length > 0 && (
        <section className="stack">
          <h2 style={{ margin: 0 }}>Más libros de {g.genre}</h2>
          <div className="shelf">
            {related.map((b) => (
              <Link className="book" key={b.book_key} href={bookPath(b.book_key)} style={{ textDecoration: "none", color: "inherit" }}>
                <BookCover title={b.title} author={b.author} url={b.cover_url} tag={b.condition} />
                <div className="title" title={b.title}>{b.title}</div>
                <div className="author" title={b.author}>{b.author}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
