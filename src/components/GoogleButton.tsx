"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ID de cliente OAuth de Google (es público). Se muestra el botón oficial de Google dentro de sitisbooks.com.
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "1027209890591-d920g0l8q25kg9v3sfr2r4cirptqfcuc.apps.googleusercontent.com";

type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  prompt: () => void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function loadScript() {
  return new Promise<void>((ok, fail) => {
    if (window.google?.accounts?.id) return ok();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => ok(); s.onerror = () => fail(new Error("gsi"));
    document.head.appendChild(s);
  });
}

/** Botón "Continuar con Google" (Google Identity Services) + One Tap. */
export default function GoogleButton({ onSignedIn, onError, oneTap = true }: { onSignedIn: (userId: string) => void; onError: (m: string) => void; oneTap?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadScript();
        const raw = crypto.randomUUID() + crypto.randomUUID();
        const hashed = await sha256(raw);
        const g = window.google!.accounts.id;
        g.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          itp_support: true,
          context: "signin",
          callback: async (resp: { credential?: string }) => {
            if (!resp.credential) return onError("No pudimos ingresar con Google.");
            const { data, error } = await createClient().auth.signInWithIdToken({ provider: "google", token: resp.credential, nonce: raw });
            if (error || !data.user) return onError("No pudimos ingresar con Google. Inténtalo otra vez.");
            onSignedIn(data.user.id);
          },
        });
        if (!alive || !box.current) return;
        g.renderButton(box.current, { type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center", locale: "es", width: Math.min(400, Math.max(220, box.current.offsetWidth)) });
        setReady(true);
        if (oneTap) g.prompt();
      } catch { if (alive) onError("No pudimos cargar el ingreso con Google. Revisa tu conexión o usa tu correo."); }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="gsi-box" style={{ minHeight: 44, opacity: ready ? 1 : 0.4 }} aria-label="Continuar con Google" />;
}
