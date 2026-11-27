import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import ReviewCover from "@/components/ReviewCover";
import { bookPath, bookShareUrl } from "@/lib/share";
import GenreTag from "@/components/GenreTag";
import SmoothLink from "@/components/SmoothLink";
import CatalogFilters from "./CatalogFilters";
import { copiesLabel, type CatalogGroup } from "@/lib/constants";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/apple-icon`, areaServed: { "@type": "City", name: "Lima" } },
    { "@type": "WebSite", "@id": `${SITE_URL}/#web`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: "es-PE", publisher: { "@id": `${SITE_URL}/#org` } },
  ],
};

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; g?: string; libro?: string }> }) {
  const { q = "", g = "", libro = "" } = await searchParams;
  const { supabase, user, profile } = await getSession();
  const myRef = profile?.referral_code ?? null;
  let query = supabase.from("catalog_groups").select("*").order("created_at", { ascending: false }).limit(120);
  if (g) query = query.eq("genre", g);
  if (q) {
    // Sin tildes ni mayúsculas: compara contra book_key (título|autor normalizados, igual que en la base de datos)
    const norm = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, " ").trim();
    if (norm) for (const w of norm.split(" ").slice(0, 6)) query = query.ilike("book_key", `%${w}%`);
  }
  const [{ data }, { data: last }, { data: sharedData }] = await Promise.all([
    query,
    supabase.from("catalog_groups").select("*").order("created_at", { ascending: false }).limit(3),
    libro ? supabase.from("catalog_groups").select("*").eq("book_key", libro.slice(0, 300)).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const shared = sharedData as CatalogGroup | null;
  const latest = (last ?? []) as CatalogGroup[];
  const books = (data ?? []) as CatalogGroup[];
  const filtered = !!(q || g);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {shared && (
        <ReviewCover autoOpen hideTrigger title={shared.title} author={shared.author} url={shared.cover_url} genre={shared.genre} description={shared.description}
          requestHref={shared.request_id ? (user ? `/pedir/${shared.request_id}` : `/ingresar?next=${encodeURIComponent(`/pedir/${shared.request_id}`)}`) : null}
          shareUrl={bookShareUrl(shared.book_key, myRef)} pageHref={bookPath(shared.book_key)} />
      )}
      <section className="lp-hero">
        <div className="lp-copy">
          <span className="lp-badge"><i aria-hidden="true" />Intercambio de libros en Lima</span>
          <h1 className="lp-title">Dona los libros que ya leíste. <span>Recibe los que quieres leer.</span></h1>
          <p className="lp-lead">Cada libro que donas te da 1 crédito para pedir otro. Solo pagas el delivery y una comisión fija. Nosotros coordinamos todo.</p>
          <div className="lp-ctas">
            {user
              ? <Link className="btn lg" href="/donar">Donar un libro</Link>
              : <Link className="btn lg" href="/ingresar?next=/donar">Crear cuenta gratis</Link>}
            <SmoothLink className="btn lg ghost" to="catalogo">Ver catálogo</SmoothLink>
          </div>
          {!user && <span className="lp-note">Al registrarte recibes <b>1 crédito de bienvenida</b>.</span>}
        </div>
        <div className="lp-stack" aria-label="Últimos libros publicados">
          <div className="lp-covers">
          {[0, 1, 2].map((i) => {
            const b = latest[i];
            const slot = `lp-book lp-b${i + 1}`;
            if (!b) return <Link key={i} href={user ? "/donar" : "/ingresar?next=/donar"} className={`${slot} lp-empty`}><span>+ Tu libro aquí</span></Link>;
            const cover = <BookCover title={b.title} author={b.author} url={b.cover_url} />;
            return <Link key={b.book_key} href={bookPath(b.book_key)} className={slot} title={`${b.title} · ${b.author}`}>{cover}</Link>;
          })}
          </div>
          <div className="lp-toast" aria-hidden="true"><span>+1</span><p><b>Crédito ganado</b><br />Tu libro llegó a su nuevo lector</p></div>
        </div>
      </section>

      <section className="lp-how" id="como-funciona">
        <h2>Así funciona</h2>
        <div className="bento">
          <div className="b-dark">
            <span className="b-k">01 · Publica</span>
            <div><b>Escribe el título y elegimos la portada por ti.</b><p>Sin fotos ni descripciones largas: en menos de un minuto tu libro está en el catálogo.</p></div>
          </div>
          <div className="b-card">
            <span className="b-k">02 · Gana</span>
            <b>1 crédito por cada libro entregado</b>
            <p>Se suma cuando tu libro llega a su nuevo lector. Al registrarte recibes 1 de bienvenida.</p>
          </div>
          <div className="b-card b-soft">
            <span className="b-k">03 · Pide</span>
            <b>Usa tu crédito y paga solo el delivery</b>
            <p>Más una comisión fija, por Yape o transferencia.</p>
          </div>
          <div className="b-card b-wide">
            <span className="b-ico" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
            <div><b>Tus datos nunca se comparten con otros usuarios.</b><p>Sitisbooks coordina el recojo y la entrega por ti.</p></div>
          </div>
        </div>
      </section>

      <div className="row between lp-shelf-head" id="catalogo">
        <h2>Libros disponibles</h2>
      </div>
      <CatalogFilters q={q} g={g} />

      {books.length === 0 ? (
        filtered ? (
          <div className="empty"><h3>Sin resultados</h3><p>Prueba otro título o género.</p><Link className="btn ghost" href="/#catalogo" scroll={false}>Ver todo</Link></div>
        ) : (
          <div className="empty"><h3>Aún no hay libros publicados</h3><p>Sé el primero: publica un libro que quieras donar y gana tu crédito cuando se entregue.</p><Link className="btn" href="/donar">Donar un libro</Link></div>
        )
      ) : (
        <div className="shelf">
          {books.map((b) => (
            <article className="book" key={b.book_key}>
              <ReviewCover title={b.title} author={b.author} url={b.cover_url} tag={b.condition} genre={b.genre} description={b.description} requestHref={b.request_id ? `/pedir/${b.request_id}` : null} shareUrl={bookShareUrl(b.book_key, myRef)} pageHref={bookPath(b.book_key)} />
              <Link className="title" title={b.title} href={bookPath(b.book_key)} style={{ color: "inherit", textDecoration: "none" }}>{b.title}</Link>
              <div className="author" title={b.author}>{b.author}</div>
              <div className="row" style={{ gap: 6 }}><GenreTag genre={b.genre} /><span className="copies">{copiesLabel(b.copies)}</span></div>
              {b.request_id
                ? <Link className="btn sm push" href={`/pedir/${b.request_id}`}>Pedir este libro</Link>
                : <span className="chip s-disponible push">Tu libro</span>}
            </article>
          ))}
        </div>
      )}

      <section className="lp-cta">
        <div><b>¿Tienes libros en casa que ya leíste?</b><p>Publica el primero hoy{user ? " y gana 1 crédito cuando llegue a su nuevo lector" : " y empieza con 1 crédito de bienvenida"}.</p></div>
        <Link className="btn lg light" href={user ? "/donar" : "/ingresar?next=/donar"}>Donar un libro</Link>
      </section>
    </>
  );
}
