import { requireProfile } from "@/lib/supabase/server";
import BookCover from "@/components/BookCover";
import DonateForm from "./DonateForm";
import WithdrawButton from "./WithdrawButton";
import type { MyBook } from "@/lib/constants";

export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { disponible: "Disponible", reservado: "Reservado", entregado: "Donado", retirado: "Retirado" };

export default async function Page() {
  const { supabase, profile } = await requireProfile("/donar");
  const { data } = await supabase.from("my_books").select("*").order("created_at", { ascending: false });
  const mine = (data ?? []) as MyBook[];
  return (
    <div className="split">
      <section className="panel stack">
        <div>
          <h2>Publica un libro para donar</h2>
          <p className="muted" style={{ marginTop: 6 }}>Lo recogemos en {profile.district}. Ganas 1 crédito cuando llega a su nuevo lector. Sitisbooks coordina contigo el recojo: nadie más ve tus datos.</p>
        </div>
        <DonateForm />
      </section>
      <section className="stack">
        <h3>Tus libros publicados</h3>
        {mine.length === 0 ? <div className="empty"><p>Todavía no publicas libros.</p></div> : (
          <div className="list">
            {mine.map((b) => (
              <div className="req" key={b.id}>
                <BookCover title={b.title} url={b.cover_url} />
                <div><b>{b.title}</b><div className="muted" style={{ fontSize: 13 }}>{b.author}</div></div>
                <div className="row"><span className={`chip s-${b.status}`}>{LABEL[b.status]}</span>{b.status === "disponible" && <WithdrawButton id={b.id} />}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
