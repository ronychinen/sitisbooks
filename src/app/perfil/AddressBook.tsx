"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ADDRESS_LABELS, DISTRICTS, type Address } from "@/lib/constants";

type Draft = { id: string | null; label: string; district: string; address: string; reference: string; is_default: boolean };
const EMPTY: Draft = { id: null, label: "", district: "", address: "", reference: "", is_default: false };
const MAX = 5;

export default function AddressBook({ addresses }: { addresses: Address[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true); setError("");
    const { error } = await supabase.rpc("save_address", {
      p_id: draft.id, p_label: draft.label, p_district: draft.district, p_address: draft.address,
      p_reference: draft.reference, p_default: draft.is_default,
    });
    setBusy(false);
    if (error) { setError(error.message || "No pudimos guardar la dirección."); return; }
    setDraft(null); router.refresh();
  }
  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setError("");
    const { error } = await fn();
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }
  const makeDefault = (a: Address) => act(() => supabase.rpc("save_address", { p_id: a.id, p_label: a.label, p_district: a.district, p_address: a.address, p_reference: a.reference ?? "", p_default: true }));
  const remove = (a: Address) => { if (confirm(`¿Eliminar la dirección "${a.label}"?`)) act(() => supabase.rpc("delete_address", { p_id: a.id })); };
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => d && { ...d, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <section className="stack" id="direcciones">
      <div>
        <h3>Mis direcciones</h3>
        <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>Al donar eliges dónde recogemos el libro, y al pedir, dónde te lo entregamos. Solo el equipo de Sitisbooks las ve.</p>
      </div>
      <div className="list">
        {addresses.map((a) => (
          <div className="addr" key={a.id}>
            <div>
              <b>{a.label}</b>{a.is_default && <span className="genre g-0" style={{ marginLeft: 8 }}>Predeterminada</span>}
              <div className="muted" style={{ fontSize: 14 }}>{a.address}, {a.district}{a.reference ? ` · Ref.: ${a.reference}` : ""}</div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              {!a.is_default && <button type="button" className="linkbtn" disabled={busy} onClick={() => makeDefault(a)}>Hacer predeterminada</button>}
              <button type="button" className="linkbtn" disabled={busy} onClick={() => setDraft({ id: a.id, label: a.label, district: a.district, address: a.address, reference: a.reference ?? "", is_default: a.is_default })}>Editar</button>
              {addresses.length > 1 && <button type="button" className="linkbtn" disabled={busy} onClick={() => remove(a)}>Eliminar</button>}
            </div>
          </div>
        ))}
      </div>
      {draft ? (
        <form className="panel stack" onSubmit={save}>
          <b>{draft.id ? "Editar dirección" : "Nueva dirección"}</b>
          <div className="grid2">
            <label>Nombre
              <input required maxLength={30} list="addr-labels" placeholder="Casa, Trabajo, Departamento…" value={draft.label} onChange={set("label")} />
              <datalist id="addr-labels">{ADDRESS_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
            </label>
            <label>Distrito
              <select required value={draft.district} onChange={set("district")}>
                <option value="">Elige tu distrito</option>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <label>Dirección<input required maxLength={160} placeholder="Av./Calle, número, dpto." value={draft.address} onChange={set("address")} /></label>
          <label>Referencia (opcional)<input maxLength={160} placeholder="Frente al parque, portón verde…" value={draft.reference} onChange={set("reference")} /></label>
          {!(draft.id && draft.is_default) && (
            <label style={{ flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 500 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={draft.is_default} onChange={set("is_default")} /> Usar como predeterminada
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn sm" disabled={busy}>{busy ? "Guardando…" : "Guardar dirección"}</button>
            <button type="button" className="btn sm ghost" onClick={() => { setDraft(null); setError(""); }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <>
          {error && <p className="error">{error}</p>}
          {addresses.length < MAX
            ? <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setDraft({ ...EMPTY, label: ADDRESS_LABELS.find((l) => !addresses.some((a) => a.label === l)) ?? "" })}>+ Agregar dirección</button>
            : <p className="muted" style={{ fontSize: 13 }}>Llegaste al máximo de {MAX} direcciones.</p>}
        </>
      )}
    </section>
  );
}
