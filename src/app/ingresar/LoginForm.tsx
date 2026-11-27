"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

type Mode = "login" | "signup" | "reset";
type Step = "form" | "code" | "password";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const mail = email.trim().toLowerCase();

  function go(m: Mode) { setMode(m); setStep("form"); setError(""); setInfo(""); setCode(""); setPassword(""); setPassword2(""); }

  async function finish(userId: string) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    router.replace(profile ? next : `/perfil?bienvenida=1&next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password });
    if (error || !data.user) {
      setBusy(false);
      setError(error?.status === 429 ? "Demasiados intentos. Espera un minuto e inténtalo otra vez."
        : "Correo o contraseña incorrectos. Si aún no creaste tu contraseña, usa “¿Olvidaste tu contraseña?”.");
      return;
    }
    await finish(data.user.id);
  }

  // Registro y recuperación: código al correo para validar que es tuyo
  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const { error } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: mode === "signup" } });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Pediste muchos códigos seguidos. Espera un minuto e inténtalo otra vez."
        : mode === "reset" ? "No encontramos una cuenta con ese correo. Revisa que esté bien escrito o crea una cuenta."
        : "No pudimos enviar el código. Revisa que el correo esté bien escrito.");
      return;
    }
    setStep("code");
    setInfo(`Te enviamos un código a ${mail}. Revisa también tu carpeta de spam.`);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data, error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: "email" });
    setBusy(false);
    if (error || !data.user) { setError("El código no es válido o ya venció. Pide uno nuevo."); return; }
    setStep("password");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true); setError("");
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) {
      setBusy(false);
      setError(/same|different/i.test(error?.message ?? "") ? "Elige una contraseña distinta a la anterior." : "No pudimos guardar la contraseña. Inténtalo otra vez.");
      return;
    }
    await finish(data.user.id);
  }

  const tabs = (
    <div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => go("login")}>Ingresar</button>
      <button type="button" role="tab" aria-selected={mode !== "login"} onClick={() => go("signup")}>Crear cuenta</button>
    </div>
  );

  if (step === "code") return (
    <form className="stack" onSubmit={verify}>
      <div>
        <p className="eyebrow">{mode === "signup" ? "Paso 1 de 2 · Verifica tu correo" : "Recupera tu contraseña"}</p>
        <h2>Ingresa el código</h2>
        <p className="muted" style={{ marginTop: 6 }}>{info}</p>
      </div>
      <label>Código
        <input id="code" className="otp" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" autoFocus />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy || code.length < 6}>{busy ? "Verificando…" : "Verificar"}</button>
      <div className="row between">
        <button type="button" className="linkbtn" onClick={() => { setStep("form"); setCode(""); setError(""); }}>Cambiar correo</button>
        <button type="button" className="linkbtn" disabled={busy} onClick={() => sendCode()}>Reenviar código</button>
      </div>
    </form>
  );

  if (step === "password") return (
    <form className="stack" onSubmit={savePassword}>
      <div>
        <p className="eyebrow">{mode === "signup" ? "Paso 2 de 2" : "Recupera tu contraseña"}</p>
        <h2>{mode === "signup" ? "Crea tu contraseña" : "Elige una nueva contraseña"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>Con ella entrarás la próxima vez, sin códigos. Mínimo 8 caracteres.</p>
      </div>
      <input type="email" autoComplete="username" value={mail} readOnly hidden />
      <label>Contraseña<PasswordInput id="pw1" autoComplete="new-password" value={password} onChange={setPassword} autoFocus /></label>
      <label>Repite la contraseña<PasswordInput id="pw2" autoComplete="new-password" value={password2} onChange={setPassword2} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Guardando…" : mode === "signup" ? "Crear cuenta" : "Guardar y entrar"}</button>
    </form>
  );

  if (mode === "login") return (
    <form className="stack" onSubmit={login}>
      {tabs}
      <div>
        <h2>Entra a tu cuenta</h2>
        <p className="muted" style={{ marginTop: 6 }}>Usa tu correo y contraseña.</p>
      </div>
      <label>Correo electrónico
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
      </label>
      <label>Contraseña<PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      <div className="row between">
        <button type="button" className="linkbtn" onClick={() => go("reset")}>¿Olvidaste tu contraseña?</button>
        <button type="button" className="linkbtn" onClick={() => go("signup")}>Crear una cuenta</button>
      </div>
    </form>
  );

  return (
    <form className="stack" onSubmit={sendCode}>
      {mode === "signup" ? tabs : null}
      <div>
        {mode === "reset" && <p className="eyebrow">Recupera tu contraseña</p>}
        <h2>{mode === "signup" ? "Crea tu cuenta" : "¿Olvidaste tu contraseña?"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          {mode === "signup" ? "Te enviaremos un código para confirmar que el correo es tuyo y luego creas tu contraseña. Recibes 1 crédito de bienvenida."
            : "Te enviaremos un código a tu correo para que elijas una nueva contraseña."}
        </p>
      </div>
      <label>Correo electrónico
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Enviando…" : "Enviar código"}</button>
      <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => go("login")}>
        {mode === "signup" ? "¿Ya tienes cuenta? Ingresa" : "Volver a ingresar"}
      </button>
    </form>
  );
}
