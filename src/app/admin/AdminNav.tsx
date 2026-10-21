"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const p = usePathname();
  const items = [["/admin", "Intercambios"], ["/admin/usuarios", "Usuarios"], ["/admin/ajustes", "Tarifas y pagos"]];
  return (
    <div className="subtabs">
      {items.map(([href, label]) => <Link key={href} href={href} aria-current={p === href ? "page" : undefined}>{label}</Link>)}
    </div>
  );
}
