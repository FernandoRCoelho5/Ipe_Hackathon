import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { utciColor } from "@/components/map/scales";
import { messages } from "@/lib/i18n";
import { buildShowcase } from "@/server/services/showcase";

export const alt = `${messages.brand.fullName}: ${messages.landing.hero.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "public", "fonts", "poppins");

/** Recorte real do mapa de calor (dados demonstrativos) como SVG embutido. */
async function heatMapDataUri(): Promise<string | null> {
  const showcase = await buildShowcase();
  if (!showcase) return null;
  const paths = showcase.blocks
    .map(
      (b) =>
        `<path d="${b.path}" fill="${utciColor(b.utciPeak)}" stroke="#083e28" stroke-width="2"/>`,
    )
    .join("");
  const focus = showcase.blocks.find((b) => b.id === showcase.focus.id);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${showcase.width} ${showcase.height}"><rect width="100%" height="100%" fill="#0b4f33"/>${paths}${focus ? `<path d="${focus.path}" fill="none" stroke="#fab20a" stroke-width="6"/>` : ""}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Fontes e mapa em cache: a imagem é gerada no build, sem E/S por requisição. */
async function imageAssets() {
  "use cache";
  const [bold, medium, map] = await Promise.all([
    readFile(join(fonts, "Poppins-Bold.ttf")),
    readFile(join(fonts, "Poppins-Medium.ttf")),
    heatMapDataUri(),
  ]);
  return { bold: new Uint8Array(bold), medium: new Uint8Array(medium), map };
}

/** ArrayBuffer exato da fonte (o cache pode devolver uma vista sobre um buffer maior). */
function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

/** Imagem de compartilhamento (Open Graph e Twitter). */
export default async function OpenGraphImage() {
  const { bold, medium, map } = await imageAssets();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#083e28",
        color: "#ffffff",
        fontFamily: "Poppins",
      }}
    >
      <div
        style={{
          height: 14,
          display: "flex",
          backgroundImage: "linear-gradient(90deg, #083e28, #1e842d 35%, #82b930 68%, #fab20a)",
        }}
      />
      <div style={{ flex: 1, display: "flex", padding: "56px 64px", gap: 48 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>ipê</span>
            <span style={{ fontSize: 22, fontWeight: 500, color: "#82b930" }}>
              {messages.brand.tagline}
            </span>
          </div>
          <div style={{ width: 96, height: 8, borderRadius: 8, background: "#fab20a" }} />
          <p style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.18, margin: 0 }}>
            {messages.landing.hero.title}
          </p>
          <p style={{ marginTop: "auto", fontSize: 22, fontWeight: 500, color: "#d9eadf" }}>
            {messages.landing.hero.regionNote}
          </p>
        </div>
        {map && (
          <div
            style={{
              width: 420,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
            <img
              src={map}
              width={420}
              height={257}
              alt=""
              style={{ borderRadius: 24, border: "4px solid #1e842d" }}
            />
            <span style={{ fontSize: 18, fontWeight: 500, color: "#a9bfb1" }}>
              {messages.demoData.badge} · UTCI
            </span>
          </div>
        )}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Poppins", data: exactBuffer(bold), weight: 700, style: "normal" },
        { name: "Poppins", data: exactBuffer(medium), weight: 500, style: "normal" },
      ],
    },
  );
}
