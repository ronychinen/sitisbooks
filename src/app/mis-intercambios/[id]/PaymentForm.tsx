"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { soles } from "@/lib/constants";

export default function PaymentForm({ requestId, total }: { requestId: string; total: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [method, setMethod] = useState<"yape" | "transferencia">("yape");
  const [op, setOp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelAsk, setCancelAsk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Adjunta la captura o foto de tu comprobante."); return; }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setError("El comprobante debe ser una imagen o PDF."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("El archivo pesa más de 8 MB."); return; }
    setBusy(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user!.id}/${requestId}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("comprobantes").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); setError("No pudimos subir el comprobante. Inténtalo de nuevo."); return; }
    const { error } = await supabase.rpc("submit_payment", { p_request: requestId, p_method: method, p_operation: op, p_proof: path });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="subtabs" role="radiogroup" aria-label="Método de pago">
        <button type="button" aria-pressed={method === "yape"} onClick={() => setMethod("yape")}>Yape</button>
        <button type="button" aria-pressed={method === "transferencia"} onClick={() => setMethod("transferencia")}>Transferencia</button>
      </div>
      <div className="grid2">
        <label>N.º de operación (opcional)<input id="op" maxLength={40} value={op} onChange={(e) => setOp(e.target.value)} /></label>
        <label>Comprobante (imagen o PDF)<input id="proof" type="file" accept="image/*,application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Enviando…" : `Enviar comprobante de ${soles(total)}`}</button>
      {cancelAsk ? (
        <div className="row"><span className="muted">¿Cancelar el pedido? Recuperas tu crédito.</span>
          <button type="button" className="btn sm danger" onClick={async () => { await supabase.rpc("cancel_my_request", { p_request: requestId }); router.refresh(); }}>Sí, cancelar</button>
          <button type="button" className="btn sm ghost" onClick={() => setCancelAsk(false)}>No</button></div>
      ) : <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setCancelAsk(true)}>Cancelar pedido</button>}
    </form>
  );
}
