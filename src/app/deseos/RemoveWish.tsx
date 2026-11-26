"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RemoveWish({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="linkbtn" disabled={busy} onClick={async () => {
      setBusy(true);
      const { error } = await createClient().rpc("remove_wish", { p_id: id });
      setBusy(false);
      if (!error) router.refresh();
    }}>{busy ? "Quitando…" : "Quitar"}</button>
  );
}
