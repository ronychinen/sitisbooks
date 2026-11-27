import { SITE_URL } from "./site";

/** Igual que public.book_key en la base de datos. */
export function bookKey(title: string, author: string) {
  const n = (t: string) => t.toLowerCase().replace(/[áàâ]/g, "a").replace(/[éèê]/g, "e").replace(/[íìî]/g, "i").replace(/[óòô]/g, "o").replace(/[úùûü]/g, "u").replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, " ").trim();
  return `${n(title)}|${n(author)}`;
}

const withRef = (u: URL, ref?: string | null) => { if (ref) u.searchParams.set("ref", ref); return u.toString(); };

/** Enlace público a un libro: abre la portada con su reseña en el catálogo. */
export const bookShareUrl = (key: string, ref?: string | null) => { const u = new URL(SITE_URL + "/"); u.searchParams.set("libro", key); return withRef(u, ref); };
export const inviteUrl = (ref: string) => withRef(new URL(SITE_URL + "/"), ref);
export const waLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
