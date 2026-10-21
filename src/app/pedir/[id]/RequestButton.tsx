"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { soles } from "@/lib/constants";

export default function RequestButton({ bookId, total }: { bookId: string; total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="stack" style={{ gap: 8 }}>
      <button className="btn" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        const { data, error } = await createClient().rpc("request_book", { p_book: bookId });
        if (error) { setBusy(false); setError(error.message || "No pudimos reservar el libro."); return; }
        router.replace(`/mis-intercambios/${data}`);
        router.refresh();
      }}>{busy ? "Reservando…" : `Usar 1 crédito y pagar ${soles(total)}`}</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
