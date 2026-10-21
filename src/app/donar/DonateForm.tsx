"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONDITIONS, GENRES, contactViolation } from "@/lib/constants";
import BookCover from "@/components/BookCover";

type Candidate = { url: string; source: string; title: string; author: string; year?: string };
type CoverChoice = { kind: "none" } | { kind: "url"; url: string } | { kind: "upload"; url: string };

export default function DonateForm() {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [condition, setCondition] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [cover, setCover] = useState<CoverChoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const lastQuery = useRef("");

  const titleErr = title.trim() ? contactViolation(title) : null;
  const authorErr = author.trim() ? contactViolation(author) : null;

  async function search() {
    if (titleErr || authorErr) return;
    const key = `${title.trim()}|${author.trim()}`;
    if (title.trim().length < 2 || key === lastQuery.current) return;
    lastQuery.current = key;
    setSearching(true); setCandidates(null); setPicked(null); setCover(null);
    try {
      const r = await fetch(`/api/covers?title=${encodeURIComponent(title.trim())}&author=${encodeURIComponent(author.trim())}`);
      const j = await r.json();
      setCandidates(j.candidates ?? []);
    } catch { setCandidates([]); }
    setSearching(false);
  }

  // Busca sola cuando el usuario deja de escribir título y autor
  useEffect(() => {
    if (title.trim().length < 2 || author.trim().length < 2 || titleErr || authorErr) return;
    const t = setTimeout(search, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, author]);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { setError("Sube una imagen (JPG o PNG)."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("La imagen pesa más de 5 MB."); return; }
    setUploading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("portadas").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) { setError("No pudimos subir la foto. Inténtalo de nuevo."); return; }
    const { data } = supabase.storage.from("portadas").getPublicUrl(path);
    setCover({ kind: "upload", url: data.publicUrl });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (titleErr || authorErr) { setError("Corrige el título o el autor antes de publicar."); return; }
    if (!cover) { setError("Confirma la portada o elige publicar sin portada."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("publish_book", {
      p_title: title, p_author: author, p_cover_url: cover.kind === "none" ? "" : cover.url,
      p_genre: genre, p_condition: condition,
    });
    setBusy(false);
    if (error) { setError(error.message || "No pudimos publicar el libro. Inténtalo de nuevo."); return; }
    setDone(title);
    setTitle(""); setAuthor(""); setGenre(""); setCondition("");
    setCandidates(null); setPicked(null); setCover(null); lastQuery.current = "";
    router.refresh();
  }

  const coverUrl = cover && cover.kind !== "none" ? cover.url : null;

  return (
    <form className="stack" onSubmit={submit}>
      {done && <p className="note">Publicaste “{done}”. Ya aparece en el catálogo.</p>}
      <div className="grid2">
        <label>Título<input id="title" required maxLength={160} aria-invalid={!!titleErr} value={title} onChange={(e) => { setTitle(e.target.value); setDone(""); }} onBlur={search} />
          {titleErr && <span className="error">El título {titleErr}.</span>}</label>
        <label>Autor<input id="author" required maxLength={120} aria-invalid={!!authorErr} value={author} onChange={(e) => setAuthor(e.target.value)} onBlur={search} />
          {authorErr && <span className="error">El autor {authorErr}.</span>}</label>
      </div>

      {/* Paso de portada */}
      {cover ? (
        <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ width: 96, flex: "none" }}><BookCover title={title || "Sin título"} author={author} url={coverUrl} /></div>
          <div className="stack" style={{ gap: 8 }}>
            <b>{cover.kind === "none" ? "Se publicará sin portada" : "Portada confirmada"}</b>
            <button type="button" className="linkbtn" onClick={() => setCover(null)}>Cambiar portada</button>
          </div>
        </div>
      ) : searching ? (
        <p className="muted">Buscando portadas…</p>
      ) : candidates ? (
        <div className="stack" style={{ gap: 10 }}>
          {candidates.length > 0 ? (
            <>
              <b>¿Cuál es la portada de tu libro?</b>
              <div className="covers">
                {candidates.map((c) => (
                  <button type="button" key={c.url} aria-pressed={picked === c.url} onClick={() => setPicked(c.url)}>
                    <BookCover title={c.title} url={c.url} />
                    <small>{c.title}{c.year ? ` · ${c.year}` : ""}<br />{c.source}</small>
                  </button>
                ))}
              </div>
              <div className="row">
                <button type="button" className="btn sm" disabled={!picked} onClick={() => picked && setCover({ kind: "url", url: picked })}>Sí, es esta portada</button>
              </div>
            </>
          ) : (
            <p className="muted">No encontramos portadas para “{title}”. Revisa el título o sube una foto.</p>
          )}
          <div className="row">
            <label className="btn sm ghost" style={{ flexDirection: "row" }}>
              {uploading ? "Subiendo…" : "Ninguna coincide: subir foto de mi libro"}
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            <button type="button" className="linkbtn" onClick={() => setCover({ kind: "none" })}>Publicar sin portada</button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13 }}>Escribe el título y el autor: buscaremos la portada automáticamente.</p>
      )}

      <div className="grid2">
        <label>Género
          <select id="genre" required value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">Elige</option>{GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label>Estado del libro
          <select id="condition" required value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Elige</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="muted" style={{ fontSize: 13 }}>Por tu seguridad, no incluyas teléfonos, correos ni redes sociales: Sitisbooks coordina todo por ti.</p>
      <button className="btn" disabled={busy || !cover || !!titleErr || !!authorErr}>{busy ? "Publicando…" : "Publicar libro"}</button>
    </form>
  );
}
