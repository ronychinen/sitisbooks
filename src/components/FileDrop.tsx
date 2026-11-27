"use client";
import { useEffect, useRef, useState } from "react";

/** Selector de comprobante: zona para tocar o arrastrar, con vista previa. */
export default function FileDrop({ file, onChange, label = "Comprobante de pago" }: { file: File | null; onChange: (f: File | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setPreview(""); return; }
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const kb = file ? (file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`) : "";

  return (
    <div className="stack" style={{ gap: 6 }}>
      <b style={{ fontSize: 13 }}>{label}</b>
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { onChange(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      {file ? (
        <div className="filedrop has">
          {preview
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="" />
            : <span className="fd-ico" aria-hidden="true">PDF</span>}
          <div className="fd-txt"><b>{file.name}</b><span className="muted">{kb}</span></div>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn sm ghost" onClick={() => ref.current?.click()}>Cambiar</button>
            <button type="button" className="btn sm ghost" onClick={() => onChange(null)} aria-label="Quitar archivo">Quitar</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`filedrop${over ? " over" : ""}`} onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onChange(f); }}>
          <span className="fd-ico" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
          </span>
          <span className="fd-txt"><b>Sube la captura de tu pago</b><span className="muted">Toca para elegir o arrastra aquí · imagen o PDF, máx. 8 MB</span></span>
        </button>
      )}
    </div>
  );
}
