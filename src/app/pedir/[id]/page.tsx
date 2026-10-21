import Link from "next/link";
import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import { soles, tariffFor, type CatalogBook, type Settings } from "@/lib/constants";
import RequestButton from "./RequestButton";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile(`/pedir/${id}`);
  const [{ data: book }, { data: settings }] = await Promise.all([
    supabase.from("catalog").select("*").eq("id", id).maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!book) {
    return <div className="empty"><h3>Este libro ya no está disponible</h3><p>Otra persona lo pidió o el donante lo retiró.</p><Link className="btn" href="/">Ver otros libros</Link></div>;
  }
  const b = book as CatalogBook, s = settings as Settings | null;
  const delivery = tariffFor(s, profile.district), fee = Number(s?.fee ?? 5);
  const own = b.is_mine, unavailable = false, noCredits = profile.credits < 1;

  return (
    <div className="split">
      <div style={{ maxWidth: 280 }}><BookCover title={b.title} author={b.author} url={b.cover_url} tag={b.condition} /></div>
      <section className="stack">
        <div>
          <p className="eyebrow">{b.genre}</p>
          <h1 style={{ fontSize: 32 }}>{b.title}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{b.author} · {b.condition}</p>
          {b.note && <p style={{ marginTop: 10 }}>{b.note}</p>}
        </div>
        <div className="panel cost">
          <span>Crédito</span><span className="n">1 de {profile.credits}</span>
          <span>Delivery a {profile.district}</span><span className="n">{soles(delivery)}</span>
          <span>Comisión Sitisbooks</span><span className="n">{soles(fee)}</span>
          <span className="tot">Total a pagar</span><span className="n tot">{soles(delivery + fee)}</span>
        </div>
        <p className="note">Pagas por Yape o transferencia en el siguiente paso. Reservamos el libro para ti mientras subes tu comprobante. Sitisbooks coordina el recojo y la entrega; no compartimos tus datos con el donante.</p>
        {own ? <p className="error">Este libro es tuyo.</p>
          : unavailable ? <p className="error">Este libro ya no está disponible.</p>
          : noCredits ? <div className="stack"><p className="error">No tienes créditos. Dona un libro para ganar uno.</p><Link className="btn" href="/donar">Donar un libro</Link></div>
          : <RequestButton bookId={b.id} total={delivery + fee} />}
        <p className="muted" style={{ fontSize: 13 }}>Entregamos en: {profile.address}, {profile.district}. <Link href="/perfil">Cambiar dirección</Link></p>
      </section>
    </div>
  );
}
