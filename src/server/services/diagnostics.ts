import "server-only";
import { diagnoseBlock, type BlockDiagnostics } from "@/domain/block/diagnostics";
import { conditionsAt, hourlyProfile, type HourlyConditions } from "@/domain/block/pedestrian";
import type { Block } from "@/domain/block/schema";
import { DEFAULT_IVTU_CONFIG, type IvtuConfig } from "@/domain/ivtu/ivtu";
import type { DailyWeather } from "@/domain/thermal/diurnal";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";

export { NotFoundError };

/**
 * Serviço de diagnóstico: compõe repositórios (dados) e domínio (modelos).
 * Fluxo: rota da API → serviço → repositório (mock/PostGIS) + domínio (UTCI, IVTU, prescrição).
 */

export interface DiagnosedBlock {
  block: Block;
  diagnostics: BlockDiagnostics;
}

const cache = new Map<string, Promise<DiagnosedBlock[]>>();
const MAX_CACHE_ENTRIES = 24;

export async function getReferenceWeather(municipalityId: string): Promise<DailyWeather> {
  const weather = await getRepositories().weather.getReferenceDay(municipalityId);
  if (!weather) throw new NotFoundError(`Dia meteorológico de ${municipalityId}`);
  return weather;
}

/** Diagnóstico de todos os quarteirões do município, memoizado por configuração do IVTU. */
export function diagnoseMunicipality(
  municipalityId: string,
  ivtuConfig: IvtuConfig = DEFAULT_IVTU_CONFIG,
): Promise<DiagnosedBlock[]> {
  const key = `${municipalityId}:${JSON.stringify(ivtuConfig)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const repos = getRepositories();
    const [blocks, weather] = await Promise.all([
      repos.blocks.list({ municipalityId }),
      getReferenceWeather(municipalityId),
    ]);
    return blocks.map((block) => ({
      block,
      diagnostics: diagnoseBlock(block, weather, { ivtuConfig }),
    }));
  })();

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

export async function diagnoseBlockById(
  blockId: string,
  ivtuConfig?: IvtuConfig,
): Promise<DiagnosedBlock & { hourly: HourlyConditions[]; weather: DailyWeather }> {
  const block = await getRepositories().blocks.getById(blockId);
  if (!block) throw new NotFoundError(`Quarteirão ${blockId}`);
  const weather = await getReferenceWeather(block.municipalityId);
  const hourly = hourlyProfile(block, weather);
  return {
    block,
    weather,
    hourly,
    diagnostics: diagnoseBlock(block, weather, { ivtuConfig, profile: hourly }),
  };
}

/** UTCI de cada quarteirão numa hora específica (camada do slider de horário). */
export async function utciAtHour(
  municipalityId: string,
  hour: number,
): Promise<Map<string, number>> {
  const repos = getRepositories();
  const [blocks, weather] = await Promise.all([
    repos.blocks.list({ municipalityId }),
    getReferenceWeather(municipalityId),
  ]);
  return new Map(blocks.map((b) => [b.id, conditionsAt(b, weather, hour).utci]));
}
