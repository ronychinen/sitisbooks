import { createClient, type Profile } from "@/lib/supabase/server";
import { fmtDT } from "@/lib/constants";
import CreditsInput from "./CreditsInput";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  const users = (data ?? []) as Profile[];
  if (!users.length) return <div className="empty"><p>Aún no hay usuarios registrados.</p></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Celular</th><th>Distrito</th><th>Registro</th><th>Donados</th><th>Recibidos</th><th>Créditos</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.first_name} {u.last_name}{u.is_admin && <span className="chip" style={{ marginLeft: 8 }}>Admin</span>}</td>
              <td>{u.email}</td><td className="n">{u.phone}</td><td>{u.district}</td><td>{fmtDT(u.created_at)}</td>
              <td className="n">{u.donated}</td><td className="n">{u.received}</td>
              <td><CreditsInput id={u.id} value={u.credits} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
