"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TERMS_VERSION } from "@/lib/terms";

export default function AcceptForm({ next }: { next: string }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) { setError("Marca la casilla para continuar."); return; }
    setBusy(true); setError("");
    const { error } = await createClient().rpc("accept_terms", { p_version: TERMS_VERSION });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.replace(next); router.refresh();
  }
  return (
    <form className="stack" onSubmit={accept}>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); setError(""); }} />
        <span>Leí y acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos y condiciones</a> y la <a href="/terminos#privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.</span>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Guardando…" : "Aceptar y continuar"}</button>
    </form>
  );
}
