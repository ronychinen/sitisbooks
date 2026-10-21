import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { soles, tariffFor, type Book, type Settings } from "@/lib/constants";
import RequestButton from "./RequestButton";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile(`/pedir/${id}`);
  const [{ data: book }, { data: settings }] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!book) notFound();
  const b = book as Book, s = settings as Settings | null;
  const delivery = tariffFor(s, profile.district), fee = Number(s?.fee ?? 5);
  const own = b.owner_id === profile.id, unavailable = b.status !== "disponible", noCredits = profile.credits < 1;

  return (
    <div className="split">
      <div style={{ maxWidth: 280 }}><BookCover title={b.title} author={b.author} url={b.cover_url} tag={b.condition} /></div>
      <section className="stack">
        <div>
          <p className="eyebrow">{b.genre} · {b.district}</p>
          <h1 style={{ fontSize: 32 }}>{b.title}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{b.author} · {b.condition}</p>
          {b.note && <p style={{ marginTop: 10 }}>{b.note}</p>}
        </div>
        <div className="panel cost">
          <span>Crédito</span><span className="n">1 de {profile.credits}</span>
          <span>Delivery {b.district} → {profile.district}</span><span className="n">{soles(delivery)}</span>
          <span>Comisión Sitisbooks</span><span className="n">{soles(fee)}</span>
          <span className="tot">Total a pagar</span><span className="n tot">{soles(delivery + fee)}</span>
        </div>
        <p className="note">Pagas por Yape o transferencia en el siguiente paso. Reservamos el libro para ti mientras subes tu comprobante.</p>
        {own ? <p className="error">Este libro es tuyo.</p>
          : unavailable ? <p className="error">Este libro ya no está disponible.</p>
          : noCredits ? <div className="stack"><p className="error">No tienes créditos. Dona un libro para ganar uno.</p><Link className="btn" href="/donar">Donar un libro</Link></div>
          : <RequestButton bookId={b.id} total={delivery + fee} />}
        <p className="muted" style={{ fontSize: 13 }}>Entregamos en: {profile.address}, {profile.district}. <Link href="/perfil">Cambiar dirección</Link></p>
      </section>
    </div>
  );
}
