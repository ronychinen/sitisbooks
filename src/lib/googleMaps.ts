"use client";
import { DISTRICTS } from "@/lib/constants";

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const LIMA_CENTER = { lat: -12.0464, lng: -77.0428 };

let loading: Promise<void> | null = null;

/** Carga el SDK de Google Maps una sola vez (solo si hay API key). */
export function loadGoogleMaps(): Promise<void> {
  if (!MAPS_KEY) return Promise.reject(new Error("Sin API key de Google Maps"));
  const w = typeof window !== "undefined" ? (window as unknown as { google?: { maps?: { importLibrary?: unknown } } }) : null;
  if (w?.google?.maps?.importLibrary) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const cb = "__sitisbooksMapsReady";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&loading=async&language=es&region=PE&callback=${cb}`;
    s.async = true;
    s.onerror = () => { loading = null; reject(new Error("No se pudo cargar Google Maps")); };
    document.head.appendChild(s);
  });
  return loading;
}

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const ALIASES: Record<string, string> = {
  "lima": "Lima (Cercado)", "cercado de lima": "Lima (Cercado)", "lima cercado": "Lima (Cercado)",
  "surco": "Santiago de Surco", "magdalena": "Magdalena del Mar", "chosica": "Lurigancho-Chosica",
  "lurigancho": "Lurigancho-Chosica", "carmen de la legua": "Carmen de la Legua Reynoso", "sjl": "San Juan de Lurigancho",
};

/** Busca uno de nuestros distritos por nombre (acepta alias comunes). */
export function matchDistrict(name: string | null | undefined): string {
  if (!name) return "";
  const n = norm(name.replace(/^distrito de /i, ""));
  return DISTRICTS.find((d) => norm(d) === n) ?? ALIASES[n] ?? "";
}

/** Traduce los componentes de Google a uno de nuestros distritos (o "" si no coincide). */
export function districtFrom(components: google.maps.places.AddressComponent[]): string {
  const order = ["sublocality_level_1", "locality", "administrative_area_level_3", "sublocality"];
  for (const type of order) {
    for (const c of components) {
      if (!c.types.includes(type)) continue;
      for (const name of [c.longText, c.shortText]) {
        if (!name) continue;
        const n = norm(name.replace(/^distrito de /i, ""));
        const hit = DISTRICTS.find((d) => norm(d) === n) ?? ALIASES[n];
        if (hit) return hit;
      }
    }
  }
  return "";
}

/** "Av. José Larco 123" a partir de calle + número. */
export function streetFrom(components: google.maps.places.AddressComponent[], fallback: string): string {
  const get = (t: string) => components.find((c) => c.types.includes(t))?.longText ?? "";
  const route = get("route"), num = get("street_number");
  if (route) return num ? `${route} ${num}` : route;
  return fallback.split(",")[0].trim();
}

export const mapsLink = (lat: number | null | undefined, lng: number | null | undefined, text: string) =>
  lat != null && lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
