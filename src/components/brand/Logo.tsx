import { useId } from "react";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { SYMBOL, WORDMARK } from "./logo-geometry";

export type LogoVariant = "horizontal" | "symbol" | "wordmark";
/** `positive`: fundos claros (preferencial). `negative`: Verde Ipê ou fundos escuros. */
export type LogoTone = "positive" | "negative";

interface LogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  /** Texto alternativo. Use `decorative` quando houver um rótulo visível ao lado. */
  title?: string;
  decorative?: boolean;
}

/**
 * Logotipo Ipê, conforme o Manual de Identidade Visual.
 * Tamanho mínimo digital: 140 px (assinatura horizontal) e 40 px (símbolo).
 * Mantenha área de proteção de 2X ao redor (X = diâmetro do pingo do "i").
 */
export function Logo({
  variant = "horizontal",
  tone = "positive",
  className,
  title = messages.brand.logoLabel,
  decorative = false,
}: LogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const negative = tone === "negative";
  const ink = negative ? "#ffffff" : "#083e28";
  const taglineInk = negative ? "#ffffff" : "#1e842d";

  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-labelledby": `${uid}-title` } as const);

  const symbol = (
    <g>
      {negative && <circle cx="60" cy="60" r="60" fill="#f9f9f3" />}
      <g transform={negative ? "translate(60 61) scale(0.76) translate(-60 -60)" : undefined}>
        <SymbolArt uid={uid} />
      </g>
    </g>
  );

  const wordmark = (
    <g fill={ink}>
      <circle cx={WORDMARK.iDot.cx} cy={WORDMARK.iDot.cy} r={WORDMARK.iDot.r} />
      <rect {...WORDMARK.iStem} />
      <rect {...WORDMARK.pStem} />
      <path d={WORDMARK.pBowl} fillRule="evenodd" />
      <g transform={WORDMARK.leafTransform}>
        <path d={WORDMARK.leaf} fill={negative ? "#82b930" : "#1e842d"} />
        <path
          d={WORDMARK.leafVein}
          fill="none"
          stroke={negative ? "#083e28" : "#ffffff"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
      <path d={WORDMARK.eBowl} />
      <rect {...WORDMARK.eBar} />
      <path d={WORDMARK.circumflex} />
    </g>
  );

  const tagline = (y: number, x: number) => (
    <text
      x={x}
      y={y}
      fill={taglineInk}
      fontSize="10.5"
      fontWeight={500}
      textLength="153"
      lengthAdjust="spacingAndGlyphs"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {messages.brand.tagline}
    </text>
  );

  const titleNode = decorative ? null : <title id={`${uid}-title`}>{title}</title>;

  if (variant === "symbol") {
    return (
      <svg viewBox={SYMBOL.viewBox} className={cn("shrink-0", className ?? "h-10")} {...a11y}>
        {titleNode}
        {symbol}
      </svg>
    );
  }

  if (variant === "wordmark") {
    return (
      <svg viewBox="146 0 157 104" className={cn("shrink-0", className ?? "h-10")} {...a11y}>
        {titleNode}
        <g transform="translate(148 20.56) scale(0.36)">{wordmark}</g>
        {tagline(92, 148)}
        {!negative && <rect x="148" y="98.5" width="46" height="3.5" rx="1.75" fill="#fab20a" />}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 303 120" className={cn("shrink-0", className ?? "h-10")} {...a11y}>
      {titleNode}
      <defs>
        <linearGradient id={`${uid}-divider`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fab20a" />
          <stop offset="0.35" stopColor="#82b930" />
          <stop offset="0.65" stopColor="#1e842d" />
          <stop offset="1" stopColor="#083e28" />
        </linearGradient>
      </defs>
      {symbol}
      {!negative && (
        <rect x="132" y="10" width="3" height="100" rx="1.5" fill={`url(#${uid}-divider)`} />
      )}
      <g transform="translate(148 20.56) scale(0.36)">{wordmark}</g>
      {tagline(92, 148)}
      {!negative && <rect x="148" y="98.5" width="46" height="3.5" rx="1.75" fill="#fab20a" />}
    </svg>
  );
}

/** Ilustração do símbolo: cidade, árvore, sol com termômetro, rio, colina e circuito. */
function SymbolArt({ uid }: { uid: string }) {
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <>
      <defs>
        <clipPath id={id("heart")}>
          <path d={SYMBOL.heart} />
        </clipPath>
        <linearGradient id={id("sky-blue")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#159ebf" />
          <stop offset="1" stopColor="#046a8f" />
        </linearGradient>
        <linearGradient id={id("tower")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1fb0d2" />
          <stop offset="1" stopColor="#046a8f" />
        </linearGradient>
        <radialGradient id={id("sun")} cx="0.45" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fa6f14" />
          <stop offset="0.55" stopColor="#fb8c12" />
          <stop offset="1" stopColor="#fab20a" />
        </radialGradient>
        <linearGradient id={id("canopy")} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#82b930" />
          <stop offset="1" stopColor="#1e842d" />
        </linearGradient>
        <linearGradient id={id("hill")} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#82b930" />
          <stop offset="1" stopColor="#1e842d" />
        </linearGradient>
        <linearGradient id={id("river")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#046a8f" />
          <stop offset="1" stopColor="#159ebf" />
        </linearGradient>
      </defs>

      {/* Elementos que vazam o coração: arco azul e ondas de calor do sol */}
      <path d={SYMBOL.swoosh} fill={url("sky-blue")} />
      <g fill="none" stroke="#fab20a" strokeWidth="3.4" strokeLinecap="round">
        {SYMBOL.sunArcs.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <g clipPath={url("heart")}>
        {/* Sol com termômetro */}
        <circle cx="82" cy="36" r="16.5" fill={url("sun")} />

        {/* Edifícios */}
        <rect x="36" y="30" width="12" height="50" fill="#1b8db0" />
        <rect x="46" y="16" width="14" height="64" fill={url("tower")} />
        <rect x="60" y="26" width="12" height="54" fill="#046a8f" />
        <rect x="88" y="46" width="10" height="34" fill={url("tower")} />
        <rect x="98" y="54" width="12" height="26" fill="#0f7fa3" />
        <g stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.2" strokeLinecap="round">
          <path d="M51 22V64M55 22V64M66 32V62M92 52V68" />
        </g>

        <circle cx="82" cy="52" r="4.6" fill="#fa6f14" stroke="#ffffff" strokeWidth="1.6" />
        <path d="M82 27V50" stroke="#7a2a12" strokeWidth="3.4" strokeLinecap="round" />

        {/* Vegetação de fundo */}
        <g fill="#3e9a35">
          <circle cx="52" cy="72" r="10" />
          <circle cx="66" cy="74" r="9" />
          <circle cx="80" cy="76" r="8" />
          <circle cx="94" cy="77" r="7" />
        </g>

        {/* Terreno, rio e colina */}
        <path d={SYMBOL.land} fill="#2f8f2e" />
        <path d={SYMBOL.river} fill={url("river")} />
        <path d={SYMBOL.hillShadow} fill="#0b4f33" />
        <path d={SYMBOL.hill} fill={url("hill")} />

        {/* Árvore */}
        <path d="M26 92V60" stroke="#0b4f33" strokeWidth="3" strokeLinecap="round" />
        <g fill={url("canopy")}>
          <circle cx="24" cy="40" r="15" />
          <circle cx="37" cy="46" r="11" />
          <circle cx="13" cy="54" r="10" />
          <circle cx="29" cy="58" r="12" />
          <circle cx="41" cy="61" r="8" />
        </g>
        <path
          d="M27 86C25 76 20 70 14 66C21 68 25 72 27 78C28 70 31 64 36 60C33 67 31 76 30 86Z"
          fill="#1e842d"
        />

        {/* Circuito: sensores, dados e inteligência */}
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {SYMBOL.circuits.map((d) => (
            <path key={d} d={d} />
          ))}
          {SYMBOL.circuitNodes.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.1" />
          ))}
        </g>
      </g>
    </>
  );
}
