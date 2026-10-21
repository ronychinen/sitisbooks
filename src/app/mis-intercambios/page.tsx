import Link from "next/link";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { STATUS_LABEL, fmtDT, soles, type Request } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabase, profile } = await requireProfile("/mis-intercambios");
  const { data } = await supabase.from("requests").select("*").or(`requester_id.eq.${profile.id},donor_id.eq.${profile.id}`).order("created_at", { ascending: false });
  const all = (data ?? []) as Request[];
  const asReq = all.filter((r) => r.requester_id === profile.id);
  const asDon = all.filter((r) => r.donor_id === profile.id);
  const Row = ({ r, role }: { r: Request; role: "req" | "don" }) => (
    <Link className="req" href={`/mis-intercambios/${r.id}`}>
      <BookCover title={r.book_title} url={r.book_cover} />
      <div><b>{r.book_title}</b><div className="muted" style={{ fontSize: 13 }}>
        {role === "req"
          ? (r.status === "pendiente_pago" ? `Paga ${soles(r.total)} para confirmar` : `Entrega: ${fmtDT(r.delivery_at)}`)
          : `Recojo: ${fmtDT(r.pickup_at)}`}
      </div></div>
      <span className={`chip s-${r.status}`}>{STATUS_LABEL[r.status]}</span>
    </Link>
  );
  return (
    <>
      <div className="split">
        <section className="stack"><h2>Libros que pediste</h2>
          {asReq.length ? <div className="list">{asReq.map((r) => <Row key={r.id} r={r} role="req" />)}</div>
            : <div className="empty"><p>Aún no pides libros. Tienes {profile.credits} crédito(s).</p><Link className="btn" href="/">Ver catálogo</Link></div>}
        </section>
        <section className="stack"><h2>Libros que donaste</h2>
          {asDon.length ? <div className="list">{asDon.map((r) => <Row key={r.id} r={r} role="don" />)}</div>
            : <div className="empty"><p>Cuando alguien pida uno de tus libros verás aquí la fecha de recojo.</p></div>}
        </section>
      </div>
      <p className="note" style={{ marginTop: 20 }}>Te escribiremos por WhatsApp al {profile.phone} para confirmar recojos y entregas.</p>
    </>
  );
}
