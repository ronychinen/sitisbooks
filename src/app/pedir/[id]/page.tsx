import Link from "next/link";
import { getAddresses, requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import GenreTag from "@/components/GenreTag";
import { CONDITION_RANK, copiesLabel, type CatalogBook, type Settings } from "@/lib/constants";
import RequestPanel from "./RequestPanel";
import ShareButtons from "@/components/ShareButtons";
import { bookShareUrl } from "@/lib/share";

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
  // Otros ejemplares del mismo libro (de otras personas), mejor estado primero
  const { data: sameBook } = await supabase.from("catalog").select("id, condition, is_mine, created_at").eq("book_key", b.book_key);
  const copies = ((sameBook ?? []) as Pick<CatalogBook, "id" | "condition" | "is_mine" | "created_at">[])
    .filter((c) => !c.is_mine)
    .sort((x, y) => (CONDITION_RANK[x.condition] ?? 9) - (CONDITION_RANK[y.condition] ?? 9) || x.created_at.localeCompare(y.created_at));
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
        {copies.length > 1 && (
          <div className="stack" style={{ gap: 8 }}>
            <b style={{ fontSize: 14 }}>{copiesLabel(copies.length)} disponibles · elige el estado</b>
            <div className="row" style={{ gap: 8 }}>
              {copies.map((c) => (
                <Link key={c.id} href={`/pedir/${c.id}`} className={`opt${c.id === b.id ? " on" : ""}`} aria-current={c.id === b.id ? "true" : undefined}>{c.condition}</Link>
              ))}
            </div>
          </div>
        )}
        <RequestPanel bookId={b.id} credits={profile.credits} settings={s} addresses={addresses} canRequest={!own && !unavailable && !noCredits} />
        <p className="note">Pagas por Yape o transferencia en el siguiente paso. Reservamos el libro para ti mientras subes tu comprobante. Sitisbooks coordina el recojo y la entrega; no compartimos tus datos con el donante.</p>
        {own ? <p className="error">Este libro es tuyo.</p>
          : unavailable ? <p className="error">Este libro ya no está disponible.</p>
          : noCredits ? <div className="stack"><p className="error">No tienes créditos. Compra uno, dona un libro o <Link href="/invitar">invita a un amigo</Link> para ganarlo.</p><div className="row"><Link className="btn" href="/creditos">Comprar créditos</Link><Link className="btn ghost" href="/donar">Donar un libro</Link></div></div>
          : null}
        <ShareButtons small url={bookShareUrl(b.book_key, profile.referral_code)} label="Compartir este libro"
          text={`Mira "${b.title}" de ${b.author} en Sitisbooks, la comunidad para intercambiar libros en Lima 📚`} />
      </section>
    </div>
  );
}
