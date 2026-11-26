"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddressSelect from "@/components/AddressSelect";
import { soles, tariffFor, type Address, type Settings } from "@/lib/constants";

/** Elige dirección de entrega: el delivery se recalcula según el distrito. */
export default function RequestPanel({ bookId, credits, settings, addresses, canRequest }: {
  bookId: string; credits: number; settings: Settings | null; addresses: Address[]; canRequest: boolean;
}) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const a = addresses.find((x) => x.id === addressId);
  const delivery = tariffFor(settings, a?.district ?? ""), fee = Number(settings?.fee ?? 5), total = delivery + fee;

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
        <span>Delivery a {a?.district ?? "tu distrito"}</span><span className="n">{soles(delivery)}</span>
        <span>Comisión Sitisbooks</span><span className="n">{soles(fee)}</span>
        <span className="tot">Total a pagar</span><span className="n tot">{soles(total)}</span>
      </div>
      {canRequest && (
        <div className="stack" style={{ gap: 8 }}>
          <button className="btn" disabled={busy || !addressId} onClick={request}>{busy ? "Reservando…" : `Usar 1 crédito y pagar ${soles(total)}`}</button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </>
  );
}
