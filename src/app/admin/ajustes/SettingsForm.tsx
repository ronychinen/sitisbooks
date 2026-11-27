"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CALLAO, feeForKm, kmBetween, soles, type Centroid, type Settings } from "@/lib/constants";

export default function SettingsForm({ initial, centroids }: { initial: Settings; centroids: Centroid[] }) {
  const router = useRouter();
  const [fee, setFee] = useState(String(initial?.fee ?? 5));
  const [def, setDef] = useState(String(initial?.default_tariff ?? 12));
  const [creditPrice, setCreditPrice] = useState(initial?.credit_price != null ? String(initial.credit_price) : "");
  const [baseFare, setBaseFare] = useState(String(initial?.km_base_fare ?? 5));
  const [kmPrice, setKmPrice] = useState(String(initial?.km_price ?? 0.6));
  const [minFee, setMinFee] = useState(String(initial?.km_min_fee ?? 8));
  const [maxFee, setMaxFee] = useState(initial?.km_max_fee != null ? String(initial.km_max_fee) : "");
  const [roadFactor, setRoadFactor] = useState(String(initial?.road_factor ?? 1.3));
  const params = {
    km_base_fare: Math.max(0, Number(baseFare) || 0), km_price: Math.max(0, Number(kmPrice) || 0),
    km_min_fee: Math.max(0, Number(minFee) || 0), km_max_fee: maxFee.trim() === "" || !(Number(maxFee) > 0) ? null : Number(maxFee),
  };
  const factor = Math.max(1, Number(roadFactor) || 1.3);
  const origin = { lat: initial?.origin_lat ?? -12.1184, lng: initial?.origin_lng ?? -77.0376 };
  const centerOf = (d: string) => centroids.find((c) => c.district === d);
  const reference = centroids
    .map((c) => { const km = kmBetween(origin, c) * factor; return { d: c.district, km, fee: feeForKm(km, params) }; })
    .sort((a, b) => a.km - b.km);
  const examples: [string, string][] = [["Miraflores", "Santiago de Surco"], ["San Isidro", "Miraflores"], ["Los Olivos", "San Miguel"], ["San Juan de Lurigancho", "Miraflores"]];
  const [yape, setYape] = useState(initial?.yape_number ?? "");
  const [holder, setHolder] = useState(initial?.yape_holder ?? "");
  const [qrUrl, setQrUrl] = useState(initial?.yape_qr_url ?? "");
  const [qrBusy, setQrBusy] = useState(false);
  async function uploadQr(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("El QR debe ser una imagen (PNG o JPG)."); return; }
    if (file.size > 3 * 1024 * 1024) { setMsg("La imagen del QR debe pesar menos de 3 MB."); return; }
    setQrBusy(true); setMsg("");
    const sb = createClient();
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `yape-qr-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("publico").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setQrBusy(false);
    if (error) { setMsg("No se pudo subir el QR. ¿Ya corriste el schema.sql?"); return; }
    setQrUrl(sb.storage.from("publico").getPublicUrl(path).data.publicUrl);
    setMsg("QR cargado. Pulsa Guardar ajustes para publicarlo.");
  }
  const [bankName, setBankName] = useState(initial?.bank_name ?? "");
  const [bankHolder, setBankHolder] = useState(initial?.bank_holder ?? "");
  const [bankAccount, setBankAccount] = useState(initial?.bank_account ?? "");
  const [bankCci, setBankCci] = useState(initial?.bank_cci ?? "");
  const legacyBank = initial?.bank_info && !initial?.bank_name && !initial?.bank_account ? initial.bank_info : "";
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await createClient().from("settings").update({
      fee: Math.max(0, Number(fee) || 0), default_tariff: Math.max(0, Number(def) || 0),
      ...params, road_factor: factor,
      credit_price: creditPrice.trim() === "" || !(Number(creditPrice) > 0) ? null : Number(creditPrice),
      yape_number: yape.trim() || null, yape_holder: holder.trim() || null, yape_qr_url: qrUrl || null,
      bank_name: bankName.trim() || null, bank_holder: bankHolder.trim() || null, bank_account: bankAccount.trim() || null, bank_cci: bankCci.trim() || null, updated_at: new Date().toISOString(),
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
          <label>Delivery si no se puede calcular (S/)<input id="def" type="number" min={0} step="0.5" value={def} onChange={(e) => setDef(e.target.value)} /></label>
        </div>
        <label>Precio de 1 crédito (S/)<input id="credit_price" type="number" min={0} step="0.5" placeholder="Vacío = venta desactivada" value={creditPrice} onChange={(e) => setCreditPrice(e.target.value)} /></label>
        <div className="grid2">
          <label>Número de Yape<input id="yape" inputMode="numeric" maxLength={9} value={yape} onChange={(e) => setYape(e.target.value.replace(/\D/g, ""))} /></label>
          <label>Titular de Yape<input id="holder" maxLength={80} value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
        </div>
        <div className="yape-qr" style={{ marginTop: 0 }}>
          {qrUrl
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={qrUrl} alt="QR de Yape" width={180} height={180} />
            : <div className="muted" style={{ fontSize: 13, flex: "none", width: 180, height: 180, display: "grid", placeItems: "center", border: "1px dashed var(--line)", borderRadius: 8, textAlign: "center", padding: 8, boxSizing: "border-box" }}>Sin QR</div>}
          <div className="stack" style={{ gap: 8 }}>
            <b style={{ fontSize: 14 }}>QR de Yape</b>
            <span className="muted" style={{ fontSize: 13 }}>En Yape: Mi QR → Descargar/Compartir. Sube esa imagen (PNG o JPG, máx. 3 MB).</span>
            <div className="row">
              <label className="btn ghost" style={{ cursor: "pointer" }}>{qrBusy ? "Subiendo…" : qrUrl ? "Cambiar QR" : "Subir QR"}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={qrBusy} onChange={(e) => { uploadQr(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {qrUrl && <button type="button" className="btn ghost" onClick={() => { setQrUrl(""); setMsg("QR quitado. Pulsa Guardar ajustes para confirmar."); }}>Quitar</button>}
            </div>
          </div>
        </div>
        <b style={{ fontSize: 14 }}>Datos para transferencia</b>
        {legacyBank && <p className="muted" style={{ fontSize: 13, margin: 0 }}>Datos anteriores (texto libre): {legacyBank}. Al completar los campos de abajo se mostrarán estos en su lugar.</p>}
        <div className="grid2">
          <label>Banco<input id="bank_name" maxLength={60} placeholder="BCP, Interbank, BBVA…" value={bankName} onChange={(e) => setBankName(e.target.value)} /></label>
          <label>Titular de la cuenta<input id="bank_holder" maxLength={80} value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} /></label>
        </div>
        <div className="grid2">
          <label>N.º de cuenta<input id="bank_account" maxLength={30} inputMode="numeric" value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/[^\d-]/g, ""))} /></label>
          <label>CCI (20 dígitos)<input id="bank_cci" maxLength={23} inputMode="numeric" value={bankCci} onChange={(e) => setBankCci(e.target.value.replace(/[^\d-]/g, ""))} /></label>
        </div>
      </div>
      <div className="panel stack">
        <h3>Delivery por distancia</h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Ruta del motorizado: base (Embajada de Brasil, Av. José Pardo 850, Miraflores) → dirección de recojo → dirección de entrega.
          Se usa la ubicación del pin si el usuario la marcó; si no, el centro del distrito. Los km en línea recta se multiplican por el factor vial.
        </p>
        <div className="grid2">
          <label>Tarifa base (S/)<input type="number" min={0} step="0.5" value={baseFare} onChange={(e) => setBaseFare(e.target.value)} /></label>
          <label>Precio por km (S/)<input type="number" min={0} step="0.05" value={kmPrice} onChange={(e) => setKmPrice(e.target.value)} /></label>
        </div>
        <div className="grid2">
          <label>Tarifa mínima (S/)<input type="number" min={0} step="0.5" value={minFee} onChange={(e) => setMinFee(e.target.value)} /></label>
          <label>Tarifa máxima (S/, opcional)<input type="number" min={0} step="0.5" placeholder="Sin tope" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} /></label>
        </div>
        <label>Factor vial (calles vs. línea recta)<input type="number" min={1} max={2} step="0.05" value={roadFactor} onChange={(e) => setRoadFactor(e.target.value)} /></label>
        <b style={{ fontSize: 14 }}>Ejemplos de ruta completa</b>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {examples.map(([from, to]) => {
            const a = centerOf(from), b = centerOf(to);
            if (!a || !b) return null;
            const km = (kmBetween(origin, a) + kmBetween(a, b)) * factor;
            return <li key={from + to}>Recojo en {from} → entrega en {to}: ~{km.toFixed(1)} km · <b>{soles(feeForKm(km, params))}</b></li>;
          })}
        </ul>
      </div>
      <p className="note">Referencia por distrito: tarifa si el recojo y la entrega son en ese distrito (base → distrito). Si la entrega es en otro distrito, se suma ese tramo. Se actualiza al cambiar los valores de arriba.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Distrito</th><th>Zona</th><th>Km desde la base</th><th>Tarifa referencial</th></tr></thead>
          <tbody>
            {reference.map((r) => (
              <tr key={r.d}><td>{r.d}</td><td className="muted">{CALLAO.includes(r.d) ? "Callao" : "Lima"}</td><td className="n">{r.km.toFixed(1)}</td><td className="n">{soles(r.fee)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row"><button className="btn" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar ajustes"}</button>{msg && <span className="muted">{msg}</span>}</div>
    </div>
  );
}
