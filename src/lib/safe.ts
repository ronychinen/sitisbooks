/** Solo rutas internas ("/algo"); evita redirecciones a otros sitios ("//evil.com", "https://…", "javascript:"). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** JSON para <script type="application/ld+json">: impide cerrar la etiqueta con "</script>". */
export const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
