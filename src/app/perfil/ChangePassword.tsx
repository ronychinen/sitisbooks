"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePassword({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setMsg({ ok: false, text: "La contraseña debe tener al menos 8 caracteres." }); return; }
    if (pw !== pw2) { setMsg({ ok: false, text: "Las contraseñas no coinciden." }); return; }
    setBusy(true); setMsg(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: /reauth/i.test(error.message) ? "Por seguridad, cierra sesión y usa “¿Olvidaste tu contraseña?” al ingresar." : /same|different/i.test(error.message) ? "Elige una contraseña distinta a la actual." : "No pudimos guardar la contraseña. Inténtalo otra vez." });
      return;
    }
    setPw(""); setPw2(""); setOpen(false);
    setMsg({ ok: true, text: "Contraseña actualizada. Úsala la próxima vez que ingreses." });
  }

  return (
    <section className="stack" style={{ gap: 10, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
      <div className="row between">
        <div><b>Contraseña</b><div className="muted" style={{ fontSize: 13 }}>Para entrar con {email} sin códigos.</div></div>
        {!open && <button type="button" className="btn ghost sm" onClick={() => { setOpen(true); setMsg(null); }}>Cambiar contraseña</button>}
      </div>
      {open && (
        <form className="stack" onSubmit={save}>
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <label>Nueva contraseña<PasswordInput id="npw1" autoComplete="new-password" value={pw} onChange={setPw} autoFocus /></label>
          <label>Repite la contraseña<PasswordInput id="npw2" autoComplete="new-password" value={pw2} onChange={setPw2} /></label>
          <div className="row">
            <button className="btn sm" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
            <button type="button" className="btn ghost sm" onClick={() => { setOpen(false); setPw(""); setPw2(""); setMsg(null); }}>Cancelar</button>
          </div>
        </form>
      )}
      {msg && <p className={msg.ok ? "note" : "error"} style={{ margin: 0 }}>{msg.text}</p>}
    </section>
  );
}
