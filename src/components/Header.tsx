import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";
import Avatar from "./Avatar";

export default async function Header() {
  const { user, profile } = await getSession();
  const links = [
    { href: "/", label: "Catálogo" },
    { href: "/deseos", label: "Deseos" },
    ...(user ? [{ href: "/donar", label: "Donar un libro" }, { href: "/mis-intercambios", label: "Mis intercambios" }] : []),
    ...(profile?.is_admin ? [{ href: "/admin", label: "Admin" }] : []),
    ...(user ? [{ href: "/perfil", label: "Mi perfil", icon: <Avatar url={profile?.avatar_url} name={profile ? `${profile.first_name} ${profile.last_name}` : user.email} size={26} /> }] : [{ href: "/ingresar", label: "Ingresar" }]),
  ];
  return (
    <header className="top">
      <div className="wrap topbar">
        <Link href="/" className="logo"><i aria-hidden="true" />Sitisbooks</Link>
        <NavLinks links={links}>
          {profile && <Link href="/creditos" className="credits" aria-describedby="credits-tip">Créditos <b>{profile.credits}</b><span className="plus" aria-hidden="true">+</span><span role="tooltip" id="credits-tip" className="tip">Cada crédito te permite pedir 1 libro. Toca para comprar más.</span></Link>}
        </NavLinks>
      </div>
    </header>
  );
}
