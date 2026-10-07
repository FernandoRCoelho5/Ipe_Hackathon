/**
 * Deslocamento temporal dos dados demonstrativos.
 *
 * O conjunto é gerado em torno de um instante fixo (`anchor`) para ser determinístico.
 * Na leitura, todas as datas são deslocadas para que o "agora" do conjunto coincida
 * com a hora cheia atual: o último relato parece de minutos atrás e as leituras IoT
 * chegam até a hora corrente, sem perder a reprodutibilidade.
 */
export type Clock = () => Date;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface TimeShift {
  /** Desloca um instante ISO 8601. */
  instant(isoString: string): string;
  /** Desloca uma data AAAA-MM-DD (dias inteiros). */
  date(isoDate: string): string;
  now: Date;
}

export function createTimeShift(anchorIso: string, now: Date): TimeShift {
  const currentHour = Math.floor(now.getTime() / HOUR) * HOUR;
  const offsetMs = currentHour - Date.parse(anchorIso);
  const offsetDays = Math.round(offsetMs / DAY);
  return {
    now,
    instant: (value) => new Date(Date.parse(value) + offsetMs).toISOString(),
    date: (value) =>
      new Date(Date.parse(`${value}T12:00:00Z`) + offsetDays * DAY).toISOString().slice(0, 10),
  };
}
