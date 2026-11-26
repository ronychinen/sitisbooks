import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} · ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#F7F9FC", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 96px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 64, borderRadius: 5, background: "#2F6BDB" }} />
          <div style={{ width: 22, height: 64, borderRadius: 5, background: "#8DB8F2" }} />
          <div style={{ fontSize: 56, fontWeight: 700, color: "#16213A", marginLeft: 10 }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, color: "#16213A", marginTop: 48, lineHeight: 1.1 }}>Dona los libros que ya leíste.</div>
        <div style={{ fontSize: 76, fontWeight: 700, color: "#2F6BDB", lineHeight: 1.1 }}>Recibe los que quieres leer.</div>
        <div style={{ fontSize: 32, color: "#5B6478", marginTop: 40 }}>Intercambio de libros en Lima · 1 libro donado = 1 crédito</div>
      </div>
    ),
    size
  );
}
