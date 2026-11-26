"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/** Mapa de OpenStreetMap (Leaflet) con pin movible. */
export default function OsmMap({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const marker = useRef<import("leaflet").Marker | null>(null);
  const cb = useRef(onMove);
  cb.current = onMove;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current, { center: [lat, lng], zoom: 17, scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map.current);
        const icon = L.divIcon({ className: "pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
        marker.current = L.marker([lat, lng], { draggable: true, icon, title: "Arrastra para ajustar" }).addTo(map.current);
        marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); cb.current(p.lat, p.lng); });
        map.current.on("click", (e: import("leaflet").LeafletMouseEvent) => { marker.current!.setLatLng(e.latlng); cb.current(e.latlng.lat, e.latlng.lng); });
      } else {
        const cur = marker.current!.getLatLng();
        if (Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) {
          marker.current!.setLatLng([lat, lng]); map.current.panTo([lat, lng]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [lat, lng]);

  useEffect(() => () => { map.current?.remove(); map.current = null; marker.current = null; }, []);

  return <div ref={el} className="mini-map" aria-label="Mapa: arrastra el pin para ajustar tu ubicación" />;
}
