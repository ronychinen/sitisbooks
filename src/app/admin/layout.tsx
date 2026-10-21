import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile("/admin");
  if (!profile.is_admin) notFound();
  return (
    <>
      <div className="row between" style={{ marginBottom: 16 }}><h2>Panel de coordinación</h2></div>
      <AdminNav />
      {children}
    </>
  );
}
