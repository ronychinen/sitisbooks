export const LIMA = ["Ancón","Ate","Barranco","Breña","Carabayllo","Chaclacayo","Chorrillos","Cieneguilla","Comas","El Agustino","Independencia","Jesús María","La Molina","La Victoria","Lima (Cercado)","Lince","Los Olivos","Lurigancho-Chosica","Lurín","Magdalena del Mar","Miraflores","Pachacámac","Pucusana","Pueblo Libre","Puente Piedra","Punta Hermosa","Punta Negra","Rímac","San Bartolo","San Borja","San Isidro","San Juan de Lurigancho","San Juan de Miraflores","San Luis","San Martín de Porres","San Miguel","Santa Anita","Santa María del Mar","Santa Rosa","Santiago de Surco","Surquillo","Villa El Salvador","Villa María del Triunfo"];
export const CALLAO = ["Bellavista","Callao","Carmen de la Legua Reynoso","La Perla","La Punta","Mi Perú","Ventanilla"];
export const DISTRICTS = [...LIMA, ...CALLAO];
export const GENRES = ["Novela","Literatura peruana","Infantil y juvenil","Negocios","Autoayuda","Ciencia","Historia","Poesía","Cómic y manga","Académico","Tecnología","Diseño","Otros"];
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
  genre: string; condition: string; district: string; status: string; created_at: string;
};
/** Libro del catálogo público: sin datos del donante. */
export type CatalogBook = {
  id: string; title: string; author: string; cover_url: string | null; genre: string; condition: string;
  created_at: string; is_mine: boolean; book_key: string;
};
/** Una tarjeta del catálogo: todos los ejemplares disponibles del mismo libro (vista catalog_groups). */
export type CatalogGroup = {
  book_key: string; copies: number; my_copies: number; created_at: string;
  title: string; author: string; genre: string; condition: string; cover_url: string | null; request_id: string | null;
};
export const CONDITION_RANK: Record<string, number> = { "Nuevo": 1, "Como nuevo": 2, "Buen estado": 3, "Usado": 4 };
export const copiesLabel = (n: number) => `${n} ${n === 1 ? "ejemplar" : "ejemplares"}`;
/** Libro propio (vista my_books). */
export type MyBook = Omit<CatalogBook, "is_mine" | "book_key"> & { status: string };
/** Intercambio visto por un usuario (vista my_requests): nunca incluye datos del otro usuario. */
export type MyRequest = {
  id: string; role: "recibido" | "donado"; book_title: string; book_cover: string | null; status: string;
  created_at: string; delivered_at: string | null; delivery_fee: number | null; platform_fee: number | null;
  total: number | null; payment_note: string | null; delivery_at: string | null; pickup_at: string | null;
  my_address_label: string | null; my_address: string | null; my_district: string | null;
};
export type Address = {
  id: string; user_id: string; label: string; district: string; address: string; unit: string | null; reference: string | null;
  lat: number | null; lng: number | null; is_default: boolean; created_at: string;
};
/** "Av. Larco 123, Dpto 501" */
export const fullAddress = (a: { address: string; unit?: string | null }) => (a.unit ? `${a.address}, ${a.unit}` : a.address);
export const ADDRESS_LABELS = ["Casa", "Trabajo", "Departamento"];
export type Request = {
  id: string; book_id: string; donor_id: string; requester_id: string; book_title: string; book_cover: string | null;
  from_district: string; to_district: string; delivery_fee: number; platform_fee: number; total: number;
  status: string; payment_method: string | null; operation_code: string | null; proof_path: string | null;
  payment_note: string | null; pickup_at: string | null; delivery_at: string | null; admin_note: string | null;
  credit_granted: boolean; created_at: string; updated_at: string; delivered_at: string | null;
  pickup_label: string | null; pickup_address: string | null; pickup_reference: string | null;
  delivery_label: string | null; delivery_address: string | null; delivery_reference: string | null;
  pickup_lat: number | null; pickup_lng: number | null; delivery_lat: number | null; delivery_lng: number | null;
};
export type Settings = {
  id: number; fee: number; tariffs: Record<string, number>; default_tariff: number;
  yape_number: string | null; yape_holder: string | null; yape_qr_url?: string | null; bank_info: string | null;
  credit_price: number | null;
  bank_name: string | null; bank_holder: string | null; bank_account: string | null; bank_cci: string | null;
  origin_lat: number; origin_lng: number; km_base_fare: number; km_price: number; km_min_fee: number; km_max_fee: number | null; road_factor: number;
};
export type Centroid = { district: string; lat: number; lng: number };
const rad = (x: number) => (x * Math.PI) / 180;
export const kmBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  2 * 6371 * Math.asin(Math.sqrt(Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2));
/** Misma fórmula que delivery_fee_for en la base de datos (para la tabla referencial del admin). */
export function feeForKm(km: number, p: { km_base_fare: number; km_price: number; km_min_fee: number; km_max_fee: number | null }) {
  let fee = Math.ceil((p.km_base_fare + p.km_price * km) * 2) / 2;
  fee = Math.max(fee, p.km_min_fee);
  if (p.km_max_fee != null) fee = Math.min(fee, p.km_max_fee);
  return fee;
}
export type CreditPurchase = {
  id: string; user_id: string; quantity: number; unit_price: number; total: number; payment_method: "yape" | "transferencia";
  operation_code: string | null; proof_path: string; status: "pago_en_revision" | "aprobado" | "rechazado";
  admin_note: string | null; created_at: string; reviewed_at: string | null;
};
export const PURCHASE_LABEL: Record<string, string> = { pago_en_revision: "En revisión", aprobado: "Aprobada", rechazado: "Rechazada" };

/** Igual que public.contact_violation en la base de datos: bloquea datos de contacto en título y autor. */
export function contactViolation(t: string): string | null {
  if ((t.match(/\d/g) ?? []).length > 5) return "no puede tener más de 5 números en total";
  if (t.includes("@")) return "no puede incluir correos ni usuarios (@)";
  if (/(https?:\/\/|www\.|\.(com|pe|net|org|io|me|ly)\b)/i.test(t)) return "no puede incluir enlaces";
  if (/(^|[^\p{L}\d])(instagram|insta|facebook|fb|tiktok|twitter|whatsapp|wsp|wasap|telegram|ig|linkedin|youtube|snapchat|wa\.me)(?=$|[^\p{L}\d])/iu.test(t)) return "no puede mencionar redes sociales";
  return null;
}

export const soles = (n: number | string | null | undefined) => "S/ " + Number(n || 0).toFixed(2);
export const fmtD = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" }) : "—";
export const fmtDT = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }) : "—";
export const tariffFor = (s: Settings | null, district: string) =>
  Number(s?.tariffs?.[district] ?? s?.default_tariff ?? 12);

/** Enlace a Google Maps: por coordenadas si existen, si no por texto. */
export const mapsLink = (lat: number | null | undefined, lng: number | null | undefined, text: string) =>
  lat != null && lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;

/** Una tarjeta del catálogo de deseos (vista wish_catalog): sin datos de quién lo pide. */
export type WishItem = { book_key: string; title: string; author: string; cover_url: string | null; wanted: number; is_mine: boolean | null; available: number; created_at: string };
export type Wish = { id: string; user_id: string; title: string; author: string; cover_url: string | null; book_key: string; created_at: string };
export const MAX_WISHES = 5;
