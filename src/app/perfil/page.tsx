import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenida?: string; next?: string }> }) {
  const sp = await searchParams;
  const { user, profile } = await getSession();
  if (!user) redirect("/ingresar");
  const isNew = !profile;
  return (
    <div className="panel stack" style={{ maxWidth: 620, margin: "8px auto" }}>
      <div>
        <p className="eyebrow">{isNew ? "Último paso para activar tu cuenta" : "Mi perfil"}</p>
        <h2>{isNew ? "Completa tus datos" : "Tus datos de contacto"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Usamos tu dirección para recoger los libros que donas y entregarte los que pides. Solo el equipo de Sitisbooks la ve.
          {isNew && <> Al terminar recibes <b>1 crédito de bienvenida</b>.</>}
        </p>
      </div>
      <ProfileForm email={user.email ?? ""} profile={profile} next={sp.next || "/"} isNew={isNew} />
      {!isNew && (
        <form action="/salir" method="post"><button className="btn ghost" type="submit">Cerrar sesión</button></form>
      )}
    </div>
  );
}
