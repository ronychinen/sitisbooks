import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { STATUS_LABEL, fmtDT, soles, type Request, type Settings } from "@/lib/constants";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";
const STEPS = ["pendiente_pago", "pago_en_revision", "pagado", "coordinando", "en_camino", "entregado"];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile(`/mis-intercambios/${id}`);
  const [{ data }, { data: settings }] = await Promise.all([
    supabase.from("requests").select("*").eq("id", id).maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!data) notFound();
  const r = data as Request, s = settings as Settings | null;
  const isReq = r.requester_id === profile.id;
  const idx = STEPS.indexOf(r.status);

  return (
    <div className="stack" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href="/mis-intercambios" className="muted" style={{ fontSize: 14 }}>← Mis intercambios</Link>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap", gap: 18 }}>
        <div style={{ width: 96, flex: "none" }}><BookCover title={r.book_title} url={r.book_cover} /></div>
        <div className="stack" style={{ gap: 6 }}>
          <p className="eyebrow">{isReq ? "Libro que pediste" : "Libro que donas"}</p>
          <h2>{r.book_title}</h2>
          <span className={`chip s-${r.status}`} style={{ alignSelf: "flex-start" }}>{STATUS_LABEL[r.status]}</span>
        </div>
      </div>

      {r.status !== "cancelado" && (
        <ol className="panel" style={{ margin: 0, paddingLeft: 36, display: "grid", gap: 6 }}>
          {STEPS.map((st, i) => (
            <li key={st} style={{ color: i <= idx ? "var(--ink)" : "var(--muted)", fontWeight: i === idx ? 700 : 400 }}>
              {STATUS_LABEL[st]}
              {st === "coordinando" && r.pickup_at && <span className="muted"> · recojo {fmtDT(r.pickup_at)}</span>}
              {st === "en_camino" && r.delivery_at && <span className="muted"> · entrega {fmtDT(r.delivery_at)}</span>}
            </li>
          ))}
        </ol>
      )}

      {isReq && (
        <div className="panel cost">
          <span>Delivery {r.from_district} → {r.to_district}</span><span className="n">{soles(r.delivery_fee)}</span>
          <span>Comisión Sitisbooks</span><span className="n">{soles(r.platform_fee)}</span>
          <span className="tot">Total</span><span className="n tot">{soles(r.total)}</span>
        </div>
      )}

      {isReq && r.status === "pendiente_pago" && (
        <section className="panel stack">
          <h3>Paga y sube tu comprobante</h3>
          {r.payment_note && <p className="error">Tu comprobante anterior fue observado: {r.payment_note}</p>}
          <div className="grid2">
            <div className="party"><span className="eyebrow">Yape</span>
              {s?.yape_number ? <><span className="ph">{s.yape_number}</span><span>{s.yape_holder}</span></> : <span className="muted">Pronto publicaremos el número.</span>}
            </div>
            <div className="party"><span className="eyebrow">Transferencia</span>
              {s?.bank_info ? <span style={{ whiteSpace: "pre-line", userSelect: "all" }}>{s.bank_info}</span> : <span className="muted">Pronto publicaremos la cuenta.</span>}
            </div>
          </div>
          <PaymentForm requestId={r.id} total={Number(r.total)} />
        </section>
      )}
      {isReq && r.status === "pago_en_revision" && <p className="note">Recibimos tu comprobante. Lo validamos y te escribimos por WhatsApp para coordinar la entrega.</p>}
      {!isReq && <p className="note">Te escribiremos por WhatsApp al {profile.phone} para coordinar el recojo en tu dirección.</p>}
      {r.status === "cancelado" && <p className="muted">Este intercambio fue cancelado.{isReq && " Tu crédito fue devuelto."}</p>}
    </div>
  );
}
