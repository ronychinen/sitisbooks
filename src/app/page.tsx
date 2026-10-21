import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { DISTRICTS, GENRES, type Book } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; g?: string; d?: string }> }) {
  const { q = "", g = "", d = "" } = await searchParams;
  const { supabase, user, profile } = await getSession();
  let query = supabase.from("books").select("*").eq("status", "disponible").order("created_at", { ascending: false }).limit(120);
  if (g) query = query.eq("genre", g);
  if (d) query = query.eq("district", d);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,author.ilike.%${safe}%`);
  }
  const { data } = await query;
  const books = (data ?? []) as Book[];
  const filtered = !!(q || g || d);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Intercambio de libros · Lima Metropolitana</p>
          <h1>Dona los libros que ya leíste. Recibe los que quieres leer.</h1>
          <p className="lead">Cada libro que donas te da 1 crédito para pedir otro. Solo pagas el delivery a tu distrito y una comisión fija por intercambio.</p>
          {!user && <div className="row" style={{ marginTop: 18 }}><Link className="btn" href="/ingresar?next=/donar">Crear cuenta gratis</Link><span className="muted">y recibe 1 crédito de bienvenida</span></div>}
        </div>
        <div className="steps">
          <div><span><b>Publica</b> los libros que quieres donar. Buscamos la portada por ti.</span></div>
          <div><span><b>Gana 1 crédito</b> por cada libro entregado. Al registrarte recibes 1 de bienvenida.</span></div>
          <div><span><b>Pide un libro</b>: usas 1 crédito y pagas delivery + comisión por Yape o transferencia. Nosotros coordinamos recojo y entrega.</span></div>
        </div>
      </section>

      <div className="row between" style={{ marginBottom: 14 }}>
        <h2>Libros disponibles</h2>
      </div>
      <form className="toolbar" method="get">
        <input name="q" type="search" placeholder="Buscar por título o autor" defaultValue={q} aria-label="Buscar" />
        <select name="g" defaultValue={g} aria-label="Género"><option value="">Todos los géneros</option>{GENRES.map((x) => <option key={x}>{x}</option>)}</select>
        <select name="d" defaultValue={d} aria-label="Distrito"><option value="">Todos los distritos</option>{DISTRICTS.map((x) => <option key={x}>{x}</option>)}</select>
        <button className="btn ghost" type="submit" style={{ flex: "0 0 auto" }}>Filtrar</button>
      </form>

      {books.length === 0 ? (
        filtered ? (
          <div className="empty"><h3>Sin resultados</h3><p>Prueba otro título, género o distrito.</p><Link className="btn ghost" href="/">Ver todo</Link></div>
        ) : (
          <div className="empty"><h3>Aún no hay libros publicados</h3><p>Sé el primero: publica un libro que quieras donar y gana tu crédito cuando se entregue.</p><Link className="btn" href="/donar">Donar un libro</Link></div>
        )
      ) : (
        <div className="shelf">
          {books.map((b) => (
            <article className="book" key={b.id}>
              <BookCover title={b.title} author={b.author} url={b.cover_url} tag={b.condition} />
              <div className="title">{b.title}</div>
              <div className="meta"><span>{b.author}</span><span>· {b.district}</span></div>
              {b.owner_id === profile?.id
                ? <span className="chip s-disponible">Tu libro</span>
                : <Link className="btn sm" href={`/pedir/${b.id}`}>Pedir este libro</Link>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
