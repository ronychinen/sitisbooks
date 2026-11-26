"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DISTRICTS } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/server";
import AddressPicker from "@/components/AddressPicker";
import { TERMS_VERSION } from "@/lib/terms";

export default function ProfileForm({ email, profile, next, isNew }: { email: string; profile: Profile | null; next: string; isNew: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [f, setF] = useState({
    first_name: profile?.first_name ?? "", last_name: profile?.last_name ?? "", phone: profile?.phone ?? "",
    district: profile?.district ?? "", address: profile?.address ?? "", reference: profile?.reference ?? "", unit: "", lat: null as number | null, lng: null as number | null,
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setSaved(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^9\d{8}$/.test(f.phone)) { setError("El celular debe tener 9 dígitos y empezar con 9."); return; }
    if (isNew && !accepted) { setError("Debes aceptar los Términos y condiciones para activar tu cuenta."); return; }
    setBusy(true); setError("");
    const { error } = isNew
      ? await supabase.rpc("save_profile", {
          p_first_name: f.first_name, p_last_name: f.last_name, p_phone: f.phone,
          p_district: f.district, p_address: f.address, p_reference: f.reference, p_unit: f.unit, p_lat: f.lat, p_lng: f.lng, p_terms_version: TERMS_VERSION,
        })
      : await supabase.rpc("update_contact", { p_first_name: f.first_name, p_last_name: f.last_name, p_phone: f.phone });
    setBusy(false);
    if (error) { setError("No pudimos guardar tus datos. Inténtalo de nuevo."); return; }
    if (isNew) { router.replace(next === "/" ? "/donar" : next); }
    else setSaved(true);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>Correo<input id="email" value={email} disabled /></label>
      <div className="grid2">
        <label>Nombres<input id="first_name" required maxLength={60} autoComplete="given-name" value={f.first_name} onChange={set("first_name")} /></label>
        <label>Apellidos<input id="last_name" required maxLength={60} autoComplete="family-name" value={f.last_name} onChange={set("last_name")} /></label>
      </div>
      <div className="grid2">
        <label>Celular (WhatsApp)<input id="phone" required inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" autoComplete="tel-national" value={f.phone} onChange={(e) => { setF({ ...f, phone: e.target.value.replace(/\D/g, "") }); setSaved(false); }} /></label>
        {isNew && <label>Distrito
          <select id="district" required value={f.district} onChange={set("district")}>
            <option value="">Elige tu distrito</option>
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>}
      </div>
      {isNew && <>
        <AddressPicker id="address" label="Dirección (recojo y entrega)" value={f.address} lat={f.lat} lng={f.lng}
          onChange={(p) => { setF((x) => ({ ...x, address: p.address, lat: p.lat, lng: p.lng, district: p.district ?? x.district })); setSaved(false); }} />
        <div className="grid2">
          <label>Dpto. / Oficina (opcional)<input id="unit" maxLength={30} placeholder="Dpto 501, Of. 302" value={f.unit} onChange={set("unit")} /></label>
          <label>Referencia (opcional)<input id="reference" maxLength={160} placeholder="Frente al parque, portón verde…" value={f.reference} onChange={set("reference")} /></label>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>La guardamos como “Casa”. Luego puedes agregar más direcciones (trabajo, departamento…).</p>
      </>}
      {isNew && (
        <label className="check">
          <input type="checkbox" required checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setError(""); }} />
          <span>Leí y acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos y condiciones</a> y la <a href="/terminos#privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a>. Confirmo que soy mayor de 18 años.</span>
        </label>
      )}
      {error && <p className="error">{error}</p>}
      {saved && <p className="note">Datos guardados.</p>}
      <button className="btn" disabled={busy}>{busy ? "Guardando…" : isNew ? "Activar mi cuenta" : "Guardar cambios"}</button>
    </form>
  );
}
