"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { soles } from "@/lib/constants";
import FileDrop from "@/components/FileDrop";

const PACKS = [1, 3, 5, 10];

export default function BuyCreditsForm({ price }: { price: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const total = Math.round(price * qty * 100) / 100;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Adjunta la captura o foto de tu comprobante."); return; }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setError("El comprobante debe ser una imagen o PDF."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("El archivo pesa más de 8 MB."); return; }
    setBusy(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user!.id}/creditos-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("comprobantes").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); setError("No pudimos subir el comprobante. Inténtalo de nuevo."); return; }
    const { error } = await supabase.rpc("buy_credits", { p_quantity: qty, p_method: null, p_operation: null, p_proof: path });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true); setFile(null);
    router.refresh();
  }

  if (done) return (
    <div className="stack">
      <p className="note">Recibimos tu comprobante. Validamos el pago y sumamos tus créditos; normalmente en menos de 24 horas.</p>
      <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setDone(false)}>Hacer otra compra</button>
    </div>
  );

  return (
    <form className="stack" onSubmit={submit}>
      <div className="stack" style={{ gap: 8 }}>
        <b style={{ fontSize: 14 }}>¿Cuántos créditos?</b>
        <div className="row" style={{ gap: 8 }}>
          {PACKS.map((n) => (
            <button type="button" key={n} className={`opt${qty === n ? " on" : ""}`} aria-pressed={qty === n} onClick={() => setQty(n)}>
              {n} {n === 1 ? "crédito" : "créditos"}
            </button>
          ))}
        </div>
      </div>
      <div className="panel cost">
        <span>{qty} × {soles(price)}</span><span className="n">{soles(total)}</span>
        <span className="tot">Total a pagar</span><span className="n tot">{soles(total)}</span>
      </div>
      <FileDrop file={file} onChange={(f) => { setFile(f); setError(""); }} />
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Enviando…" : `Enviar comprobante de ${soles(total)}`}</button>
    </form>
  );
}
