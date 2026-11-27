"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Mide el tiempo activo de usuarios con sesión: pestaña visible y con interacción en los últimos 2 minutos. */
export default function ActivityTracker() {
  const path = usePathname();
  const acc = useRef(0);          // segundos activos aún no enviados
  const lastInput = useRef(Date.now());
  const sb = useRef(createClient());

  // Una página vista por cada cambio de ruta
  useEffect(() => {
    sb.current.rpc("track_activity", { p_seconds: Math.round(acc.current), p_page: true }).then(() => {}, () => {});
    acc.current = 0;
  }, [path]);

  useEffect(() => {
    const mark = () => { lastInput.current = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    evs.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const flush = () => {
      const s = Math.round(acc.current);
      if (s <= 0) return;
      acc.current = 0;
      sb.current.rpc("track_activity", { p_seconds: s, p_page: false }).then(() => {}, () => {});
    };
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInput.current < 120000) acc.current += 5;
    }, 5000);
    const send = setInterval(flush, 60000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick); clearInterval(send);
      document.removeEventListener("visibilitychange", onHide);
      evs.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);

  return null;
}
