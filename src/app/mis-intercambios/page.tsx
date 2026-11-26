import Link from "next/link";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import WithdrawButton from "../donar/WithdrawButton";
import { STATUS_LABEL, fmtD, fmtDT, soles, type MyBook, type MyRequest } from "@/lib/constants";

export const metadata = { title: "Mis intercambios", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const view = v === "recibidos" || v === "historial" ? "recibidos" : v === "publicados" ? "publicados" : "en-curso";
  const { supabase, profile } = await requireProfile("/mis-intercambios");
  const [{ data }, { data: booksData }] = await Promise.all([
    supabase.from("my_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("my_books").select("*").order("created_at", { ascending: false }),
  ]);
  const all = (data ?? []) as MyRequest[];
  const books = (booksData ?? []) as MyBook[];
  const active = all.filter((r) => r.status !== "entregado" && r.status !== "cancelado");
  const history = all.filter((r) => r.status === "entregado")
    .sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? ""));
  const received = history.filter((r) => r.role === "recibido");

  const ActiveRow = ({ r }: { r: MyRequest }) => (
    <Link className="req" href={`/mis-intercambios/${r.id}`}>
      <BookCover title={r.book_title} url={r.book_cover} />
      <div><b>{r.book_title}</b><div className="muted" style={{ fontSize: 13 }}>
        {r.role === "recibido"
          ? (r.status === "pendiente_pago" ? `Paga ${soles(r.total)} para confirmar` : `Entrega: ${fmtDT(r.delivery_at)}`)
          : `Recojo: ${fmtDT(r.pickup_at)}`}
      </div></div>
      <span className={`chip s-${r.status}`}>{STATUS_LABEL[r.status]}</span>
    </Link>
  );

  const BOOK_LABEL: Record<string, string> = { disponible: "Disponible", reservado: "Reservado", entregado: "Donado" };
  const donatedCount = books.filter((b) => b.status === "entregado").length;

  return (
    <div className="stack">
      <div className="row between">
        <h2>Mis intercambios</h2>
        <div className="subtabs" style={{ margin: 0 }}>
          <Link href="/mis-intercambios" aria-current={view === "en-curso" ? "page" : undefined}>En curso<span className="c">{active.length}</span></Link>
          <Link href="/mis-intercambios?v=recibidos" aria-current={view === "recibidos" ? "page" : undefined}>Recibidos<span className="c">{received.length}</span></Link>
          <Link href="/mis-intercambios?v=publicados" aria-current={view === "publicados" ? "page" : undefined}>Publicados<span className="c">{books.length}</span></Link>
        </div>
      </div>

      {view === "en-curso" ? (
        <>
          {active.length === 0 ? (
            <div className="empty"><h3>No tienes intercambios en curso</h3><p>Tienes {profile.credits} crédito(s) para pedir un libro.</p>
              <div className="row"><Link className="btn" href="/">Ver catálogo</Link><Link className="btn ghost" href="/donar">Donar un libro</Link></div></div>
          ) : <div className="list">{active.map((r) => <ActiveRow key={r.id} r={r} />)}</div>}
          <p className="note">Sitisbooks coordina contigo por WhatsApp al {profile.phone}. Tus datos nunca se comparten con otros usuarios.</p>
        </>
      ) : view === "recibidos" ? (
        received.length === 0 ? (
          <div className="empty"><h3>Aún no recibes libros</h3><p>Los libros que recibas aparecerán aquí con la fecha de entrega.</p>
            <div className="row"><Link className="btn" href="/">Ver catálogo</Link></div></div>
        ) : (
          <div className="list">
            {received.map((r) => (
              <Link className="req" key={r.id} href={`/mis-intercambios/${r.id}`}>
                <BookCover title={r.book_title} url={r.book_cover} />
                <div><b>{r.book_title}</b><div className="muted" style={{ fontSize: 13 }}>Recibido el {fmtD(r.delivered_at)}</div></div>
                <span className="chip s-entregado">Entregado</span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>{books.length} publicado(s) · {donatedCount} donado(s). Ganas 1 crédito por cada libro que llega a su nuevo lector.</p>
          {books.length === 0 ? (
            <div className="empty"><h3>Todavía no publicas libros</h3><p>Publica los libros que ya leíste y gana créditos.</p>
              <div className="row"><Link className="btn" href="/donar">Donar un libro</Link></div></div>
          ) : (
            <div className="list">
              {books.map((b) => (
                <div className="req" key={b.id}>
                  <BookCover title={b.title} url={b.cover_url} />
                  <div><b>{b.title}</b><div className="muted" style={{ fontSize: 13 }}>{b.author} · Publicado el {fmtD(b.created_at)}</div></div>
                  <div className="row">
                    <span className={`chip s-${b.status}`}>{b.status === "entregado" ? "Donado · +1 crédito" : BOOK_LABEL[b.status] ?? b.status}</span>
                    {b.status === "disponible" && <WithdrawButton id={b.id} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
