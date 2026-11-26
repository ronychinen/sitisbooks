import { createClient, type Profile } from "@/lib/supabase/server";
import BanToggle from "./BanToggle";
import { fmtDT, fullAddress, mapsLink, type Address } from "@/lib/constants";
import CreditsInput from "./CreditsInput";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data }, { data: addrs }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at"),
  ]);
  const byUser: Record<string, Address[]> = {};
  for (const a of (addrs ?? []) as Address[]) (byUser[a.user_id] ??= []).push(a);
  const users = (data ?? []) as Profile[];
  if (!users.length) return <div className="empty"><p>Aún no hay usuarios registrados.</p></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Celular</th><th>Direcciones</th><th>Registro</th><th>Donados</th><th>Recibidos</th><th>Créditos</th><th>Términos</th><th>Cuenta</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="wrapcell">{u.first_name} {u.last_name}{u.is_admin && <span className="chip" style={{ marginLeft: 8 }}>Admin</span>}</td>
              <td className="wrapcell">{u.email}</td><td className="n">{u.phone}</td><td className="wrapcell">
                {(byUser[u.id] ?? []).length === 0 ? <span className="muted">—</span> : (
                  <details>
                    <summary>{(byUser[u.id] ?? []).length} · {u.district}</summary>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                      {(byUser[u.id] ?? []).map((a) => (
                        <li key={a.id}><b>{a.label}{a.is_default ? " (pred.)" : ""}:</b> {fullAddress(a)}, {a.district}{a.reference ? ` · Ref.: ${a.reference}` : ""} · <a href={mapsLink(a.lat, a.lng, `${fullAddress(a)}, ${a.district}, Lima, Perú`)} target="_blank" rel="noopener noreferrer">Mapa ↗</a></li>
                      ))}
                    </ul>
                  </details>
                )}
              </td><td>{fmtDT(u.created_at)}</td>
              <td className="n">{u.donated}</td><td className="n">{u.received}</td>
              <td><CreditsInput id={u.id} value={u.credits} /></td>
              <td className="muted">{u.terms_accepted_at ? fmtDT(u.terms_accepted_at) : "Pendiente"}</td>
              <td><BanToggle id={u.id} bannedAt={u.banned_at} reason={u.ban_reason} isSelf={u.id === user?.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
