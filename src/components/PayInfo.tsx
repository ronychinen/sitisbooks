import type { Settings } from "@/lib/constants";

/** Datos de Yape y transferencia configurados en el admin. */
export default function PayInfo({ s }: { s: Settings | null }) {
  return (
    <div className="grid2">
      <div className="party"><span className="eyebrow">Yape</span>
        {s?.yape_number ? <><span className="ph">{s.yape_number}</span><span>{s.yape_holder}</span></> : <span className="muted">Pronto publicaremos el número.</span>}
      </div>
      <div className="party"><span className="eyebrow">Transferencia</span>
        {s?.bank_info ? <span style={{ whiteSpace: "pre-line", userSelect: "all" }}>{s.bank_info}</span> : <span className="muted">Pronto publicaremos la cuenta.</span>}
      </div>
    </div>
  );
}
