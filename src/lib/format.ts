/**
 * Formatação numérica e de datas em pt-BR.
 * Todos os números exibidos na interface e nos relatórios passam por aqui,
 * para manter vírgula decimal, separador de milhar e unidades consistentes.
 */

export const LOCALE = "pt-BR";
export const TIME_ZONE = "America/Sao_Paulo";

/** Espaço não separável entre número e unidade ("38,4 °C" não quebra linha). */
const NBSP = " ";
/** Sinal de menos tipográfico, usado em variações negativas. */
const MINUS = "−";

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

function decimalFormatter(digits: number) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatDecimal(value: number, digits = 1): string {
  return decimalFormatter(digits).format(value);
}

/** 38.42 → "38,4 °C" */
export function formatTemperature(value: number, digits = 1): string {
  return `${formatDecimal(value, digits)}${NBSP}°C`;
}

/**
 * Variação com sinal explícito: −2.3 → "−2,3 °C"; 1.2 → "+1,2 °C"; 0 → "0,0 °C".
 */
export function formatSignedTemperature(value: number, digits = 1): string {
  return `${formatSigned(value, digits)}${NBSP}°C`;
}

/** Número com sinal explícito e menos tipográfico. */
export function formatSigned(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return formatDecimal(0, digits);
  const abs = formatDecimal(Math.abs(rounded), digits);
  return rounded > 0 ? `+${abs}` : `${MINUS}${abs}`;
}

/**
 * Percentual a partir de fração: 0.18 → "18%".
 * Use `signed` para variações: 0.18 → "+18%".
 */
export function formatPercent(
  fraction: number,
  { digits = 0, signed = false }: { digits?: number; signed?: boolean } = {},
): string {
  const value = fraction * 100;
  const body = signed ? formatSigned(value, digits) : formatDecimal(value, digits);
  return `${body}%`;
}

const brlFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "BRL" });
const brlCompactFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 218020 → "R$ 218.020,00"; com `compact`: "R$ 218,0 mil". */
export function formatCurrency(value: number, { compact = false } = {}): string {
  return (compact ? brlCompactFormatter : brlFormatter).format(value);
}

const dateFormatters = {
  short: new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "short" }),
  medium: new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "medium" }),
  long: new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "long" }),
  dayMonth: new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
  }),
} as const;

export type DateStyle = keyof typeof dateFormatters;

export function formatDate(input: Date | string | number, style: DateStyle = "medium"): string {
  return dateFormatters[style].format(new Date(input));
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(input: Date | string | number): string {
  return dateTimeFormatter.format(new Date(input));
}

/** Hora do dia (inteira ou fracionária) → "08:00", "13:30". */
export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

/** "há 5 minutos", "ontem", "em 2 dias". `now` é explícito para manter a função pura. */
export function formatRelativeTime(input: Date | string | number, now: Date | number): string {
  const diffSeconds = (new Date(input).getTime() - new Date(now).getTime()) / 1000;
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds || unit === "second") {
      return relativeFormatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return relativeFormatter.format(0, "second");
}
