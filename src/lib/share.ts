import { SITE_URL } from "./site";

/** Igual que public.book_key en la base de datos. */
export function bookKey(title: string, author: string) {
  const n = (t: string) => t.toLowerCase().replace(/[áàâ]/g, "a").replace(/[éèê]/g, "e").replace(/[íìî]/g, "i").replace(/[óòô]/g, "o").replace(/[úùûü]/g, "u").replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, " ").trim();
  return `${n(title)}|${n(author)}`;
}

const withRef = (u: URL, ref?: string | null) => { if (ref) u.searchParams.set("ref", ref); return u.toString(); };

/** "lean analytics|alistair croll" ⇄ "lean-analytics--alistair-croll" (reversible: book_key solo tiene a-z, 0-9, espacios y |). */
export const bookSlug = (key: string) => key.split("|").map((p) => p.trim().replace(/\s+/g, "-")).join("--");
export const keyFromSlug = (slug: string) => {
  const s = decodeURIComponent(slug).toLowerCase();
  if (!/^[a-z0-9-]+$/.test(s) || !s.includes("--")) return null;
  const [t, ...a] = s.split("--");
  return `${t.replace(/-/g, " ")}|${a.join("--").replace(/-/g, " ")}`;
};
export const bookPath = (key: string) => `/libro/${bookSlug(key)}`;

/** Enlace público a la página de un libro (con el código de invitación de quien comparte). */
export const bookShareUrl = (key: string, ref?: string | null) => withRef(new URL(SITE_URL + bookPath(key)), ref);
export const inviteUrl = (ref: string) => withRef(new URL(SITE_URL + "/"), ref);
export const waLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
