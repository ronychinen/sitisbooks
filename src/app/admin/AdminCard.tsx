"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_FLOW, STATUS_LABEL, fmtDT, soles, type Request } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { mapsLink } from "@/lib/googleMaps";

// Lima es UTC-5 todo el año (sin horario de verano)
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 5 * 3600e3).toISOString().slice(0, 16) : "");
const toISO = (local: string) => (local ? `${local}:00-05:00` : null);
const wa = (phone: string | undefined, text: string) => (phone ? `https://wa.me/51${phone}?text=${encodeURIComponent(text)}` : null);

type Addr = { label: string | null; address: string | null; reference: string | null; district: string; lat: number | null; lng: number | null };

function Party({ label, p, a }: { label: string; p: Profile | null; a: Addr }) {
  // Dirección elegida en el intercambio; si es un intercambio antiguo, la del perfil
  const address = a.address ?? p?.address ?? "—", reference = a.address ? a.reference : p?.reference;
  return (
    <div className="party">
      <span className="eyebrow">{label}</span>
      <span className="who">{p ? `${p.first_name} ${p.last_name}` : "Usuario sin perfil"}</span>
      <span>{a.label && <b>{a.label}: </b>}{address} · {a.district}</span>
      {reference && <span className="muted">Ref.: {reference}</span>}
      <a href={mapsLink(a.lat, a.lng, `${address}, ${a.district}, Lima, Perú`)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
        {a.lat != null ? "Ver ubicación exacta en Google Maps" : "Buscar en Google Maps"} ↗
      </a>
      <span className="ph">{p?.phone ?? "—"}</span>
      <span className="muted" style={{ fontSize: 13 }}>{p?.email}</span>
    </div>
  );
}

export default function AdminCard({ r, donor, requester, proofUrl }: { r: Request; donor: Profile | null; requester: Profile | null; proofUrl: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [pickup, setPickup] = useState(toLocal(r.pickup_at));
  const [delivery, setDelivery] = useState(toLocal(r.delivery_at));
  const [note, setNote] = useState(r.admin_note ?? "");
  const [reject, setReject] = useState("");
  const [askReject, setAskReject] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const closed = r.status === "entregado" || r.status === "cancelado";
  const next = ADMIN_FLOW[ADMIN_FLOW.indexOf(r.status as (typeof ADMIN_FLOW)[number]) + 1];
  const canCoordinate = (ADMIN_FLOW as readonly string[]).includes(r.status);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true); setMsg("");
    const { error } = await fn();
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg(ok); router.refresh();
  }
  const update = (status: string) =>
    run(() => supabase.rpc("admin_update_request", { p_request: r.id, p_status: status, p_pickup: toISO(pickup), p_delivery: toISO(delivery), p_note: note || null }),
      status === r.status ? "Cambios guardados" : status === "entregado" ? "Entregado. El donante recibió 1 crédito." : `Estado: ${STATUS_LABEL[status]}`);

  const dName = donor?.first_name ?? "", rName = requester?.first_name ?? "";
  const waDonor = wa(donor?.phone, `Hola ${dName}, te escribimos de Sitisbooks. Alguien pidió tu libro "${r.book_title}". ¿Podemos recogerlo el ${pickup ? fmtDT(toISO(pickup)) : "[fecha y hora]"} en ${r.pickup_address ?? donor?.address ?? "tu dirección"}?`);
  const waReq = wa(requester?.phone, `Hola ${rName}, te escribimos de Sitisbooks. Tu libro "${r.book_title}" llegará el ${delivery ? fmtDT(toISO(delivery)) : "[fecha y hora]"} a ${r.delivery_address ?? requester?.address ?? "tu dirección"}.`);

  return (
    <article className={`adm st-${r.status}`}>
      <div className="full row between" style={{ alignItems: "flex-start" }}>
        <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <div style={{ width: 44, flex: "none" }}><BookCover title={r.book_title} url={r.book_cover} /></div>
          <div><h3>{r.book_title}</h3><p className="muted" style={{ fontSize: 13 }}>{r.from_district} → {r.to_district} · Pedido {fmtDT(r.created_at)}</p></div>
        </div>
        <div className="row"><span className={`chip s-${r.status}`}>{STATUS_LABEL[r.status]}</span><span className="chip" style={{ color: "var(--ink)" }}>{soles(r.total)}</span></div>
      </div>

      <Party label="Donante · recojo" p={donor} a={{ label: r.pickup_label, address: r.pickup_address, reference: r.pickup_reference, district: r.from_district, lat: r.pickup_lat, lng: r.pickup_lng }} />
      <Party label="Solicitante · entrega" p={requester} a={{ label: r.delivery_label, address: r.delivery_address, reference: r.delivery_reference, district: r.to_district, lat: r.delivery_lat, lng: r.delivery_lng }} />

      {r.status === "pago_en_revision" && (
        <div className="full panel stack" style={{ padding: 14 }}>
          <b>Validar pago de {soles(r.total)} · {r.payment_method === "yape" ? "Yape" : "Transferencia"}{r.operation_code ? ` · Op. ${r.operation_code}` : ""}</b>
          {proofUrl ? (
            <div className="proof">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.proof_path?.toLowerCase().endsWith(".pdf") ? <a className="btn sm ghost" href={proofUrl} target="_blank" rel="noopener">Abrir comprobante (PDF)</a> : <a href={proofUrl} target="_blank" rel="noopener"><img src={proofUrl} alt="Comprobante de pago" /></a>}
            </div>
          ) : <p className="muted">Sin comprobante adjunto.</p>}
          {askReject ? (
            <div className="row">
              <input id={`rej-${r.id}`} placeholder="Motivo (lo verá el usuario)" value={reject} onChange={(e) => setReject(e.target.value)} style={{ flex: "1 1 240px" }} />
              <button className="btn sm danger" disabled={busy || !reject.trim()} onClick={() => run(() => supabase.rpc("admin_review_payment", { p_request: r.id, p_approve: false, p_note: reject.trim() }), "Pago observado")}>Observar pago</button>
              <button className="btn sm ghost" onClick={() => setAskReject(false)}>Volver</button>
            </div>
          ) : (
            <div className="row">
              <button className="btn sm" disabled={busy} onClick={() => run(() => supabase.rpc("admin_review_payment", { p_request: r.id, p_approve: true, p_note: null }), "Pago aprobado")}>Aprobar pago</button>
              <button className="btn sm danger" onClick={() => setAskReject(true)}>Observar</button>
            </div>
          )}
        </div>
      )}

      {canCoordinate && (
        <>
          <div className="full ctrl">
            <label>Recojo (fecha y hora)<input type="datetime-local" id={`pk-${r.id}`} value={pickup} onChange={(e) => setPickup(e.target.value)} /></label>
            <label>Entrega (fecha y hora)<input type="datetime-local" id={`dl-${r.id}`} value={delivery} onChange={(e) => setDelivery(e.target.value)} /></label>
            <label>Nota interna<input id={`nt-${r.id}`} maxLength={140} placeholder="Motorizado, referencia…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>
          <div className="full row between">
            <div className="row">
              {waDonor && <a className="btn sm ghost" href={waDonor} target="_blank" rel="noopener">WhatsApp donante</a>}
              {waReq && <a className="btn sm ghost" href={waReq} target="_blank" rel="noopener">WhatsApp solicitante</a>}
            </div>
            <div className="row">
              <button className="btn sm ghost" disabled={busy} onClick={() => update(r.status)}>Guardar</button>
              {next && <button className="btn sm" disabled={busy} onClick={() => update(next)}>Marcar: {STATUS_LABEL[next]}</button>}
            </div>
          </div>
        </>
      )}

      {!closed && (
        <div className="full row">
          {askCancel ? (
            <><span className="muted">El libro vuelve al catálogo y el solicitante recupera su crédito. El reembolso del pago se hace fuera de la web.</span>
              <button className="btn sm danger" disabled={busy} onClick={() => update("cancelado")}>Sí, cancelar</button>
              <button className="btn sm ghost" onClick={() => setAskCancel(false)}>Volver</button></>
          ) : <button className="linkbtn" onClick={() => setAskCancel(true)}>Cancelar intercambio</button>}
        </div>
      )}
      {closed && <p className="full muted" style={{ fontSize: 13 }}>Recojo {fmtDT(r.pickup_at)} · Entrega {fmtDT(r.delivery_at)}{r.admin_note ? ` · ${r.admin_note}` : ""}</p>}
      {msg && <p className="full note">{msg}</p>}
    </article>
  );
}
