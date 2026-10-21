import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, soles, type Request } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/server";
import AdminCard from "./AdminCard";

export const dynamic = "force-dynamic";
const TABS = ["pago_en_revision", "pagado", "coordinando", "en_camino", "pendiente_pago", "entregado", "cancelado"];

export default async function Page({ searchParams }: { searchParams: Promise<{ st?: string }> }) {
  const { st } = await searchParams;
  const tab = TABS.includes(st ?? "") ? st! : "pago_en_revision";
  const supabase = await createClient();
  const [{ data: reqs }, { data: profs }, { count: books }] = await Promise.all([
    supabase.from("requests").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("profiles").select("*"),
    supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "disponible"),
  ]);
  const R = (reqs ?? []) as Request[];
  const members = Object.fromEntries(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const list = R.filter((r) => r.status === tab);

  // URLs firmadas (10 min) para ver comprobantes
  const proofs: Record<string, string> = {};
  await Promise.all(list.filter((r) => r.proof_path).map(async (r) => {
    const { data } = await supabase.storage.from("comprobantes").createSignedUrl(r.proof_path!, 600);
    if (data?.signedUrl) proofs[r.id] = data.signedUrl;
  }));

  const done = R.filter((r) => r.status === "entregado");
  return (
    <>
      <div className="kpis">
        <div className="kpi"><span>Usuarios</span><b>{profs?.length ?? 0}</b></div>
        <div className="kpi"><span>Libros disponibles</span><b>{books ?? 0}</b></div>
        <div className="kpi"><span>Intercambios activos</span><b>{R.filter((r) => ["pago_en_revision", "pagado", "coordinando", "en_camino"].includes(r.status)).length}</b></div>
        <div className="kpi"><span>Comisiones (entregados)</span><b>{soles(done.reduce((a, r) => a + Number(r.platform_fee), 0))}</b></div>
      </div>
      <div className="subtabs">
        {TABS.map((s) => (
          <Link key={s} href={`/admin?st=${s}`} aria-current={s === tab ? "page" : undefined}>
            {STATUS_LABEL[s]}<span className="c">{R.filter((r) => r.status === s).length}</span>
          </Link>
        ))}
      </div>
      {list.length === 0
        ? <div className="empty"><p>No hay intercambios en “{STATUS_LABEL[tab]}”.</p></div>
        : <div className="list">{list.map((r) => (
            <AdminCard key={r.id} r={r} donor={members[r.donor_id] ?? null} requester={members[r.requester_id] ?? null} proofUrl={proofs[r.id] ?? null} />
          ))}</div>}
    </>
  );
}
