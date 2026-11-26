import { redirect } from "next/navigation";
import Link from "next/link";
import { getAddresses, getSession } from "@/lib/supabase/server";
import AddressBook from "./AddressBook";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "Mi perfil", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenida?: string; next?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  if (!user) redirect("/ingresar");
  const isNew = !profile;
  const addresses = isNew ? [] : await getAddresses(supabase);
  const back = !isNew && sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : null;
  return (
    <div className="panel stack" style={{ maxWidth: 620, margin: "8px auto" }}>
      {back && <Link href={back} className="muted" style={{ fontSize: 14 }}>← Volver</Link>}
      <div>
        <p className="eyebrow">{isNew ? "Último paso para activar tu cuenta" : "Mi perfil"}</p>
        <h2>{isNew ? "Completa tus datos" : "Tus datos de contacto"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          {isNew ? "Usamos tu dirección para recoger los libros que donas y entregarte los que pides." : "Tus datos para coordinar recojos y entregas."} Solo el equipo de Sitisbooks los ve.
          {isNew && <> Al terminar recibes <b>1 crédito de bienvenida</b>.</>}
        </p>
      </div>
      <ProfileForm email={user.email ?? ""} profile={profile} next={sp.next || "/"} isNew={isNew} />
      {!isNew && <AddressBook addresses={addresses} />}
      {!isNew && (
        <form action="/salir" method="post"><button className="btn ghost" type="submit">Cerrar sesión</button></form>
      )}
    </div>
  );
}
