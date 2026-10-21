"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CreditsInput({ id, value }: { id: string; value: number }) {
  const [v, setV] = useState(String(value));
  const [state, setState] = useState<"" | "saving" | "ok" | "err">("");
  return (
    <span className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
      <input id={`cr-${id}`} type="number" min={0} value={v} onChange={(e) => { setV(e.target.value); setState(""); }} aria-label="Créditos" />
      <button className="btn sm ghost" disabled={state === "saving" || String(value) === v && state !== "err"} onClick={async () => {
        setState("saving");
        const { error } = await createClient().rpc("admin_set_credits", { p_user: id, p_credits: Math.max(0, parseInt(v, 10) || 0) });
        setState(error ? "err" : "ok");
      }}>{state === "ok" ? "Guardado" : state === "err" ? "Reintentar" : "Guardar"}</button>
    </span>
  );
}
