import type { Settings } from "@/lib/constants";
import CopyButton from "./CopyButton";

/** Datos de Yape y transferencia configurados en el admin. */
export default function PayInfo({ s }: { s: Settings | null }) {
  const hasBank = !!(s?.bank_name || s?.bank_account || s?.bank_cci);
  return (
    <div className="grid2">
      <div className="party"><span className="eyebrow">Yape</span>
        {s?.yape_number ? (
          <>
            <div className="copyrow"><span className="ph">{s.yape_number}</span><CopyButton value={s.yape_number} label="número de Yape" /></div>
            <span>{s.yape_holder}</span>
          </>
        ) : <span className="muted">Pronto publicaremos el número.</span>}
        {s?.yape_qr_url && (
          <div className="yape-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.yape_qr_url} alt="Código QR de Yape" width={180} height={180} />
            <div className="muted" style={{ fontSize: 13 }}>
              Escanéalo desde Yape. ¿Estás en el celular? Descarga el QR y en Yape elige <b>Escanear → Galería</b>.
              <div><a href={s.yape_qr_url} download="sitisbooks-yape-qr" target="_blank" rel="noopener noreferrer">Descargar QR ↓</a></div>
            </div>
          </div>
        )}
      </div>
      <div className="party"><span className="eyebrow">Transferencia</span>
        {hasBank ? (
          <dl className="bank">
            {s?.bank_name && <><dt>Banco</dt><dd>{s.bank_name}</dd></>}
            {s?.bank_holder && <><dt>Titular</dt><dd>{s.bank_holder}</dd></>}
            {s?.bank_account && <><dt>Cuenta</dt><dd className="copyrow"><span className="sel">{s.bank_account}</span><CopyButton value={s.bank_account} label="número de cuenta" /></dd></>}
            {s?.bank_cci && <><dt>CCI</dt><dd className="copyrow"><span className="sel">{s.bank_cci}</span><CopyButton value={s.bank_cci} label="CCI" /></dd></>}
          </dl>
        ) : s?.bank_info ? <span style={{ whiteSpace: "pre-line", userSelect: "all" }}>{s.bank_info}</span>
          : <span className="muted">Pronto publicaremos la cuenta.</span>}
      </div>
    </div>
  );
}
