import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Cuenta suspendida", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, profile } = await getSession();
  if (!user) redirect("/ingresar");
  if (!profile?.banned_at) redirect("/");
  return (
    <div className="panel stack" style={{ maxWidth: 560, margin: "8px auto" }}>
      <h2>Tu cuenta está suspendida</h2>
      {profile.ban_reason && <p className="note">Motivo: {profile.ban_reason}</p>}
      <p className="muted">Mientras esté suspendida no puedes publicar, pedir libros ni comprar créditos. Si crees que es un error, escríbenos indicando el correo de tu cuenta. Revisa los <a href="/terminos#suspension">Términos y condiciones</a>.</p>
      <form action="/salir" method="post"><button className="btn ghost" type="submit">Cerrar sesión</button></form>
    </div>
  );
}
