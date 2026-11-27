import Link from "next/link";
import { requireProfile } from "@/lib/supabase/server";
import ShareButtons from "@/components/ShareButtons";
import { inviteUrl } from "@/lib/share";

export const metadata = { title: "Invita y gana créditos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabase } = await requireProfile("/invitar");
  const { data } = await supabase.rpc("my_referrals");
  const r = (Array.isArray(data) ? data[0] : data) as { code: string | null; invited: number; rewarded: number } | null;
  const code = r?.code;
  const url = code ? inviteUrl(code) : null;

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">Invita y gana</p>
        <h2 style={{ margin: 0 }}>Gana 1 crédito por cada amigo que invites</h2>
        <p className="muted" style={{ margin: 0 }}>Comparte tu enlace. Cuando tu amigo se registre y done su primer libro, <b>los dos ganan 1 crédito</b> para pedir el libro que quieran.</p>
      </div>

      <section className="panel stack">
        <b>Tu enlace de invitación</b>
        {url ? (
          <>
            <div className="invite-link">{url}</div>
            <ShareButtons url={url} label="Invitar por WhatsApp"
              text="Te invito a Sitisbooks: dona los libros que ya leíste y recibe los que quieres leer, aquí en Lima. Regístrate con mi enlace y, cuando dones tu primer libro, ganamos 1 crédito cada uno 📚" />
          </>
        ) : <p className="muted">Estamos generando tu enlace. Vuelve a cargar la página en unos segundos.</p>}
      </section>

      <div className="kpis" style={{ marginBottom: 0 }}>
        <div className="kpi"><span>Amigos registrados</span><b>{r?.invited ?? 0}</b></div>
        <div className="kpi"><span>Créditos ganados</span><b>{r?.rewarded ?? 0}</b></div>
      </div>

      <section className="panel stack" style={{ gap: 8 }}>
        <b>¿Cómo funciona?</b>
        <ol className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Comparte tu enlace por WhatsApp o redes.</li>
          <li>Tu amigo se registra en Sitisbooks desde ese enlace (en los siguientes 30 días).</li>
          <li>Cuando su primer libro donado llega a su nuevo lector, sumamos 1 crédito a cada uno y te avisamos por correo.</li>
        </ol>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Sin límite de invitados. El crédito se entrega una vez por cada amigo. Ver <Link href="/terminos">Términos y condiciones</Link>.</p>
      </section>
    </div>
  );
}
