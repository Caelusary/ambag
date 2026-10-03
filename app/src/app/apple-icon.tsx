import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icons get no transparency on iOS, so the ring sits on the app's cream ground.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4e9d6",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 100 100">
        <g fill="none" strokeWidth="14" strokeLinecap="round">
          <path d="M33.52 20.26A34 34 0 0 1 66.48 20.26" stroke="#c67139" />
          <path d="M79.74 33.52A34 34 0 0 1 79.74 66.48" stroke="#647550" />
          <path d="M66.48 79.74A34 34 0 0 1 33.52 79.74" stroke="#dd9563" />
          <path d="M20.26 66.48A34 34 0 0 1 20.26 33.52" stroke="#522a15" />
        </g>
      </svg>
    </div>,
    size,
  );
}
