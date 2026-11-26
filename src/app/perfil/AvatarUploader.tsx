"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

const MAX_INPUT = 10 * 1024 * 1024;

/** Recorta al centro en un cuadrado de 320 px y lo comprime (WebP o JPEG) antes de subirlo. */
async function toSquare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height), out = 320;
  const c = document.createElement("canvas"); c.width = out; c.height = out;
  c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  const webp = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
  if (webp && webp.type === "image/webp") return webp;
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar"))), "image/jpeg", 0.85));
}

export default function AvatarUploader({ userId, url, name }: { userId: string; url: string | null; name: string }) {
  const supabase = createClient();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) { setError("Elige una imagen (JPG, PNG o WebP)."); return; }
    if (file.size > MAX_INPUT) { setError("La imagen pesa más de 10 MB."); return; }
    setBusy(true);
    try {
      const blob = await toSquare(file);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatares").upload(path, blob, { contentType: blob.type, upsert: false });
      if (up.error) throw new Error("No pudimos subir la foto. Inténtalo de nuevo.");
      const { data } = supabase.storage.from("avatares").getPublicUrl(path);
      const { error } = await supabase.rpc("set_avatar", { p_url: data.publicUrl });
      if (error) throw new Error(error.message);
      // Borra la foto anterior para no acumular archivos
      const old = url?.split("/avatares/")[1];
      if (old) await supabase.storage.from("avatares").remove([decodeURIComponent(old)]);
      setPreview(data.publicUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir la foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true); setError("");
    const { error } = await supabase.rpc("set_avatar", { p_url: null });
    if (!error) {
      const old = preview?.split("/avatares/")[1];
      if (old) await supabase.storage.from("avatares").remove([decodeURIComponent(old)]);
      setPreview(null); router.refresh();
    } else setError(error.message);
    setBusy(false);
  }

  return (
    <div className="avatar-edit">
      <button type="button" className="avatar-btn" onClick={() => input.current?.click()} disabled={busy} aria-label="Cambiar foto de perfil">
        <Avatar url={preview} name={name} size={88} />
        <span className="avatar-cam" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        </span>
      </button>
      <div className="stack" style={{ gap: 6 }}>
        <b style={{ fontSize: 15 }}>Foto de perfil</b>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn sm ghost" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto"}</button>
          {preview && <button type="button" className="linkbtn" disabled={busy} onClick={remove}>Quitar</button>}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>JPG, PNG o WebP. La recortamos en cuadrado.</span>
        {error && <span className="error">{error}</span>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
