import Link from "next/link";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { STATUS_LABEL, fmtD, fmtDT, soles, type MyRequest } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const view = v === "historial" ? "historial" : "en-curso";
  const { supabase, profile } = await requireProfile("/mis-intercambios");
  const { data } = await supabase.from("my_requests").select("*").order("created_at", { ascending: false });
  const all = (data ?? []) as MyRequest[];
  const active = all.filter((r) => r.status !== "entregado" && r.status !== "cancelado");
  const history = all.filter((r) => r.status === "entregado")
    .sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? ""));
  const donated = history.filter((r) => r.role === "donado");
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

  const HistoryList = ({ items, empty }: { items: MyRequest[]; empty: string }) =>
    items.length === 0 ? <div className="empty"><p>{empty}</p></div> : (
      <div className="list">
        {items.map((r) => (
          <Link className="req" key={r.id} href={`/mis-intercambios/${r.id}`}>
            <BookCover title={r.book_title} url={r.book_cover} />
            <div><b>{r.book_title}</b><div className="muted" style={{ fontSize: 13 }}>{r.role === "donado" ? "Donado" : "Recibido"} el {fmtD(r.delivered_at)}</div></div>
            <span className="chip s-entregado">{r.role === "donado" ? "+1 crédito" : "Entregado"}</span>
          </Link>
        ))}
      </div>
    );

  return (
    <div className="stack">
      <div className="row between">
        <h2>Mis intercambios</h2>
        <div className="subtabs" style={{ margin: 0 }}>
          <Link href="/mis-intercambios" aria-current={view === "en-curso" ? "page" : undefined}>En curso<span className="c">{active.length}</span></Link>
          <Link href="/mis-intercambios?v=historial" aria-current={view === "historial" ? "page" : undefined}>Historial<span className="c">{history.length}</span></Link>
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
      ) : (
        <>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", marginBottom: 0 }}>
            <div className="kpi"><span>Libros donados</span><b>{donated.length}</b></div>
            <div className="kpi"><span>Libros recibidos</span><b>{received.length}</b></div>
            <div className="kpi"><span>Créditos disponibles</span><b>{profile.credits}</b></div>
          </div>
          <div className="split">
            <section className="stack"><h3>Donados</h3><HistoryList items={donated} empty="Cuando un libro tuyo llegue a su nuevo lector aparecerá aquí con la fecha." /></section>
            <section className="stack"><h3>Recibidos</h3><HistoryList items={received} empty="Los libros que recibas aparecerán aquí con la fecha de entrega." /></section>
          </div>
        </>
      )}
    </div>
  );
}
