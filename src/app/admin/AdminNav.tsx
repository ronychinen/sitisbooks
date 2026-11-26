"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ users }: { users: number }) {
  const p = usePathname();
  const items: [string, string, number?][] = [["/admin/usuarios", "Usuarios", users], ["/admin", "Intercambios"], ["/admin/creditos", "Compras de créditos"], ["/admin/ajustes", "Tarifas y pagos"]];
  return (
    <div className="subtabs">
      {items.map(([href, label, n]) => (
        <Link key={href} href={href} aria-current={p === href ? "page" : undefined}>{label}{n != null && <span className="c">{n}</span>}</Link>
      ))}
    </div>
  );
}
