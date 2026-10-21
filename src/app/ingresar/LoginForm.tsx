"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(error.status === 429
        ? "Pediste muchos códigos seguidos. Espera un minuto e inténtalo otra vez."
        : "No pudimos enviar el código. Revisa que el correo esté bien escrito.");
      return;
    }
    setStep("code");
    setInfo(`Te enviamos un código a ${email.trim().toLowerCase()}. Revisa también tu carpeta de spam.`);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    if (error || !data.user) {
      setBusy(false);
      setError("El código no es válido o ya venció. Pide uno nuevo.");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    router.replace(profile ? next : `/perfil?bienvenida=1&next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form className="stack" onSubmit={sendCode}>
        <div>
          <p className="eyebrow">Ingresa o crea tu cuenta</p>
          <h2>Entra con tu correo</h2>
          <p className="muted" style={{ marginTop: 6 }}>Te enviaremos un código de un solo uso. No necesitas contraseña.</p>
        </div>
        <label>Correo electrónico
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Enviando…" : "Enviar código"}</button>
      </form>
    );
  }
  return (
    <form className="stack" onSubmit={verify}>
      <div>
        <p className="eyebrow">Verifica tu correo</p>
        <h2>Ingresa el código</h2>
        <p className="muted" style={{ marginTop: 6 }}>{info}</p>
      </div>
      <label>Código
        <input id="code" className="otp" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" autoFocus />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy || code.length < 6}>{busy ? "Verificando…" : "Verificar y entrar"}</button>
      <div className="row between">
        <button type="button" className="linkbtn" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Cambiar correo</button>
        <button type="button" className="linkbtn" disabled={busy} onClick={() => sendCode()}>Reenviar código</button>
      </div>
    </form>
  );
}
