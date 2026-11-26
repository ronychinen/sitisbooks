"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PURCHASE_LABEL, fmtDT, soles, type CreditPurchase } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/server";

export default function PurchaseCard({ c, user, proofUrl }: { c: CreditPurchase; user: Profile | null; proofUrl: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [askReject, setAskReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function review(approve: boolean) {
    if (!approve && !note.trim()) { setMsg("Escribe el motivo del rechazo."); return; }
    setBusy(true); setMsg("");
    const { error } = await createClient().rpc("admin_review_credit_purchase", { p_purchase: c.id, p_approve: approve, p_note: note });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    router.refresh();
  }

  return (
    <article className={`adm st-${c.status === "aprobado" ? "entregado" : c.status === "rechazado" ? "cancelado" : "pago_en_revision"}`}>
      <div className="full row between" style={{ alignItems: "flex-start" }}>
        <div>
          <h3>{c.quantity} {c.quantity === 1 ? "crédito" : "créditos"} · {soles(c.total)}</h3>
          <p className="muted" style={{ fontSize: 13 }}>{soles(c.unit_price)} c/u · {c.payment_method === "yape" ? "Yape" : "Transferencia"}{c.operation_code ? ` · Op. ${c.operation_code}` : ""} · {fmtDT(c.created_at)}</p>
        </div>
        <span className={`chip pc-${c.status}`}>{PURCHASE_LABEL[c.status]}</span>
      </div>
      <div className="party">
        <span className="eyebrow">Comprador</span>
        <span className="who">{user ? `${user.first_name} ${user.last_name}` : "Usuario"}</span>
        <span className="ph">{user?.phone ?? "—"}</span>
        <span className="muted" style={{ fontSize: 13 }}>{user?.email} · {user?.credits ?? 0} créditos actuales</span>
      </div>
      <div className="party">
        <span className="eyebrow">Comprobante</span>
        {proofUrl ? <a href={proofUrl} target="_blank" rel="noopener noreferrer">Ver comprobante ↗</a> : <span className="muted">No disponible</span>}
        {c.admin_note && <span className="muted">Nota: {c.admin_note}</span>}
      </div>
      {c.status === "pago_en_revision" && (
        <div className="full stack" style={{ gap: 8 }}>
          {askReject && <label>Motivo del rechazo (lo ve el usuario)<input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="El monto no coincide, comprobante ilegible…" /></label>}
          <div className="row">
            {!askReject && <button className="btn sm" disabled={busy} onClick={() => review(true)}>Aprobar y sumar {c.quantity} {c.quantity === 1 ? "crédito" : "créditos"}</button>}
            {askReject
              ? <><button className="btn sm danger" disabled={busy} onClick={() => review(false)}>Confirmar rechazo</button><button className="btn sm ghost" onClick={() => setAskReject(false)}>Volver</button></>
              : <button className="btn sm ghost" disabled={busy} onClick={() => setAskReject(true)}>Rechazar</button>}
          </div>
          {msg && <p className="error">{msg}</p>}
        </div>
      )}
    </article>
  );
}
