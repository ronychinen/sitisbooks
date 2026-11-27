"use client";
import { useState } from "react";

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export default function PasswordInput({ value, onChange, autoComplete, id, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; autoComplete: "current-password" | "new-password"; id: string; placeholder?: string; autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input id={id} type={show ? "text" : "password"} required minLength={autoComplete === "new-password" ? 8 : undefined} maxLength={72}
        autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
      <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
        {show ? "Ocultar" : "Mostrar"}
      </button>
    </span>
  );
}
