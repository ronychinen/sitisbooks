import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el middleware refresca la sesión.
          }
        },
      },
    }
  );
}

/** Usuario + perfil de la sesión actual (null si no hay sesión o no hay perfil). */
export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: profile as Profile | null };
}

export type Profile = {
  id: string; email: string; first_name: string; last_name: string; phone: string;
  district: string; address: string; reference: string | null; credits: number;
  donated: number; received: number; is_admin: boolean; created_at: string;
};

/** Exige sesión y perfil completo; si falta algo, redirige. */
export async function requireProfile(next: string) {
  const { redirect } = await import("next/navigation");
  const s = await getSession();
  if (!s.user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  if (!s.profile) redirect(`/perfil?next=${encodeURIComponent(next)}`);
  return s as { supabase: typeof s.supabase; user: NonNullable<typeof s.user>; profile: Profile };
}
