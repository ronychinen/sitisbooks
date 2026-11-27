"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NpsForm({ requestId, initialScore, initialComment, answered }: { requestId: string; initialScore: number | null; initialComment: string; answered: boolean }) {
  const [score, setScore] = useState<number | null>(initialScore);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!score) { setError("Elige una nota del 1 al 10."); return; }
    setBusy(true); setError("");
    const { error } = await createClient().rpc("submit_nps", { p_request: requestId, p_score: score, p_comment: comment });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) return (
    <div className="stack" style={{ textAlign: "center", alignItems: "center" }}>
      <h3 style={{ margin: 0 }}>¡Gracias por tu respuesta!</h3>
      <p className="muted" style={{ margin: 0 }}>Nos ayuda a mejorar Sitisbooks para todos los lectores.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn" href="/donar">Donar un libro</Link>
        <Link className="btn ghost" href="/">Ver catálogo</Link>
      </div>
    </div>
  );

  const hint = score == null ? "" : score >= 9 ? "¡Genial! ¿Qué es lo que más te gustó?" : score >= 7 ? "¿Qué nos faltó para un 10?" : "Lamentamos que no haya sido una buena experiencia. ¿Qué podemos mejorar?";
  return (
    <form className="stack" onSubmit={submit}>
      <b style={{ fontSize: 16 }}>Del 1 al 10, ¿cómo te ha parecido el servicio de Sitisbooks?</b>
      <div className="nps-scale" role="radiogroup" aria-label="Nota del 1 al 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} role="radio" aria-checked={score === n} className={`nps-n${score === n ? " on" : ""}`} onClick={() => { setScore(n); setError(""); }}>{n}</button>
        ))}
      </div>
      <div className="nps-legend muted"><span>1 · Muy malo</span><span>10 · Excelente</span></div>
      <label>{hint || "Cuéntanos más (opcional)"}
        <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Opcional" />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? "Enviando…" : answered ? "Actualizar respuesta" : "Enviar respuesta"}</button>
    </form>
  );
}
