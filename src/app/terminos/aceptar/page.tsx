import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { TERMS_UPDATED, TERMS_VERSION } from "@/lib/terms";
import AcceptForm from "./AcceptForm";

export const metadata = { title: "Acepta los términos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const { user, profile } = await getSession();
  if (!user) redirect("/ingresar");
  if (!profile) redirect("/perfil");
  if (profile.terms_version === TERMS_VERSION) redirect(safeNext);
  return (
    <div className="panel stack" style={{ maxWidth: 560, margin: "8px auto" }}>
      <div>
        <p className="eyebrow">Actualizado el {TERMS_UPDATED}</p>
        <h2>Revisa nuestros Términos y condiciones</h2>
        <p className="muted" style={{ marginTop: 6 }}>Para seguir usando Sitisbooks necesitamos que los aceptes. Incluyen tu compromiso de entregar los libros que donas, cómo funcionan los créditos y cómo cuidamos tus datos.</p>
      </div>
      <AcceptForm next={safeNext} />
    </div>
  );
}
