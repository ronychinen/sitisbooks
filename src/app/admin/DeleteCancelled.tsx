"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Elimina definitivamente pedidos cancelados (uno o todos) y sus comprobantes. */
export default function DeleteCancelled({ ids, all = false }: { ids: string[]; all?: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const n = ids.length;

  async function run() {
    setBusy(true); setErr("");
    const sb = createClient();
    const { data, error } = await sb.rpc("admin_delete_cancelled", { p_ids: ids });
    if (error) { setBusy(false); setErr("No se pudo eliminar. ¿Ya corriste el schema.sql?"); return; }
    const paths = (data ?? []) as string[];
    if (paths.length) await sb.storage.from("comprobantes").remove(paths);
    setBusy(false); setAsk(false);
    router.refresh();
  }

  if (!ask) return (
    <button type="button" className={all ? "btn sm danger" : "linkbtn"} style={{ alignSelf: "flex-start", color: all ? undefined : "var(--bad)" }} onClick={() => setAsk(true)}>
      {all ? `Eliminar todos los cancelados (${n})` : "Eliminar del historial"}
    </button>
  );
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="muted" style={{ fontSize: 13 }}>
        {all ? `¿Eliminar ${n} pedido(s) cancelado(s)?` : "¿Eliminar este pedido?"} Se borran definitivamente, con su comprobante. No se puede deshacer.
      </span>
      <button type="button" className="btn sm danger" disabled={busy} onClick={run}>{busy ? "Eliminando…" : "Sí, eliminar"}</button>
      <button type="button" className="btn sm ghost" disabled={busy} onClick={() => setAsk(false)}>No</button>
      {err && <span className="error">{err}</span>}
    </div>
  );
}
