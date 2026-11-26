"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LIMA_CENTER, MAP_ID, MAPS_KEY, districtFrom, loadGoogleMaps, streetFrom } from "@/lib/googleMaps";
import { photonSearch } from "@/lib/osm";

const OsmMap = dynamic(() => import("./OsmMap"), { ssr: false, loading: () => <div className="mini-map" /> });

export type PickedPlace = { address: string; district?: string; lat: number | null; lng: number | null };
type Sug = { id: string; main: string; secondary: string; resolve: () => Promise<PickedPlace> };

// Con API key usa Google Maps; sin ella, OpenStreetMap (gratis, sin clave).
const PROVIDER: "google" | "osm" = MAPS_KEY ? "google" : "osm";

/** Campo de dirección con sugerencias (solo Lima y Callao) y mapa con pin movible. */
export default function AddressPicker({ value, lat, lng, onChange, label = "Dirección", id }: {
  value: string; lat: number | null; lng: number | null; onChange: (p: PickedPlace) => void; label?: string; id?: string;
}) {
  const [ready, setReady] = useState(PROVIDER === "osm");
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [note, setNote] = useState("");
  const typed = useRef(false);
  const req = useRef(0);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    if (PROVIDER === "google") loadGoogleMaps().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  async function googleSugs(q: string): Promise<Sug[]> {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
    token.current ??= new AutocompleteSessionToken();
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: q, sessionToken: token.current, includedRegionCodes: ["pe"], language: "es", region: "pe",
      locationBias: { center: LIMA_CENTER, radius: 50000 },
    });
    return suggestions.filter((s) => s.placePrediction).slice(0, 5).map((s) => {
      const pp = s.placePrediction!;
      const main = pp.mainText?.toString() ?? pp.text.toString();
      return {
        id: pp.placeId, main, secondary: pp.secondaryText?.toString() ?? "",
        resolve: async () => {
          const place = pp.toPlace();
          await place.fetchFields({ fields: ["addressComponents", "location", "formattedAddress"] });
          token.current = null; // la sesión termina al pedir el detalle
          const comps = place.addressComponents ?? [];
          return { address: streetFrom(comps, place.formattedAddress ?? main), district: districtFrom(comps) || undefined, lat: place.location?.lat() ?? null, lng: place.location?.lng() ?? null };
        },
      };
    });
  }

  async function osmSugs(q: string): Promise<Sug[]> {
    return (await photonSearch(q)).map((s) => ({
      id: s.id, main: s.main, secondary: s.secondary,
      resolve: async () => ({ address: s.address || s.main, district: s.district || undefined, lat: s.lat, lng: s.lng }),
    }));
  }

  // Sugerencias mientras escribe
  useEffect(() => {
    if (!ready || !typed.current || value.trim().length < 4) { setSugs([]); return; }
    const n = ++req.current;
    const t = setTimeout(async () => {
      try {
        const list = PROVIDER === "google" ? await googleSugs(value) : await osmSugs(value);
        if (n !== req.current) return;
        setSugs(list); setIdx(-1); setOpen(true);
      } catch { if (n === req.current) setSugs([]); }
    }, PROVIDER === "google" ? 300 : 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready]);

  async function choose(s: Sug) {
    typed.current = false; req.current++;
    setOpen(false); setSugs([]);
    try {
      const p = await s.resolve();
      latest.current.onChange({ ...p, address: (p.address || s.main).slice(0, 160) });
      setNote(p.district ? "Completa el número si falta y mueve el pin hasta tu puerta." : "No reconocimos el distrito: elígelo en la lista y ajusta el pin.");
    } catch {
      latest.current.onChange({ address: s.main.slice(0, 160), lat: null, lng: null });
    }
  }

  const move = (la: number, ln: number) => latest.current.onChange({ address: latest.current.value, lat: la, lng: ln });

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !sugs.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % sugs.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i <= 0 ? sugs.length - 1 : i - 1)); }
    else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); choose(sugs[idx]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="ac">{label}
        <input id={id} required maxLength={160} autoComplete={ready ? "off" : "street-address"} placeholder={ready ? "Escribe tu calle y número" : "Av./Calle y número"}
          role={ready ? "combobox" : undefined} aria-expanded={open && sugs.length > 0} value={value}
          onChange={(e) => { typed.current = true; setNote(""); onChange({ address: e.target.value, lat, lng }); }}
          onKeyDown={onKey} onFocus={() => sugs.length && setOpen(true)} onBlur={() => setOpen(false)} />
        {open && sugs.length > 0 && (
          <ul className="ac-list" role="listbox">
            {sugs.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === idx} onMouseDown={(e) => { e.preventDefault(); choose(s); }} onMouseEnter={() => setIdx(i)}>
                <span><b>{s.main}</b>{s.secondary && <small>{s.secondary}</small>}</span>
              </li>
            ))}
            <li className="ac-brand" aria-hidden="true">{PROVIDER === "google" ? "Sugerencias de Google" : "© OpenStreetMap"}</li>
          </ul>
        )}
      </label>
      {note && <span className="muted" style={{ fontSize: 13 }}>{note}</span>}
      {ready && lat != null && lng != null && (PROVIDER === "google"
        ? <GoogleMiniMap lat={lat} lng={lng} onMove={move} />
        : <OsmMap lat={lat} lng={lng} onMove={move} />)}
    </div>
  );
}

function GoogleMiniMap({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const cb = useRef(onMove);
  cb.current = onMove;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      if (cancelled || !el.current) return;
      const pos = { lat, lng };
      if (!map.current) {
        map.current = new Map(el.current, { center: pos, zoom: 17, mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative", clickableIcons: false });
        marker.current = new AdvancedMarkerElement({ map: map.current, position: pos, gmpDraggable: true, title: "Arrastra para ajustar" });
        marker.current.addListener("dragend", () => {
          const p = marker.current!.position;
          if (!p) return;
          const ll = p instanceof google.maps.LatLng ? { lat: p.lat(), lng: p.lng() } : (p as google.maps.LatLngLiteral);
          cb.current(ll.lat, ll.lng);
        });
        map.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.current!.position = e.latLng;
          cb.current(e.latLng.lat(), e.latLng.lng());
        });
      } else {
        const cur = marker.current?.position as google.maps.LatLngLiteral | null;
        if (!cur || Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) { marker.current!.position = pos; map.current.panTo(pos); }
      }
    })();
    return () => { cancelled = true; };
  }, [lat, lng]);
  return <div ref={el} className="mini-map" aria-label="Mapa: arrastra el pin para ajustar tu ubicación" />;
}
