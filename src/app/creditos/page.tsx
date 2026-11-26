import Link from "next/link";
import { requireProfile } from "@/lib/supabase/server";
import { PURCHASE_LABEL, fmtDT, soles, type CreditPurchase, type Settings } from "@/lib/constants";
import PayInfo from "@/components/PayInfo";
import BuyCreditsForm from "./BuyCreditsForm";

export const metadata = { title: "Comprar créditos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabase, user, profile } = await requireProfile("/creditos");
  const [{ data: settings }, { data: purchases }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("credit_purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const s = settings as Settings | null;
  const list = (purchases ?? []) as CreditPurchase[];
  const price = s?.credit_price != null ? Number(s.credit_price) : null;

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div>
        <p className="eyebrow">Tienes {profile.credits} {profile.credits === 1 ? "crédito" : "créditos"}</p>
        <h2>Comprar créditos</h2>
        <p className="muted" style={{ marginTop: 6 }}>Cada crédito te permite pedir 1 libro. También puedes ganarlos gratis <Link href="/donar">donando libros</Link>.</p>
      </div>
      {price == null ? (
        <div className="empty"><p>La compra de créditos estará disponible muy pronto.</p><Link className="btn" href="/donar">Donar un libro</Link></div>
      ) : (
        <section className="panel stack">
          <h3>1 crédito = {soles(price)}</h3>
          <PayInfo s={s} />
          <BuyCreditsForm price={price} />
        </section>
      )}
      {list.length > 0 && (
        <section className="stack">
          <h3>Tus compras</h3>
          <div className="list">
            {list.map((c) => (
              <div className="addr" key={c.id}>
                <div>
                  <b>{c.quantity} {c.quantity === 1 ? "crédito" : "créditos"} · {soles(c.total)}</b>
                  <div className="muted" style={{ fontSize: 13 }}>{fmtDT(c.created_at)} · {c.payment_method === "yape" ? "Yape" : "Transferencia"}</div>
                  {c.status === "rechazado" && c.admin_note && <div className="error" style={{ fontSize: 13 }}>Motivo: {c.admin_note}</div>}
                </div>
                <span className={`chip pc-${c.status}`}>{PURCHASE_LABEL[c.status]}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
