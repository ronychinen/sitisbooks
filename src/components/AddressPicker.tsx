"use client";
import { useEffect, useRef, useState } from "react";
import { LIMA_CENTER, MAP_ID, MAPS_KEY, districtFrom, loadGoogleMaps, streetFrom } from "@/lib/googleMaps";

export type PickedPlace = { address: string; district?: string; lat: number | null; lng: number | null };
type Sug = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };

/**
 * Campo de dirección con sugerencias de Google Maps (solo Perú, priorizando Lima) y un mapa
 * con pin movible. Sin API key funciona como un campo de texto normal.
 */
export default function AddressPicker({ value, lat, lng, onChange, label = "Dirección", id }: {
  value: string; lat: number | null; lng: number | null; onChange: (p: PickedPlace) => void; label?: string; id?: string;
}) {
  const [ready, setReady] = useState(false);
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [note, setNote] = useState("");
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const typed = useRef(false);
  const req = useRef(0);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    if (!MAPS_KEY) return;
    loadGoogleMaps().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  // Sugerencias mientras escribe
  useEffect(() => {
    if (!ready || !typed.current || value.trim().length < 4) { setSugs([]); return; }
    const n = ++req.current;
    const t = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        token.current ??= new AutocompleteSessionToken();
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value, sessionToken: token.current, includedRegionCodes: ["pe"], language: "es", region: "pe",
          locationBias: { center: LIMA_CENTER, radius: 50000 },
        });
        if (n !== req.current) return;
        setSugs(suggestions.filter((s) => s.placePrediction).slice(0, 5).map((s) => ({
          id: s.placePrediction!.placeId,
          main: s.placePrediction!.mainText?.toString() ?? s.placePrediction!.text.toString(),
          secondary: s.placePrediction!.secondaryText?.toString() ?? "",
          prediction: s.placePrediction!,
        })));
        setIdx(-1); setOpen(true);
      } catch { if (n === req.current) setSugs([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [value, ready]);

  async function choose(s: Sug) {
    typed.current = false; req.current++;
    setOpen(false); setSugs([]);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["addressComponents", "location", "formattedAddress"] });
      token.current = null; // la sesión termina al obtener el detalle
      const comps = place.addressComponents ?? [];
      const district = districtFrom(comps);
      latest.current.onChange({
        address: streetFrom(comps, place.formattedAddress ?? s.main).slice(0, 160),
        district: district || undefined,
        lat: place.location?.lat() ?? null, lng: place.location?.lng() ?? null,
      });
      setNote(district ? "Revisa el número y mueve el pin si hace falta." : "No reconocimos el distrito: elígelo en la lista.");
    } catch {
      latest.current.onChange({ address: s.main.slice(0, 160), lat: null, lng: null });
    }
  }

  // Mapa con pin movible cuando hay ubicación
  useEffect(() => {
    if (!ready || lat == null || lng == null || !mapEl.current) return;
    let cancelled = false;
    (async () => {
      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      if (cancelled || !mapEl.current) return;
      const pos = { lat, lng };
      if (map.current && map.current.getDiv() !== mapEl.current) { map.current = null; marker.current = null; }
      if (!map.current) {
        map.current = new Map(mapEl.current, { center: pos, zoom: 17, mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative", clickableIcons: false });
        marker.current = new AdvancedMarkerElement({ map: map.current, position: pos, gmpDraggable: true, title: "Arrastra para ajustar" });
        marker.current.addListener("dragend", () => {
          const p = marker.current!.position as google.maps.LatLngLiteral | google.maps.LatLng | null;
          if (!p) return;
          const ll = p instanceof google.maps.LatLng ? { lat: p.lat(), lng: p.lng() } : p;
          latest.current.onChange({ address: latest.current.value, lat: ll.lat, lng: ll.lng });
        });
        map.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.current!.position = e.latLng;
          latest.current.onChange({ address: latest.current.value, lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      } else {
        const cur = marker.current?.position as google.maps.LatLngLiteral | null;
        if (!cur || Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) {
          marker.current!.position = pos; map.current.panTo(pos);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ready, lat, lng]);

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
                <span><b>{s.main}</b><small>{s.secondary}</small></span>
              </li>
            ))}
            <li className="ac-brand" aria-hidden="true">Sugerencias de Google</li>
          </ul>
        )}
      </label>
      {note && <span className="muted" style={{ fontSize: 13 }}>{note}</span>}
      {ready && lat != null && lng != null && <div ref={mapEl} className="mini-map" aria-label="Mapa: arrastra el pin para ajustar tu ubicación" />}
    </div>
  );
}
