"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddressSelect from "@/components/AddressSelect";
import { soles, type Address, type Settings } from "@/lib/constants";

/** Elige dirección de entrega: el delivery se calcula por la ruta base → recojo → entrega. */
export default function RequestPanel({ bookId, credits, settings, addresses, canRequest }: {
  bookId: string; credits: number; settings: Settings | null; addresses: Address[]; canRequest: boolean;
}) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [delivery, setDelivery] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const a = addresses.find((x) => x.id === addressId);
  const fee = Number(settings?.fee ?? 5);
  const total = delivery != null ? delivery + fee : null;

  useEffect(() => {
    if (!addressId) return;
    let alive = true;
    setDelivery(null);
    createClient().rpc("quote_delivery", { p_book: bookId, p_address: addressId }).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setError(error.message); return; }
      setError(""); setDelivery(Number(data));
    });
    return () => { alive = false; };
  }, [bookId, addressId]);

  async function request() {
    setBusy(true); setError("");
    const { data, error } = await createClient().rpc("request_book", { p_book: bookId, p_address: addressId || null });
    if (error) { setBusy(false); setError(error.message || "No pudimos reservar el libro."); return; }
    router.replace(`/mis-intercambios/${data}`);
    router.refresh();
  }

  return (
    <>
      <AddressSelect label="Entregar en" addresses={addresses} value={addressId} onChange={setAddressId} next={`/pedir/${bookId}`} />
      <div className="panel cost">
        <span>Crédito</span><span className="n">1 de {credits}</span>
        <span>Delivery a {a?.district ?? "tu distrito"}</span><span className="n">{delivery != null ? soles(delivery) : "Calculando…"}</span>
        <span>Comisión Sitisbooks</span><span className="n">{soles(fee)}</span>
        <span className="tot">Total a pagar</span><span className="n tot">{total != null ? soles(total) : "—"}</span>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>El delivery se calcula según la distancia del recojo a tu dirección.</p>
      {canRequest && (
        <div className="stack" style={{ gap: 8 }}>
          <button className="btn" disabled={busy || !addressId || total == null} onClick={request}>{busy ? "Reservando…" : total != null ? `Usar 1 crédito y pagar ${soles(total)}` : "Calculando…"}</button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
      {!canRequest && error && <p className="error">{error}</p>}
    </>
  );
}
