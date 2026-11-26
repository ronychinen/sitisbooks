import Link from "next/link";
import { getAddresses, requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import GenreTag from "@/components/GenreTag";
import { type CatalogBook, type Settings } from "@/lib/constants";
import RequestPanel from "./RequestPanel";

export const metadata = { title: "Pedir libro", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile(`/pedir/${id}`);
  const [{ data: book }, { data: settings }, addresses] = await Promise.all([
    supabase.from("catalog").select("*").eq("id", id).maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    getAddresses(supabase),
  ]);
  if (!book) {
    return <div className="empty"><h3>Este libro ya no está disponible</h3><p>Otra persona lo pidió o el donante lo retiró.</p><Link className="btn" href="/">Ver otros libros</Link></div>;
  }
  const b = book as CatalogBook, s = settings as Settings | null;
  const own = b.is_mine, unavailable = false, noCredits = profile.credits < 1;

  return (
    <div className="split">
      <div style={{ maxWidth: 280 }}><BookCover title={b.title} author={b.author} url={b.cover_url} tag={b.condition} /></div>
      <section className="stack">
        <div>
          <div><GenreTag genre={b.genre} /></div>
          <h1 style={{ fontSize: 32 }}>{b.title}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{b.author} · {b.condition}</p>
        </div>
        <RequestPanel bookId={b.id} credits={profile.credits} settings={s} addresses={addresses} canRequest={!own && !unavailable && !noCredits} />
        <p className="note">Pagas por Yape o transferencia en el siguiente paso. Reservamos el libro para ti mientras subes tu comprobante. Sitisbooks coordina el recojo y la entrega; no compartimos tus datos con el donante.</p>
        {own ? <p className="error">Este libro es tuyo.</p>
          : unavailable ? <p className="error">Este libro ya no está disponible.</p>
          : noCredits ? <div className="stack"><p className="error">No tienes créditos. Dona un libro para ganar uno.</p><Link className="btn" href="/donar">Donar un libro</Link></div>
          : null}
      </section>
    </div>
  );
}
