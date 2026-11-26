import type { Settings } from "@/lib/constants";

/** Datos de Yape y transferencia configurados en el admin. */
export default function PayInfo({ s }: { s: Settings | null }) {
  const hasBank = !!(s?.bank_name || s?.bank_account || s?.bank_cci);
  return (
    <div className="grid2">
      <div className="party"><span className="eyebrow">Yape</span>
        {s?.yape_number ? <><span className="ph">{s.yape_number}</span><span>{s.yape_holder}</span></> : <span className="muted">Pronto publicaremos el número.</span>}
      </div>
      <div className="party"><span className="eyebrow">Transferencia</span>
        {hasBank ? (
          <dl className="bank">
            {s?.bank_name && <><dt>Banco</dt><dd>{s.bank_name}</dd></>}
            {s?.bank_holder && <><dt>Titular</dt><dd>{s.bank_holder}</dd></>}
            {s?.bank_account && <><dt>Cuenta</dt><dd className="sel">{s.bank_account}</dd></>}
            {s?.bank_cci && <><dt>CCI</dt><dd className="sel">{s.bank_cci}</dd></>}
          </dl>
        ) : s?.bank_info ? <span style={{ whiteSpace: "pre-line", userSelect: "all" }}>{s.bank_info}</span>
          : <span className="muted">Pronto publicaremos la cuenta.</span>}
      </div>
    </div>
  );
}
