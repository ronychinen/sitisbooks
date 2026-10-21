"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirm) return <button className="btn sm danger" onClick={() => setConfirm(true)}>Retirar</button>;
  return (
    <span className="row">
      <button className="btn sm danger" disabled={busy} onClick={async () => {
        setBusy(true);
        await createClient().rpc("withdraw_book", { p_book: id });
        router.refresh();
      }}>Sí, retirar</button>
      <button className="btn sm ghost" onClick={() => setConfirm(false)}>No</button>
    </span>
  );
}
