import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/donar", "/mis-intercambios", "/perfil", "/pedir", "/admin", "/creditos", "/invitar", "/encuesta"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  // Referidos: guarda el código del enlace de invitación (30 días; el primero gana)
  const ref = request.nextUrl.searchParams.get("ref")?.trim().toUpperCase();
  if (ref && /^[A-Z0-9]{6}$/.test(ref) && !request.cookies.get("sb_ref")) {
    response.cookies.set("sb_ref", ref, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  }
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/covers|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
