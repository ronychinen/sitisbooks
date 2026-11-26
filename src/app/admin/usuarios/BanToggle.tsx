"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BanToggle({ id, bannedAt, reason, isSelf }: { id: string; bannedAt: string | null; reason: string | null; isSelf: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run(banned: boolean) {
    setBusy(true); setMsg("");
    const { error } = await createClient().rpc("admin_set_ban", { p_user: id, p_banned: banned, p_reason: banned ? why : null });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setAsk(false); setWhy(""); router.refresh();
  }
  if (isSelf) return <span className="muted">—</span>;
  if (bannedAt) return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="chip s-cancelado" title={reason ?? ""}>Suspendida</span>
      <button className="linkbtn" disabled={busy} onClick={() => run(false)}>Reactivar</button>
      {msg && <span className="error">{msg}</span>}
    </div>
  );
  return ask ? (
    <div className="stack" style={{ gap: 6, minWidth: 220 }}>
      <input placeholder="Motivo (ej. no entregó el libro)" maxLength={300} value={why} onChange={(e) => setWhy(e.target.value)} />
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm danger" disabled={busy || !why.trim()} onClick={() => run(true)}>Suspender</button>
        <button className="btn sm ghost" onClick={() => setAsk(false)}>Cancelar</button>
      </div>
      {msg && <span className="error">{msg}</span>}
    </div>
  ) : <button className="linkbtn" onClick={() => setAsk(true)}>Suspender</button>;
}
