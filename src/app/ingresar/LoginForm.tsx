"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import GoogleButton, { GOOGLE_CLIENT_ID } from "@/components/GoogleButton";

type Mode = "login" | "signup" | "reset";

// Google: botón oficial dentro de sitisbooks.com si hay ID de cliente; si no, el redireccionamiento clásico
const GOOGLE_LOGIN = true;
type Step = "form" | "code" | "password";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(sp.get("error") ?? "");
  const [info, setInfo] = useState("");
  const [userId, setUserId] = useState("");
  const mail = email.trim().toLowerCase();

  function go(m: Mode) { setMode(m); setStep("form"); setError(""); setInfo(""); setCode(""); setPassword(""); setPassword2(""); }

  async function finish(userId: string) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    router.replace(profile ? next : `/perfil?bienvenida=1&next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  async function google() {
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
    });
    if (error) { setBusy(false); setError("No pudimos abrir el ingreso con Google. Inténtalo otra vez."); }
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
    setUserId(data.user.id);
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

  const googleBtn = !GOOGLE_LOGIN ? null : (
    <>
      {GOOGLE_CLIENT_ID ? (
        <GoogleButton onSignedIn={(id) => { setBusy(true); finish(id); }} onError={setError} oneTap={mode === "login"} />
      ) : (
        <button type="button" className="btn ghost google" onClick={google} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continuar con Google
        </button>
      )}
      <div className="or"><span>o con tu correo</span></div>
    </>
  );

  const tabs = (
    <div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => go("login")}>Ingresar</button>
      <button type="button" role="tab" aria-selected={mode !== "login"} onClick={() => go("signup")}>Crear cuenta</button>
    </div>
  );

  if (step === "code") return (
    <form className="stack" onSubmit={verify}>
      <div>
        <p className="eyebrow">{mode === "signup" ? "Paso 1 de 2 · Verifica tu correo" : "Entra con un código"}</p>
        <h2>Ingresa el código</h2>
        <p className="muted" style={{ marginTop: 6 }}>{info}</p>
      </div>
      <label>Código
        <input id="code" className="otp" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" autoFocus />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy || code.length < 6}>{busy ? "Verificando…" : mode === "reset" ? "Entrar" : "Verificar"}</button>
      <div className="row between">
        <button type="button" className="linkbtn" onClick={() => { setStep("form"); setCode(""); setError(""); }}>Cambiar correo</button>
        <button type="button" className="linkbtn" disabled={busy} onClick={() => sendCode()}>Reenviar código</button>
      </div>
    </form>
  );

  if (step === "password") return (
    <form className="stack" onSubmit={savePassword}>
      <div>
        <p className="eyebrow">{mode === "signup" ? "Paso 2 de 2" : "¡Listo, ya ingresaste!"}</p>
        <h2>{mode === "signup" ? "Crea tu contraseña" : "¿Quieres crear una nueva contraseña?"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>Con ella entrarás la próxima vez, sin códigos. Mínimo 8 caracteres.</p>
      </div>
      <input type="email" autoComplete="username" value={mail} readOnly hidden />
      <label>Contraseña<PasswordInput id="pw1" autoComplete="new-password" value={password} onChange={setPassword} autoFocus /></label>
      <label>Repite la contraseña<PasswordInput id="pw2" autoComplete="new-password" value={password2} onChange={setPassword2} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Guardando…" : mode === "signup" ? "Crear cuenta" : "Guardar y continuar"}</button>
      {mode === "reset" && <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => finish(userId)}>Ahora no, continuar sin contraseña</button>}
    </form>
  );

  if (mode === "login") return (
    <form className="stack" onSubmit={login}>
      {tabs}
      <h2 style={{ margin: 0 }}>Entra a tu cuenta</h2>
      {googleBtn}
      <label>Correo electrónico
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
      </label>
      <label>Contraseña<PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      <div className="row between">
        <button type="button" className="linkbtn" onClick={() => go("reset")}>¿Olvidaste tu contraseña? Entra con un código</button>
        <button type="button" className="linkbtn" onClick={() => go("signup")}>Crear una cuenta</button>
      </div>
    </form>
  );

  return (
    <form className="stack" onSubmit={sendCode}>
      {mode === "signup" ? tabs : null}
      {mode === "signup" && googleBtn}
      <div>
        {mode === "reset" && <p className="eyebrow">Ingreso sin contraseña</p>}
        <h2>{mode === "signup" ? "Crea tu cuenta" : "Entra con un código"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          {mode === "signup" ? "Te enviaremos un código para confirmar que el correo es tuyo y luego creas tu contraseña. Recibes 1 crédito de bienvenida."
            : "¿Olvidaste tu contraseña? Te enviaremos un código a tu correo para entrar. Luego puedes crear una nueva, si quieres."}
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
