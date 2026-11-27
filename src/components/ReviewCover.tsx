"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BookCover from "./BookCover";
import GenreTag from "./GenreTag";

type Props = { title: string; author: string; url: string | null; tag?: string; genre?: string; description?: string | null; requestHref?: string | null };

/** Portada clicable del catálogo: abre un modal con la reseña del libro. */
export default function ReviewCover({ title, author, url, tag, genre, description, requestHref }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState<string | null>(description ?? null);
  const [state, setState] = useState<"idle" | "loading" | "none">(description ? "idle" : "idle");

  function open() {
    ref.current?.showModal();
    if (text || state !== "idle") return;
    // Libros publicados sin reseña: la buscamos al abrir
    setState("loading");
    fetch(`/api/summary?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`)
      .then((r) => r.json())
      .then((j: { summary: string | null }) => { if (j.summary) { setText(j.summary); setState("idle"); } else setState("none"); })
      .catch(() => setState("none"));
  }

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClick = (e: MouseEvent) => { if (e.target === d) d.close(); }; // clic fuera del contenido
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <button type="button" className="cover-btn" onClick={open} aria-label={`Leer la reseña de ${title}`}>
        <BookCover title={title} author={author} url={url} tag={tag} />
        <span className="cover-hint" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z" /><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" /></svg>
          Toca para leer la reseña
        </span>
      </button>
      <dialog ref={ref} className="review-modal" aria-label={`Reseña de ${title}`}>
        <div className="rm-body">
          <button type="button" className="rm-close" onClick={() => ref.current?.close()} aria-label="Cerrar">×</button>
          <div className="rm-head">
            <div className="rm-cover"><BookCover title={title} author={author} url={url} /></div>
            <div className="stack" style={{ gap: 6, minWidth: 0 }}>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <span className="muted">{author}</span>
              {genre && <div><GenreTag genre={genre} /></div>}
            </div>
          </div>
          <div className="rm-text">
            {text ? text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)
              : state === "loading" ? <p className="muted">Buscando la reseña…</p>
              : <p className="muted">Aún no tenemos una reseña de este libro.</p>}
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={() => ref.current?.close()}>Cerrar</button>
            {requestHref ? <Link className="btn" href={requestHref}>Pedir este libro</Link> : <span className="chip s-disponible">Tu libro</span>}
          </div>
        </div>
      </dialog>
    </>
  );
}
