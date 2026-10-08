import { lstColor, utciColor } from "@/components/map/scales";
import { cn } from "@/lib/cn";
import type { Showcase } from "@/server/services/showcase";

interface ShowcaseMapProps {
  showcase: Showcase;
  /** `utci`: quarteirões (o que o Ipê entrega). `pixels`: grade de 30 m (o que o satélite vê). */
  mode: "utci" | "pixels";
  label: string;
  /** Destaca o quarteirão crítico com um anel pulsante (respeita movimento reduzido). */
  highlight?: boolean;
  className?: string;
}

/**
 * Recorte do mapa de calor em SVG estático (sem MapLibre): leve para a landing e
 * idêntico aos dados demonstrativos da plataforma. As ruas são o fundo entre os quarteirões.
 */
export function ShowcaseMap({
  showcase,
  mode,
  label,
  highlight = false,
  className,
}: ShowcaseMapProps) {
  const { width, height, pixelSize, blocks, pixels, focus } = showcase;
  const focusBlock = blocks.find((b) => b.id === focus.id);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-auto w-full", className)}
    >
      <rect width={width} height={height} fill="var(--surface-sunken)" />
      {mode === "pixels" ? (
        <g>
          {pixels.map((p) => (
            <rect
              key={`${p.x}-${p.y}`}
              x={p.x}
              y={p.y}
              width={pixelSize}
              height={pixelSize}
              fill={lstColor(p.lst)}
              stroke="var(--surface)"
              strokeOpacity={0.45}
              strokeWidth={0.8}
            />
          ))}
        </g>
      ) : (
        <g>
          {blocks.map((b) => (
            <path
              key={b.id}
              d={b.path}
              fill={utciColor(b.utciPeak)}
              stroke="var(--surface)"
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          ))}
          {focusBlock && (
            <g fill="none" stroke="#fab20a" strokeLinejoin="round">
              {highlight && <path d={focusBlock.path} className="pulse-ring" strokeWidth={3} />}
              <path d={focusBlock.path} strokeWidth={4} />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
