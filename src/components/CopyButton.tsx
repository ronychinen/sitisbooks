"use client";
import { useState } from "react";

/** Copia un valor al portapapeles (sin guiones ni espacios) y confirma con "Copiado". */
export default function CopyButton({ value, label, raw = false, text = "Copiar" }: { value: string; label: string; raw?: boolean; text?: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    const v = raw ? value : value.replace(/[\s-]/g, "");
    try { await navigator.clipboard.writeText(v); }
    catch {
      const t = document.createElement("textarea"); t.value = v; t.setAttribute("readonly", "");
      t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } finally { t.remove(); }
    }
    setOk(true); setTimeout(() => setOk(false), 1800);
  }
  return (
    <button type="button" className="copy" onClick={copy} aria-label={`Copiar ${label}`} aria-live="polite">
      {ok ? "✓ Copiado" : text}
    </button>
  );
}
