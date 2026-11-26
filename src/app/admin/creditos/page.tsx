import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PURCHASE_LABEL, soles, type CreditPurchase } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/server";
import PurchaseCard from "./PurchaseCard";

export const dynamic = "force-dynamic";
const TABS = ["pago_en_revision", "aprobado", "rechazado"];

export default async function Page({ searchParams }: { searchParams: Promise<{ st?: string }> }) {
  const { st } = await searchParams;
  const tab = TABS.includes(st ?? "") ? st! : "pago_en_revision";
  const supabase = await createClient();
  const [{ data }, { data: profs }, { data: settings }] = await Promise.all([
    supabase.from("credit_purchases").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("profiles").select("*"),
    supabase.from("settings").select("credit_price").eq("id", 1).maybeSingle(),
  ]);
  const all = (data ?? []) as CreditPurchase[];
  const users = Object.fromEntries(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const list = all.filter((c) => c.status === tab);
  const proofs: Record<string, string> = {};
  await Promise.all(list.map(async (c) => {
    const { data } = await supabase.storage.from("comprobantes").createSignedUrl(c.proof_path, 600);
    if (data?.signedUrl) proofs[c.id] = data.signedUrl;
  }));
  const approved = all.filter((c) => c.status === "aprobado");
  const price = settings?.credit_price;

  return (
    <>
      <div className="kpis">
        <div className="kpi"><span>Precio por crédito</span><b>{price != null ? soles(price) : "Sin precio"}</b></div>
        <div className="kpi"><span>Por revisar</span><b>{all.filter((c) => c.status === "pago_en_revision").length}</b></div>
        <div className="kpi"><span>Créditos vendidos</span><b>{approved.reduce((a, c) => a + c.quantity, 0)}</b></div>
        <div className="kpi"><span>Ventas aprobadas</span><b>{soles(approved.reduce((a, c) => a + Number(c.total), 0))}</b></div>
      </div>
      {price == null && <p className="note">La venta de créditos está desactivada. Configura el precio en <Link href="/admin/ajustes">Tarifas y pagos</Link>.</p>}
      <div className="subtabs">
        {TABS.map((s) => (
          <Link key={s} href={`/admin/creditos?st=${s}`} aria-current={s === tab ? "page" : undefined}>
            {PURCHASE_LABEL[s]}<span className="c">{all.filter((c) => c.status === s).length}</span>
          </Link>
        ))}
      </div>
      {list.length === 0
        ? <div className="empty"><p>No hay compras en “{PURCHASE_LABEL[tab]}”.</p></div>
        : <div className="list">{list.map((c) => <PurchaseCard key={c.id} c={c} user={users[c.user_id] ?? null} proofUrl={proofs[c.id] ?? null} />)}</div>}
    </>
  );
}
