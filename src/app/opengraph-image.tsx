import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { LOGO_BLUE, LOGO_CIRCLE, LOGO_GOLD, LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";

export const alt = `${SITE_NAME} · ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#F7F9FC", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 96px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width={80} height={80} viewBox={LOGO_VIEWBOX}><circle {...LOGO_CIRCLE} fill={LOGO_BLUE} /><path d={LOGO_PATH} fill={LOGO_GOLD} /></svg>
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
