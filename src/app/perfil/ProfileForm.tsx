"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DISTRICTS } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/server";

export default function ProfileForm({ email, profile, next, isNew }: { email: string; profile: Profile | null; next: string; isNew: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [f, setF] = useState({
    first_name: profile?.first_name ?? "", last_name: profile?.last_name ?? "", phone: profile?.phone ?? "",
    district: profile?.district ?? "", address: profile?.address ?? "", reference: profile?.reference ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setSaved(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^9\d{8}$/.test(f.phone)) { setError("El celular debe tener 9 dígitos y empezar con 9."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("save_profile", {
      p_first_name: f.first_name, p_last_name: f.last_name, p_phone: f.phone,
      p_district: f.district, p_address: f.address, p_reference: f.reference,
    });
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
        <label>Distrito
          <select id="district" required value={f.district} onChange={set("district")}>
            <option value="">Elige tu distrito</option>
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
      </div>
      <label>Dirección (recojo y entrega)<input id="address" required maxLength={160} autoComplete="street-address" placeholder="Av./Calle, número, dpto." value={f.address} onChange={set("address")} /></label>
      <label>Referencia (opcional)<input id="reference" maxLength={160} placeholder="Frente al parque, portón verde…" value={f.reference} onChange={set("reference")} /></label>
      {error && <p className="error">{error}</p>}
      {saved && <p className="note">Datos guardados.</p>}
      <button className="btn" disabled={busy}>{busy ? "Guardando…" : isNew ? "Activar mi cuenta" : "Guardar cambios"}</button>
    </form>
  );
}
