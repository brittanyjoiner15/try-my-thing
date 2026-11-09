import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Link preview image for Slack, Discord, X and iMessage. Rendered once at build time.
export const alt = "try my thing: builders post, testers swipe.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = Uint8Array.from(await readFile(join(process.cwd(), "public/icons/icon-512.png"))).buffer;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 110px",
          background: "#f7f5ef",
          color: "#1d1f27",
        }}
      >
        <img src={logo} width={260} height={260} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            try my thing<span style={{ color: "#f54e00" }}>.</span>
          </div>
          <div style={{ fontSize: 40, color: "#65676f", marginTop: 12 }}>Builders post. Testers swipe.</div>
        </div>
      </div>
    ),
    size,
  );
}
