export const LIMA = ["Ancón","Ate","Barranco","Breña","Carabayllo","Chaclacayo","Chorrillos","Cieneguilla","Comas","El Agustino","Independencia","Jesús María","La Molina","La Victoria","Lima (Cercado)","Lince","Los Olivos","Lurigancho-Chosica","Lurín","Magdalena del Mar","Miraflores","Pachacámac","Pucusana","Pueblo Libre","Puente Piedra","Punta Hermosa","Punta Negra","Rímac","San Bartolo","San Borja","San Isidro","San Juan de Lurigancho","San Juan de Miraflores","San Luis","San Martín de Porres","San Miguel","Santa Anita","Santa María del Mar","Santa Rosa","Santiago de Surco","Surquillo","Villa El Salvador","Villa María del Triunfo"];
export const CALLAO = ["Bellavista","Callao","Carmen de la Legua Reynoso","La Perla","La Punta","Mi Perú","Ventanilla"];
export const DISTRICTS = [...LIMA, ...CALLAO];
export const GENRES = ["Novela","Literatura peruana","Infantil y juvenil","Negocios","Autoayuda","Ciencia","Historia","Poesía","Cómic y manga","Académico","Otros"];
export const CONDITIONS = ["Nuevo","Como nuevo","Buen estado","Usado"];

export const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  reservado: "Reservado · en coordinación",
  pago_en_revision: "Pago en revisión",
  pagado: "Pagado · por coordinar",
  coordinando: "Recojo programado",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
export const ADMIN_FLOW = ["pagado", "coordinando", "en_camino", "entregado"] as const;

export type Book = {
  id: string; owner_id: string; title: string; author: string; cover_url: string | null;
  genre: string; condition: string; note: string | null; district: string; status: string; created_at: string;
};
/** Libro del catálogo público: sin datos del donante. */
export type CatalogBook = {
  id: string; title: string; author: string; cover_url: string | null; genre: string; condition: string;
  note: string | null; created_at: string; is_mine: boolean;
};
/** Libro propio (vista my_books). */
export type MyBook = Omit<CatalogBook, "is_mine"> & { status: string };
/** Intercambio visto por un usuario (vista my_requests): nunca incluye datos del otro usuario. */
export type MyRequest = {
  id: string; role: "recibido" | "donado"; book_title: string; book_cover: string | null; status: string;
  created_at: string; delivered_at: string | null; delivery_fee: number | null; platform_fee: number | null;
  total: number | null; payment_note: string | null; delivery_at: string | null; pickup_at: string | null;
};
export type Request = {
  id: string; book_id: string; donor_id: string; requester_id: string; book_title: string; book_cover: string | null;
  from_district: string; to_district: string; delivery_fee: number; platform_fee: number; total: number;
  status: string; payment_method: string | null; operation_code: string | null; proof_path: string | null;
  payment_note: string | null; pickup_at: string | null; delivery_at: string | null; admin_note: string | null;
  credit_granted: boolean; created_at: string; updated_at: string; delivered_at: string | null;
};
export type Settings = {
  id: number; fee: number; tariffs: Record<string, number>; default_tariff: number;
  yape_number: string | null; yape_holder: string | null; bank_info: string | null;
};

export const soles = (n: number | string | null | undefined) => "S/ " + Number(n || 0).toFixed(2);
export const fmtD = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" }) : "—";
export const fmtDT = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }) : "—";
export const tariffFor = (s: Settings | null, district: string) =>
  Number(s?.tariffs?.[district] ?? s?.default_tariff ?? 12);
