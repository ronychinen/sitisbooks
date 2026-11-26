import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { MAX_WISHES, type CatalogGroup, type Wish, type WishItem } from "@/lib/constants";
import WishForm from "./WishForm";
import RemoveWish from "./RemoveWish";

export const metadata = {
  title: "Catálogo de deseos",
  description: "Libros que los lectores de Sitisbooks quieren leer. Si tienes uno, dónalo y gana 1 crédito.",
  alternates: { canonical: "/deseos" },
};
export const dynamic = "force-dynamic";

const donateHref = (w: { title: string; author: string; cover_url: string | null }) => {
  const sp = new URLSearchParams({ title: w.title, author: w.author });
  if (w.cover_url) sp.set("cover", w.cover_url);
  return `/donar?${sp.toString()}`;
};
const people = (n: number) => (n === 1 ? "1 persona lo quiere" : `${n} personas lo quieren`);

export default async function Page() {
  const { supabase, user, profile } = await getSession();
  const [{ data: items }, { data: mineRaw }] = await Promise.all([
    supabase.from("wish_catalog").select("*").order("wanted", { ascending: false }).order("created_at", { ascending: false }).limit(120),
    user ? supabase.from("wishes").select("*").eq("user_id", user.id).order("created_at") : Promise.resolve({ data: [] }),
  ]);
  const list = (items ?? []) as WishItem[];
  const mine = (mineRaw ?? []) as Wish[];
  // ¿Alguno de mis deseos ya está disponible en el catálogo?
  const keys = mine.map((w) => w.book_key);
  const { data: avail } = keys.length ? await supabase.from("catalog_groups").select("book_key, request_id").in("book_key", keys) : { data: [] };
  const ready = Object.fromEntries(((avail ?? []) as Pick<CatalogGroup, "book_key" | "request_id">[]).filter((a) => a.request_id).map((a) => [a.book_key, a.request_id]));

  return (
    <div className="stack" style={{ gap: 32 }}>
      <div>
        <p className="eyebrow">Lista de deseos</p>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>Libros que alguien quiere leer</h1>
        <p className="lead">Si tienes uno de estos libros, dónalo: ganas 1 crédito cuando llega a su nuevo lector. Nunca mostramos quién lo pidió.</p>
      </div>

      {user && profile ? (
        <section className="panel stack">
          <div className="row between">
            <h3>Mi lista de deseos</h3>
            <span className="copies">{mine.length} de {MAX_WISHES}</span>
          </div>
          {mine.length > 0 && (
            <div className="list">
              {mine.map((w) => (
                <div className="addr" key={w.id}>
                  <div className="row" style={{ gap: 12, flexWrap: "nowrap", minWidth: 0 }}>
                    <div style={{ width: 40, flex: "none" }}><BookCover title={w.title} url={w.cover_url} /></div>
                    <div style={{ minWidth: 0 }}>
                      <b>{w.title}</b>
                      <div className="muted" style={{ fontSize: 13 }}>{w.author}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    {ready[w.book_key] && <Link className="btn sm" href={`/pedir/${ready[w.book_key]}`}>¡Disponible! Pedir</Link>}
                    <RemoveWish id={w.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <WishForm full={mine.length >= MAX_WISHES} />
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Cuando recibas uno de estos libros, sale solo de tu lista.</p>
        </section>
      ) : (
        <div className="note row between" style={{ gap: 12 }}>
          <span>¿Buscas un libro que no está en el catálogo? Agrégalo a tu lista de deseos (hasta {MAX_WISHES}).</span>
          <Link className="btn sm" href="/ingresar?next=/deseos">Crear mi lista</Link>
        </div>
      )}

      <section className="stack">
        <h2>Catálogo de deseos</h2>
        {list.length === 0 ? (
          <div className="empty"><p>Todavía nadie agregó deseos. ¡Sé el primero!</p></div>
        ) : (
          <div className="shelf">
            {list.map((w) => (
              <article className="book" key={w.book_key}>
                <BookCover title={w.title} author={w.author} url={w.cover_url} />
                <div className="title" title={w.title}>{w.title}</div>
                <div className="author" title={w.author}>{w.author}</div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="genre g-7">{people(w.wanted)}</span>
                  {w.available > 0 && <span className="copies">{w.available} disponible{w.available === 1 ? "" : "s"}</span>}
                </div>
                {w.is_mine
                  ? <span className="chip s-disponible push">En tu lista</span>
                  : <Link className="btn sm push" href={user ? donateHref(w) : `/ingresar?next=${encodeURIComponent(donateHref(w))}`}>¡Lo tengo! Donarlo</Link>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
