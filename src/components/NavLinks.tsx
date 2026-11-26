"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ links, children }: { links: { href: string; label: string; icon?: React.ReactNode }[]; children?: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav className="tabs">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={l.icon ? "with-icon" : undefined}>{l.icon}{l.label}</Link>;
      })}
      {children}
    </nav>
  );
}
