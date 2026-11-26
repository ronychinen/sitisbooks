"use client";
import { matchDistrict } from "@/lib/googleMaps";

/** Sugerencia de dirección de OpenStreetMap (Photon), sin API key. */
export type OsmSug = { id: string; main: string; secondary: string; address: string; district: string; lat: number; lng: number };

// Número que escribió el usuario (ej. "Calle Schell 300" → "300"), para no perderlo si OSM solo conoce la calle
const typedNumber = (q: string) => q.match(/(?:^|\s)(\d{1,5})(?:\s|$|,)/g)?.pop()?.replace(/\D/g, "") ?? "";

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { osm_id: number; osm_type: string; name?: string; street?: string; housenumber?: string; district?: string; locality?: string; city?: string; county?: string; type?: string };
};

// Lima Metropolitana + Callao
const BBOX = "-77.25,-12.55,-76.6,-11.6";

export async function photonSearch(q: string, signal?: AbortSignal): Promise<OsmSug[]> {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "6");
  u.searchParams.set("lat", "-12.0464");
  u.searchParams.set("lon", "-77.0428");
  u.searchParams.set("bbox", BBOX);
  const r = await fetch(u, { signal });
  if (!r.ok) return [];
  const j = (await r.json()) as { features?: Feature[] };
  const seen = new Set<string>();
  const num = typedNumber(q);
  return (j.features ?? []).map((f) => {
    const p = f.properties;
    const street = p.street ?? (p.type === "street" ? p.name : undefined);
    const hn = p.housenumber || num;
    const address = street ? (hn ? `${street} ${hn}` : street) : p.name ?? "";
    const district = matchDistrict(p.district) || matchDistrict(p.locality) || matchDistrict(p.city) || matchDistrict(p.county);
    const place = p.name && p.name !== street ? p.name : "";
    return {
      id: `${p.osm_type}${p.osm_id}`,
      main: address || place,
      secondary: [place && address ? place : "", district || p.city || ""].filter(Boolean).join(" · "),
      address, district,
      lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
    };
  }).filter((s) => {
    const k = `${s.main}|${s.district}`;
    if (!s.main || seen.has(k)) return false;
    seen.add(k); return true;
  }).slice(0, 5);
}
