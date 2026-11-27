import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe";

// Vuelta desde Google: canjea el código por la sesión y decide a dónde ir
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const fail = (m: string) => NextResponse.redirect(new URL(`/ingresar?error=${encodeURIComponent(m)}&next=${encodeURIComponent(next)}`, url.origin));
  if (!code) return fail(url.searchParams.get("error_description") ? "Cancelaste el ingreso con Google." : "No pudimos ingresar con Google.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("No pudimos ingresar con Google. Inténtalo otra vez.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  const dest = profile ? next : `/perfil?bienvenida=1&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
