"use client";
import Link from "next/link";
import { fullAddress, type Address } from "@/lib/constants";

/** Selector de dirección (recojo o entrega). */
export default function AddressSelect({ label, addresses, value, onChange, next }: {
  label: string; addresses: Address[]; value: string; onChange: (id: string) => void; next: string;
}) {
  const a = addresses.find((x) => x.id === value);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <label>{label}
        <select value={value} onChange={(e) => onChange(e.target.value)} required>
          {addresses.map((x) => <option key={x.id} value={x.id}>{x.label} · {x.district}</option>)}
        </select>
      </label>
      {a && <span className="muted" style={{ fontSize: 13 }}>{fullAddress(a)}, {a.district}{a.reference ? ` · Ref.: ${a.reference}` : ""}</span>}
      <Link href={`/perfil?next=${encodeURIComponent(next)}#direcciones`} className="muted" style={{ fontSize: 13 }}>+ Agregar o editar direcciones</Link>
    </div>
  );
}
