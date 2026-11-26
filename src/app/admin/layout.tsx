import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireProfile("/admin");
  if (!profile.is_admin) notFound();
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  return (
    <>
      <div className="row between" style={{ marginBottom: 16 }}><h2>Panel de coordinación</h2></div>
      <AdminNav users={count ?? 0} />
      {children}
    </>
  );
}
