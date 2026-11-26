import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ width: 38, height: 112, borderRadius: 8, background: "#2F6BDB" }} />
        <div style={{ width: 38, height: 112, borderRadius: 8, background: "#8DB8F2" }} />
      </div>
    ),
    size
  );
}
