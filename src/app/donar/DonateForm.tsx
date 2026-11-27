"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONDITIONS, GENRES, contactViolation } from "@/lib/constants";
import BookCover from "@/components/BookCover";
import AddressSelect from "@/components/AddressSelect";
import type { Address } from "@/lib/constants";

type Candidate = { url: string; source: string; title: string; author: string; year?: string };
type CoverChoice = { kind: "none" } | { kind: "url"; url: string } | { kind: "upload"; url: string };

export default function DonateForm({ addresses, initial }: { addresses: Address[]; initial?: { title: string; author: string; cover: string | null } }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [genre, setGenre] = useState("");
  const [condition, setCondition] = useState("");
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  // Desde la lista de deseos llega con portada: se usa tal cual (se puede cambiar)
  const [cover, setCover] = useState<CoverChoice | null>(initial?.cover ? { kind: "url", url: initial.cover } : null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  // Reseña: se busca sola al confirmar la portada; el usuario puede editarla
  const [summary, setSummary] = useState("");
  const [summaryState, setSummaryState] = useState<"idle" | "loading" | "found" | "none">("idle");
  const summaryEdited = useRef(false);
  const summaryFor = useRef("");
  useEffect(() => {
    if (!cover || title.trim().length < 2) return;
    const key = `${title.trim()}|${author.trim()}`;
    if (summaryFor.current === key || summaryEdited.current) return;
    summaryFor.current = key;
    setSummaryState("loading");
    const ctrl = new AbortController();
    fetch(`/api/summary?title=${encodeURIComponent(title.trim())}&author=${encodeURIComponent(author.trim())}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { summary: string | null }) => {
        if (summaryEdited.current) return;
        if (j.summary) { setSummary(j.summary); setSummaryState("found"); } else { setSummary(""); setSummaryState("none"); }
      })
      .catch(() => { if (!ctrl.signal.aborted) setSummaryState("none"); });
    return () => ctrl.abort();
  }, [cover, title, author]);
  const lastQuery = useRef(initial?.cover ? `${initial.title.trim()}|${initial.author.trim()}` : "");
  const [sugs, setSugs] = useState<Candidate[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [sugIdx, setSugIdx] = useState(-1);
  const sugReq = useRef(0);
  const typedTitle = useRef(false);

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

  // Sugerencias de títulos mientras se escribe
  useEffect(() => {
    const q = title.trim();
    if (!typedTitle.current || q.length < 3 || titleErr) { setSugs([]); return; }
    const id = ++sugReq.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/covers?suggest=1&title=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (id !== sugReq.current) return;
        setSugs(j.candidates ?? []); setSugIdx(-1); setSugOpen(true);
      } catch { if (id === sugReq.current) setSugs([]); }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  function chooseSuggestion(s: Candidate) {
    const t = contactViolation(s.title) ? title.trim() : s.title.trim().slice(0, 160);
    const a = s.author && !contactViolation(s.author) ? s.author.trim().slice(0, 120) : author.trim();
    typedTitle.current = false; sugReq.current++;
    setSugOpen(false); setSugs([]);
    setTitle(t); setAuthor(a); setDone("");
    lastQuery.current = `${t}|${a}`;
    setCover(null);
    setCandidates([s, ...sugs.filter((c) => c.url !== s.url && c.author === s.author)]);
    setPicked(s.url);
  }

  function onTitleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!sugOpen || !sugs.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSugIdx((i) => (i + 1) % sugs.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSugIdx((i) => (i <= 0 ? sugs.length - 1 : i - 1)); }
    else if (e.key === "Enter" && sugIdx >= 0) { e.preventDefault(); chooseSuggestion(sugs[sugIdx]); }
    else if (e.key === "Escape") setSugOpen(false);
  }

  // Al elegir una portada, completa el autor con el de esa edición (sin relanzar la búsqueda)
  function pick(c: Candidate) {
    setPicked(c.url);
    const a = c.author.trim().slice(0, 120);
    if (a && !contactViolation(a)) {
      lastQuery.current = `${title.trim()}|${a}`;
      setAuthor(a);
    }
  }

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
    const base = {
      p_title: title, p_author: author, p_cover_url: cover.kind === "none" ? "" : cover.url,
      p_genre: genre, p_condition: condition, p_address: addressId || null,
    };
    let { error } = await supabase.rpc("publish_book", { ...base, p_description: summary.trim() || null });
    if (error?.code === "PGRST202") ({ error } = await supabase.rpc("publish_book", base)); // base de datos aún sin actualizar
    setBusy(false);
    if (error) { setError(error.message || "No pudimos publicar el libro. Inténtalo de nuevo."); return; }
    setDone(title);
    setTitle(""); setAuthor(""); setGenre(""); setCondition("");
    setCandidates(null); setPicked(null); setCover(null); lastQuery.current = "";
    setSummary(""); setSummaryState("idle"); summaryEdited.current = false; summaryFor.current = "";
    typedTitle.current = false; setSugs([]); setSugOpen(false);
    router.refresh();
  }

  const coverUrl = cover && cover.kind !== "none" ? cover.url : null;

  return (
    <form className="stack" onSubmit={submit}>
      {done && <p className="note">Publicaste “{done}”. Ya aparece en el catálogo.</p>}
      <div className="grid2">
        <label className="ac">Título<input id="title" required maxLength={160} autoComplete="off" role="combobox" aria-expanded={sugOpen && sugs.length > 0} aria-controls="title-sugs" aria-invalid={!!titleErr} value={title}
            onChange={(e) => { typedTitle.current = true; setTitle(e.target.value); setDone(""); }}
            onKeyDown={onTitleKey} onFocus={() => sugs.length && setSugOpen(true)}
            onBlur={() => { setSugOpen(false); search(); }} />
          {sugOpen && sugs.length > 0 && (
            <ul className="ac-list" id="title-sugs" role="listbox">
              {sugs.map((s, i) => (
                <li key={s.url} role="option" aria-selected={i === sugIdx} onMouseDown={(e) => { e.preventDefault(); chooseSuggestion(s); }} onMouseEnter={() => setSugIdx(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url.replace("/600x600bb.", "/100x100bb.")} alt="" />
                  <span><b>{s.title}</b><small>{s.author}{s.year ? ` · ${s.year}` : ""}</small></span>
                </li>
              ))}
            </ul>
          )}
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
      ) : null}
      {cover && (
        <label>Reseña breve <span className="muted" style={{ fontWeight: 400 }}>(opcional · se muestra al tocar la portada en el catálogo)</span>
          <textarea rows={5} maxLength={2000} value={summary}
            placeholder={summaryState === "loading" ? "Buscando una reseña del libro…" : "Cuenta de qué trata el libro en pocas líneas."}
            onChange={(e) => { summaryEdited.current = true; setSummary(e.target.value); }} />
          {summaryState === "found" && !summaryEdited.current && <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>La encontramos automáticamente. Revísala y edítala si hace falta.</span>}
          {summaryState === "none" && !summary && <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>No encontramos una reseña para este libro. Puedes escribir una corta.</span>}
        </label>
      )}
      {cover ? null : searching ? (
        <p className="muted">Buscando portadas…</p>
      ) : candidates ? (
        <div className="stack" style={{ gap: 10 }}>
          {candidates.length > 0 ? (
            <>
              <b>¿Cuál es la portada de tu libro?</b>
              <div className="covers">
                {candidates.map((c) => (
                  <button type="button" key={c.url} aria-pressed={picked === c.url} onClick={() => pick(c)}>
                    <BookCover title={c.title} url={c.url} />
                    <small>{c.title}{c.year ? ` · ${c.year}` : ""}{c.author ? <><br />{c.author}</> : null}<br />{c.source}</small>
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
      <AddressSelect label="Dirección de recojo" addresses={addresses} value={addressId} onChange={setAddressId} next="/donar" />
      {error && <p className="error">{error}</p>}
      <p className="muted" style={{ fontSize: 13 }}>Por tu seguridad, no incluyas teléfonos, correos ni redes sociales: Sitisbooks coordina todo por ti.</p>
      <button className="btn" disabled={busy || !cover || !!titleErr || !!authorErr}>{busy ? "Publicando…" : "Publicar libro"}</button>
    </form>
  );
}
