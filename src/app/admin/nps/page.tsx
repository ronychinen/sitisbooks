import Link from "next/link";
import { createClient, type Profile } from "@/lib/supabase/server";
import { fmtDT } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Resp = { id: number; request_id: string | null; user_id: string; book_title: string | null; score: number; comment: string | null; created_at: string; updated_at: string };
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const monthKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" }).slice(0, 7);
const monthLabel = (k: string) => `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`;
const kind = (n: number) => (n >= 9 ? "promotor" : n >= 7 ? "pasivo" : "detractor");
const COLOR = { promotor: "var(--ok)", pasivo: "var(--warn)", detractor: "var(--bad)" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string; f?: string }> }) {
  const { m, f } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: profs }, { count: delivered }] = await Promise.all([
    supabase.from("nps_responses").select("*").order("created_at", { ascending: false }).limit(5000),
    supabase.from("profiles").select("id,first_name,last_name,email"),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "entregado"),
  ]);
  const all = (data ?? []) as Resp[];
  const people = Object.fromEntries(((profs ?? []) as Pick<Profile, "id" | "first_name" | "last_name" | "email">[]).map((p) => [p.id, p]));
  const months = [...new Set(all.map((r) => monthKey(r.created_at)))].sort().reverse();
  const month = m && months.includes(m) ? m : null;
  const R = month ? all.filter((r) => monthKey(r.created_at) === month) : all;

  const n = R.length;
  const pro = R.filter((r) => r.score >= 9).length, pas = R.filter((r) => r.score >= 7 && r.score <= 8).length, det = n - pro - pas;
  const nps = n ? Math.round(((pro - det) / n) * 100) : null;
  const avg = n ? (R.reduce((a, r) => a + r.score, 0) / n).toFixed(1) : "—";
  const pct = (x: number) => (n ? `${Math.round((x / n) * 100)}%` : "0%");
  const dist = Array.from({ length: 10 }, (_, i) => 10 - i).map((s) => ({ s, c: R.filter((r) => r.score === s).length }));
  const max = Math.max(1, ...dist.map((d) => d.c));
  const filter = f === "promotor" || f === "pasivo" || f === "detractor" ? f : null;
  const list = filter ? R.filter((r) => kind(r.score) === filter) : R;
  const q = (o: Record<string, string | null>) => { const p = new URLSearchParams(); const mm = "m" in o ? o.m : month; const ff = "f" in o ? o.f : filter; if (mm) p.set("m", mm); if (ff) p.set("f", ff); const s = p.toString(); return `/admin/nps${s ? `?${s}` : ""}`; };

  return (
    <div className="stack">
      <div className="kpis" style={{ marginBottom: 0 }}>
        <div className="kpi"><span>NPS</span><b style={{ color: nps == null ? undefined : nps >= 50 ? "var(--ok)" : nps >= 0 ? "var(--warn)" : "var(--bad)" }}>{nps == null ? "—" : nps > 0 ? `+${nps}` : nps}</b></div>
        <div className="kpi"><span>Respuestas</span><b>{n}</b></div>
        <div className="kpi"><span>Nota promedio</span><b>{avg}</b></div>
        <div className="kpi"><span>Tasa de respuesta</span><b>{delivered ? `${Math.round((all.length / delivered) * 100)}%` : "—"}</b></div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        NPS = % promotores (9–10) − % detractores (1–6). Va de −100 a +100; sobre +50 es excelente. Tasa de respuesta: respuestas totales sobre libros entregados.
      </p>

      {months.length > 0 && (
        <div className="subtabs" style={{ margin: 0 }}>
          <Link href={q({ m: null })} aria-current={!month ? "page" : undefined}>Todo</Link>
          {months.map((k) => <Link key={k} href={q({ m: k })} aria-current={month === k ? "page" : undefined}>{monthLabel(k)}</Link>)}
        </div>
      )}

      <div className="grid2">
        <div className="panel stack" style={{ gap: 10 }}>
          <b>Distribución de notas</b>
          {dist.map((d) => (
            <div className="nps-bar" key={d.s}>
              <span className="n">{d.s}</span>
              <i><b style={{ width: `${(d.c / max) * 100}%`, background: COLOR[kind(d.s)] }} /></i>
              <span className="n muted">{d.c}</span>
            </div>
          ))}
        </div>
        <div className="panel stack" style={{ gap: 10 }}>
          <b>Segmentos</b>
          {([["promotor", "Promotores (9–10)", pro], ["pasivo", "Pasivos (7–8)", pas], ["detractor", "Detractores (1–6)", det]] as const).map(([k, label, c]) => (
            <div key={k} className="row" style={{ justifyContent: "space-between" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: COLOR[k], marginRight: 8 }} />{label}</span>
              <b className="n">{c} · {pct(c)}</b>
            </div>
          ))}
        </div>
      </div>

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Respuestas <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>· {list.length}</span></h3>
          <div className="row" style={{ gap: 6 }}>
            <Link className={`opt${!filter ? " on" : ""}`} href={q({ f: null })}>Todas</Link>
            <Link className={`opt${filter === "promotor" ? " on" : ""}`} href={q({ f: "promotor" })}>Promotores</Link>
            <Link className={`opt${filter === "pasivo" ? " on" : ""}`} href={q({ f: "pasivo" })}>Pasivos</Link>
            <Link className={`opt${filter === "detractor" ? " on" : ""}`} href={q({ f: "detractor" })}>Detractores</Link>
          </div>
        </div>
        {list.length === 0 ? <div className="empty"><p>Aún no hay respuestas{month || filter ? " con este filtro" : ""}. La encuesta llega en el correo de “Entregado”.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Nota</th><th>Usuario</th><th>Libro</th><th>Comentario</th></tr></thead>
              <tbody>
                {list.map((r) => {
                  const p = people[r.user_id];
                  return (
                    <tr key={r.id}>
                      <td>{fmtDT(r.updated_at)}</td>
                      <td><b className="n" style={{ color: COLOR[kind(r.score)] }}>{r.score}</b></td>
                      <td className="wrapcell">{p ? `${p.first_name} ${p.last_name}` : "—"}<div className="muted" style={{ fontSize: 12 }}>{p?.email}</div></td>
                      <td className="wrapcell">{r.book_title ?? "—"}</td>
                      <td className="wrapcell" style={{ minWidth: 220 }}>{r.comment || <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
