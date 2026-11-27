import Link from "next/link";
import { createClient, type Profile } from "@/lib/supabase/server";
import { STATUS_LABEL, fmtD, soles, type Request } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Pago aprobado por el admin: de "pagado" en adelante (los cancelados no cuentan).
const PAID = ["pagado", "coordinando", "en_camino", "entregado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const monthKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" }).slice(0, 7);
const monthLabel = (k: string) => `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`;
const sum = <T,>(xs: T[], f: (x: T) => number | string) => xs.reduce((a, x) => a + Number(f(x) || 0), 0);

type Purchase = { id: string; user_id: string; quantity: number; total: number; payment_method: string; operation_code: string | null; created_at: string; reviewed_at: string | null };

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const supabase = await createClient();
  const [{ data: reqs }, { data: buys }, { data: profs }] = await Promise.all([
    supabase.from("requests").select("*").in("status", PAID).order("created_at", { ascending: false }).limit(5000),
    supabase.from("credit_purchases").select("id,user_id,quantity,total,payment_method,operation_code,created_at,reviewed_at").eq("status", "aprobado").order("created_at", { ascending: false }).limit(5000),
    supabase.from("profiles").select("id,first_name,last_name"),
  ]);
  const allR = (reqs ?? []) as Request[];
  const allP = (buys ?? []) as Purchase[];
  const name = Object.fromEntries(((profs ?? []) as Pick<Profile, "id" | "first_name" | "last_name">[]).map((p) => [p.id, `${p.first_name} ${p.last_name}`]));

  const months = [...new Set([...allR.map((r) => monthKey(r.created_at)), ...allP.map((p) => monthKey(p.created_at))])].sort().reverse();
  const month = m && months.includes(m) ? m : null;
  const R = month ? allR.filter((r) => monthKey(r.created_at) === month) : allR;
  const P = month ? allP.filter((p) => monthKey(p.created_at) === month) : allP;

  const delivery = sum(R, (r) => r.delivery_fee);
  const commission = sum(R, (r) => r.platform_fee);
  const exchanges = sum(R, (r) => r.total);
  const credits = sum(P, (p) => p.total);

  return (
    <div className="stack">
      <div className="kpis" style={{ marginBottom: 0 }}>
        <div className="kpi"><span>Total depositado</span><b>{soles(exchanges + credits)}</b></div>
        <div className="kpi"><span>Comisión</span><b>{soles(commission)}</b></div>
        <div className="kpi"><span>Delivery</span><b>{soles(delivery)}</b></div>
        <div className="kpi"><span>Venta de créditos</span><b>{soles(credits)}</b></div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Cuenta los intercambios con pago aprobado (Pagado, Recojo programado, En camino y Entregado) y las compras de créditos aprobadas. Los cancelados no suman. Total depositado = comisión + delivery + venta de créditos.
      </p>

      {months.length > 0 && (
        <div className="subtabs" style={{ margin: 0 }}>
          <Link href="/admin/ingresos" aria-current={!month ? "page" : undefined}>Todo</Link>
          {months.map((k) => <Link key={k} href={`/admin/ingresos?m=${k}`} aria-current={month === k ? "page" : undefined}>{monthLabel(k)}</Link>)}
        </div>
      )}

      <section className="stack">
        <h3>Intercambios aprobados <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>· {R.length}</span></h3>
        {R.length === 0 ? <div className="empty"><p>No hay intercambios con pago aprobado{month ? " en este mes" : ""}.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Libro</th><th>Solicitante</th><th>Estado</th><th>Delivery</th><th>Comisión</th><th>Total</th></tr></thead>
              <tbody>
                {R.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtD(r.created_at)}</td>
                    <td className="wrapcell">{r.book_title}</td>
                    <td className="wrapcell">{name[r.requester_id] ?? "—"}</td>
                    <td><span className={`chip s-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td className="n">{soles(r.delivery_fee)}</td>
                    <td className="n">{soles(r.platform_fee)}</td>
                    <td className="n"><b>{soles(r.total)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th colSpan={4}>Total</th><td className="n"><b>{soles(delivery)}</b></td><td className="n"><b>{soles(commission)}</b></td><td className="n"><b>{soles(exchanges)}</b></td></tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="stack">
        <h3>Compras de créditos aprobadas <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>· {P.length}</span></h3>
        {P.length === 0 ? <div className="empty"><p>No hay compras de créditos aprobadas{month ? " en este mes" : ""}.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Créditos</th><th>Total</th></tr></thead>
              <tbody>
                {P.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtD(p.created_at)}</td>
                    <td className="wrapcell">{name[p.user_id] ?? "—"}</td>
                    <td className="n">{p.quantity}</td>
                    <td className="n"><b>{soles(p.total)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th colSpan={3}>Total</th><td className="n"><b>{soles(credits)}</b></td></tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
