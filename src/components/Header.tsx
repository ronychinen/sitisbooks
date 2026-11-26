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
        <NavLinks links={links}>
          {profile && <span className="credits" tabIndex={0} aria-describedby="credits-tip">Créditos <b>{profile.credits}</b><span role="tooltip" id="credits-tip" className="tip">Cada crédito te permite pedir 1 libro</span></span>}
        </NavLinks>
      </div>
    </header>
  );
}
