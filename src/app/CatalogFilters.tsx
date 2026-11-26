"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GENRES } from "@/lib/constants";

/** Búsqueda y filtro del catálogo sin recargar la página ni mover el scroll. */
export default function CatalogFilters({ q, g }: { q: string; g: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(q);
  const [genre, setGenre] = useState(g);
  const [pending, start] = useTransition();

  useEffect(() => { setText(q); setGenre(g); }, [q, g]);

  function apply(nextText: string, nextGenre: string) {
    const sp = new URLSearchParams();
    if (nextText.trim()) sp.set("q", nextText.trim());
    if (nextGenre) sp.set("g", nextGenre);
    const qs = sp.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <form className="toolbar" role="search" aria-busy={pending} onSubmit={(e) => { e.preventDefault(); apply(text, genre); }}>
      <input name="q" type="search" placeholder="Buscar por título o autor" value={text} aria-label="Buscar"
        onChange={(e) => { setText(e.target.value); if (e.target.value === "" && q) apply("", genre); }} />
      <select name="g" value={genre} aria-label="Género" onChange={(e) => { setGenre(e.target.value); apply(text, e.target.value); }}>
        <option value="">Todos los géneros</option>
        {GENRES.map((x) => <option key={x}>{x}</option>)}
      </select>
      <button className="btn ghost" type="submit" style={{ flex: "0 0 auto" }} disabled={pending}>{pending ? "Buscando…" : "Filtrar"}</button>
    </form>
  );
}
