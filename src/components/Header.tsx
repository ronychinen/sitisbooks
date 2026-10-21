import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";

export default async function Header() {
  const { user, profile } = await getSession();
  const links = [
    { href: "/", label: "Catálogo" },
    ...(user ? [{ href: "/donar", label: "Donar un libro" }, { href: "/mis-intercambios", label: "Mis intercambios" }] : []),
    ...(profile?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
    ...(user ? [{ href: "/perfil", label: "Mi perfil" }] : [{ href: "/ingresar", label: "Ingresar" }]),
  ];
  return (
    <header className="top">
      <div className="wrap topbar">
        <Link href="/" className="logo"><i aria-hidden="true" />Sitisbooks</Link>
        {profile && <span className="credits">Créditos <b>{profile.credits}</b></span>}
        <NavLinks links={links} />
      </div>
    </header>
  );
}
