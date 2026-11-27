import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import type { MyRequest } from "@/lib/constants";
import NpsForm from "./NpsForm";

export const metadata = { title: "¿Cómo te fue con Sitisbooks?", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s } = await searchParams;
  const { supabase, profile } = await requireProfile(`/encuesta/${id}${s ? `?s=${encodeURIComponent(s)}` : ""}`);
  const [{ data }, { data: prev }] = await Promise.all([
    supabase.from("my_requests").select("*").eq("id", id).eq("role", "recibido").maybeSingle(),
    supabase.from("nps_responses").select("score,comment").eq("request_id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const r = data as MyRequest;
  const pre = Number(s);
  const initial = prev?.score ?? (Number.isInteger(pre) && pre >= 1 && pre <= 10 ? pre : null);

  return (
    <div className="stack" style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="row" style={{ alignItems: "center", flexWrap: "nowrap", gap: 16 }}>
        <div style={{ width: 64, flex: "none" }}><BookCover title={r.book_title} url={r.book_cover} /></div>
        <div className="stack" style={{ gap: 4 }}>
          <p className="eyebrow">Tu opinión</p>
          <h2 style={{ margin: 0 }}>Hola {profile.first_name}, ¿qué tal te fue?</h2>
          <span className="muted" style={{ fontSize: 14 }}>Pedido: {r.book_title}</span>
        </div>
      </div>
      {r.status !== "entregado" ? (
        <div className="empty"><p>La encuesta se habilita cuando recibes el libro.</p>
          <div className="row"><Link className="btn ghost" href={`/mis-intercambios/${r.id}`}>Ver mi pedido</Link></div></div>
      ) : (
        <div className="panel"><NpsForm requestId={r.id} initialScore={initial} initialComment={prev?.comment ?? ""} answered={!!prev} /></div>
      )}
    </div>
  );
}
