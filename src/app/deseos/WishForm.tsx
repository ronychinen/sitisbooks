"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { contactViolation } from "@/lib/constants";

type Sug = { url: string; title: string; author: string; year?: string };

/** Agregar un libro a la lista de deseos, con sugerencias de título y portada. */
export default function WishForm({ full }: { full: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const typed = useRef(false);
  const req = useRef(0);

  useEffect(() => {
    const q = title.trim();
    if (!typed.current || q.length < 3) { setSugs([]); return; }
    const n = ++req.current;
    const t = setTimeout(async () => {
      try {
        const j = await fetch(`/api/covers?suggest=1&title=${encodeURIComponent(q)}`).then((r) => r.json());
        if (n === req.current) { setSugs(j.candidates ?? []); setIdx(-1); setOpen(true); }
      } catch { /* sin sugerencias */ }
    }, 350);
    return () => clearTimeout(t);
  }, [title]);

  function choose(s: Sug) {
    typed.current = false; req.current++;
    setTitle(s.title.slice(0, 160)); setAuthor(s.author.slice(0, 120)); setCover(s.url);
    setSugs([]); setOpen(false); setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = contactViolation(title) ? `El título ${contactViolation(title)}` : contactViolation(author) ? `El autor ${contactViolation(author)}` : "";
    if (err) { setError(err + "."); return; }
    setBusy(true); setError("");
    const { error } = await createClient().rpc("add_wish", { p_title: title, p_author: author, p_cover_url: cover });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setTitle(""); setAuthor(""); setCover(null);
    router.refresh();
  }

  if (full) return <p className="note">Tu lista está completa (5 libros). Quita uno para agregar otro.</p>;

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 10 }}>
      <div className="grid2">
        <label className="ac">Título
          <input required maxLength={160} autoComplete="off" value={title} placeholder="Ej. Cien años de soledad"
            onChange={(e) => { typed.current = true; setTitle(e.target.value); setCover(null); }}
            onBlur={() => setOpen(false)} onFocus={() => sugs.length && setOpen(true)}
            onKeyDown={(e) => {
              if (!open || !sugs.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % sugs.length); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i <= 0 ? sugs.length - 1 : i - 1)); }
              else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); choose(sugs[idx]); }
              else if (e.key === "Escape") setOpen(false);
            }} />
          {open && sugs.length > 0 && (
            <ul className="ac-list" role="listbox">
              {sugs.map((s, i) => (
                <li key={s.url} role="option" aria-selected={i === idx} onMouseDown={(e) => { e.preventDefault(); choose(s); }} onMouseEnter={() => setIdx(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url.replace("/600x600bb.", "/100x100bb.")} alt="" />
                  <span><b>{s.title}</b><small>{s.author}{s.year ? ` · ${s.year}` : ""}</small></span>
                </li>
              ))}
            </ul>
          )}
        </label>
        <label>Autor<input required maxLength={120} value={author} onChange={(e) => setAuthor(e.target.value)} /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? "Agregando…" : "Agregar a mi lista"}</button>
    </form>
  );
}
