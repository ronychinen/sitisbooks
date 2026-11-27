import Link from "next/link";
import { createClient, type Profile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = { user_id: string; day: string; first_seen: string; last_seen: string; active_seconds: number; pages: number };
const TZ = "America/Lima";
const DAYS = 14;
const limaDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const hm = (iso: string) => new Date(iso).toLocaleTimeString("es-PE", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const dur = (s: number) => {
  if (s < 60) return s > 0 ? "<1 min" : "0 min";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};
const dayLabel = (k: string, short = false) => {
  const d = new Date(`${k}T12:00:00-05:00`);
  return d.toLocaleDateString("es-PE", short ? { weekday: "short", day: "numeric", timeZone: TZ } : { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
};

export default async function Page({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => limaDay(new Date(now.getTime() - (DAYS - 1 - i) * 86400000)));
  const today = days[days.length - 1];
  const sel = d && days.includes(d) ? d : today;

  const [{ data }, { data: profs }] = await Promise.all([
    supabase.from("user_activity").select("*").gte("day", days[0]).order("active_seconds", { ascending: false }).limit(10000),
    supabase.from("profiles").select("id, first_name, last_name, email, is_admin"),
  ]);
  const rows = (data ?? []) as Row[];
  const people = Object.fromEntries(((profs ?? []) as Pick<Profile, "id" | "first_name" | "last_name" | "email" | "is_admin">[]).map((p) => [p.id, p]));

  const byDay = days.map((k) => {
    const r = rows.filter((x) => x.day === k);
    const secs = r.reduce((a, x) => a + x.active_seconds, 0);
    return { k, users: r.length, avg: r.length ? secs / r.length : 0, secs };
  });
  const max = Math.max(1, ...byDay.map((b) => b.users));
  const dayRows = rows.filter((x) => x.day === sel).sort((a, b) => b.active_seconds - a.active_seconds);
  const selStats = byDay.find((b) => b.k === sel)!;
  const last7 = new Set(rows.filter((x) => x.day >= days[DAYS - 7]).map((x) => x.user_id)).size;
  const pages = dayRows.reduce((a, x) => a + x.pages, 0);

  return (
    <div className="stack">
      <div className="kpis" style={{ marginBottom: 0 }}>
        <div className="kpi"><span>Usuarios activos · {sel === today ? "hoy" : dayLabel(sel, true)}</span><b>{selStats.users}</b></div>
        <div className="kpi"><span>Tiempo promedio por usuario</span><b>{dur(Math.round(selStats.avg))}</b></div>
        <div className="kpi"><span>Páginas vistas</span><b>{pages}</b></div>
        <div className="kpi"><span>Activos últimos 7 días</span><b>{last7}</b></div>
      </div>

      <section className="panel stack" style={{ gap: 10 }}>
        <div className="row between"><b>Usuarios con sesión por día</b><span className="muted" style={{ fontSize: 12 }}>Toca un día para ver el detalle</span></div>
        <div className="act-chart" role="list">
          {byDay.map((b) => (
            <Link key={b.k} role="listitem" href={`/admin/actividad?d=${b.k}`} className={`act-col${b.k === sel ? " on" : ""}`}
              title={`${dayLabel(b.k)}: ${b.users} usuario(s), promedio ${dur(Math.round(b.avg))}`}>
              <span className="act-n">{b.users || ""}</span>
              <span className="act-bar"><i style={{ height: `${(b.users / max) * 100}%` }} /></span>
              <span className="act-d">{dayLabel(b.k, true)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack">
        <h3 style={{ margin: 0, textTransform: "capitalize" }}>{dayLabel(sel)} <span className="muted" style={{ fontSize: 14, fontWeight: 400, textTransform: "none" }}>· {dayRows.length} usuario(s)</span></h3>
        {dayRows.length === 0 ? <div className="empty"><p>Nadie con sesión usó la web este día.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Primer ingreso</th><th>Última actividad</th><th>Tiempo en la web</th><th>Páginas</th></tr></thead>
              <tbody>
                {dayRows.map((r) => {
                  const p = people[r.user_id];
                  return (
                    <tr key={r.user_id}>
                      <td className="wrapcell">{p ? `${p.first_name} ${p.last_name}` : "—"}{p?.is_admin && <span className="muted" style={{ fontSize: 12 }}> · admin</span>}<div className="muted" style={{ fontSize: 12 }}>{p?.email}</div></td>
                      <td>{hm(r.first_seen)}</td>
                      <td>{hm(r.last_seen)}</td>
                      <td className="n"><b>{dur(r.active_seconds)}</b></td>
                      <td className="n">{r.pages}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
          Solo cuenta a usuarios con sesión iniciada. El tiempo es el que la web estuvo abierta y en uso (pestaña visible y con actividad en los últimos 2 minutos). Las visitas sin sesión están en Google Analytics.
        </p>
      </section>
    </div>
  );
}
