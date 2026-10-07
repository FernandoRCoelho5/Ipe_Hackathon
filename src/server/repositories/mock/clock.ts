/**
 * Deslocamento temporal dos dados demonstrativos.
 *
 * O conjunto é gerado em torno de um instante fixo (`anchor`) para ser determinístico.
 * Na leitura, todas as datas são deslocadas em DIAS INTEIROS, de modo que a data local
 * do âncora coincida com a data local de hoje. Deslocar por dias (e não por horas)
 * preserva o ciclo diário: o pico de calor das leituras continua à tarde.
 *
 * O gerador produz dados até 23 h depois do âncora; o repositório descarta o que
 * ficar no futuro. Assim, o dado mais recente é sempre o da hora corrente.
 */
export type Clock = () => Date;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Horário de Brasília (sem horário de verão desde 2019). */
const LOCAL_OFFSET_MS = -3 * HOUR;

/** Índice do dia civil local (America/Sao_Paulo). */
export function localDayIndex(ms: number): number {
  return Math.floor((ms + LOCAL_OFFSET_MS) / DAY);
}

export interface TimeShift {
  /** Desloca um instante ISO 8601. */
  instant(isoString: string): string;
  /** Desloca uma data AAAA-MM-DD. */
  date(isoDate: string): string;
  /** Verdadeiro se o instante (já deslocado) não está no futuro. */
  isPast(shiftedIso: string): boolean;
  now: Date;
}

export function createTimeShift(anchorIso: string, now: Date): TimeShift {
  const offsetDays = localDayIndex(now.getTime()) - localDayIndex(Date.parse(anchorIso));
  const offsetMs = offsetDays * DAY;
  return {
    now,
    instant: (value) => new Date(Date.parse(value) + offsetMs).toISOString(),
    date: (value) =>
      new Date(Date.parse(`${value}T12:00:00Z`) + offsetMs).toISOString().slice(0, 10),
    isPast: (shifted) => Date.parse(shifted) <= now.getTime(),
  };
}
