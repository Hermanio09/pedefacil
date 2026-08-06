import { ImageResponse } from "next/og";

export const size        = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
        borderRadius: "22%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 100, lineHeight: 1 }}>🌿</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "system-ui" }}>PedeFacil</div>
    </div>,
    { ...size }
  );
}
