"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CALLAO, DISTRICTS, type Settings } from "@/lib/constants";

export default function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [fee, setFee] = useState(String(initial?.fee ?? 5));
  const [def, setDef] = useState(String(initial?.default_tariff ?? 12));
  const [tariffs, setTariffs] = useState<Record<string, string>>(
    Object.fromEntries(DISTRICTS.map((d) => [d, initial?.tariffs?.[d] != null ? String(initial.tariffs[d]) : ""]))
  );
  const [yape, setYape] = useState(initial?.yape_number ?? "");
  const [holder, setHolder] = useState(initial?.yape_holder ?? "");
  const [bank, setBank] = useState(initial?.bank_info ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg("");
    const t: Record<string, number> = {};
    for (const [d, v] of Object.entries(tariffs)) if (v.trim() !== "") t[d] = Math.max(0, Number(v) || 0);
    const { error } = await createClient().from("settings").update({
      fee: Math.max(0, Number(fee) || 0), default_tariff: Math.max(0, Number(def) || 0), tariffs: t,
      yape_number: yape.trim() || null, yape_holder: holder.trim() || null, bank_info: bank.trim() || null, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setBusy(false);
    setMsg(error ? "No se pudo guardar. Revisa tu acceso de admin." : "Ajustes guardados.");
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h3>Cobro</h3>
        <div className="grid2">
          <label>Comisión por intercambio (S/)<input id="fee" type="number" min={0} step="0.5" value={fee} onChange={(e) => setFee(e.target.value)} /></label>
          <label>Tarifa de delivery por defecto (S/)<input id="def" type="number" min={0} step="0.5" value={def} onChange={(e) => setDef(e.target.value)} /></label>
        </div>
        <div className="grid2">
          <label>Número de Yape<input id="yape" inputMode="numeric" maxLength={9} value={yape} onChange={(e) => setYape(e.target.value.replace(/\D/g, ""))} /></label>
          <label>Titular de Yape<input id="holder" maxLength={80} value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
        </div>
        <label>Datos para transferencia (banco, titular, cuenta y CCI)<textarea id="bank" maxLength={400} value={bank} onChange={(e) => setBank(e.target.value)} /></label>
      </div>
      <p className="note">Las tarifas por distrito son referenciales hasta que cargues las de tu operador. Si dejas un distrito vacío se usa la tarifa por defecto.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Distrito de entrega</th><th>Zona</th><th>Tarifa (S/)</th></tr></thead>
          <tbody>
            {DISTRICTS.map((d, i) => (
              <tr key={d}><td>{d}</td><td className="muted">{CALLAO.includes(d) ? "Callao" : "Lima"}</td>
                <td><input id={`tar-${i}`} type="number" min={0} step="0.5" placeholder={def} value={tariffs[d]} onChange={(e) => setTariffs({ ...tariffs, [d]: e.target.value })} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row"><button className="btn" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar ajustes"}</button>{msg && <span className="muted">{msg}</span>}</div>
    </div>
  );
}
