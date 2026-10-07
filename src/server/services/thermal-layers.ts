import "server-only";
import { hourlyProfile, type HourlyConditions } from "@/domain/block/pedestrian";
import { DAY_HOURS } from "@/domain/thermal/diurnal";
import { round } from "@/domain/shared/math";
import { classifyThermalStress } from "@/domain/thermal/stress";
import {
  LEGAL_SEAL,
  type BlockDetailResponse,
  type MapLayersResponse,
  type RankingParams,
  type RankingResponse,
  type RankingRow,
  type UtciByHourResponse,
} from "@/lib/api/contracts";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import {
  diagnoseBlockById,
  diagnoseMunicipality,
  getReferenceWeather,
  utciAtHour,
  type DiagnosedBlock,
} from "./diagnostics";

/** Aviso de honestidade dos dados em toda resposta de diagnóstico. */
export const DATA_NOTICE = { demo: true, seal: LEGAL_SEAL } as const;

export async function requireMunicipality(municipalityId: string) {
  const municipality = await getRepositories().municipalities.getById(municipalityId);
  if (!municipality) throw new NotFoundError(`Município "${municipalityId}"`);
  return municipality;
}

/** Arredonda coordenadas a 5 casas (~1 m): reduz o payload do mapa em ~15%. */
function compactPolygon(polygon: DiagnosedBlock["block"]["geometry"]) {
  return {
    type: "Polygon" as const,
    coordinates: polygon.coordinates.map((ring) =>
      ring.map(([lng, lat]) => [round(lng, 5), round(lat, 5)] as [number, number]),
    ),
  };
}

function extent(values: number[]): [number, number] {
  return [round(Math.min(...values), 1), round(Math.max(...values), 1)];
}

/** Camadas térmicas do município (GeoJSON) para a hora solicitada. */
export async function buildMapLayers(
  municipalityId: string,
  hour: number,
): Promise<MapLayersResponse> {
  await requireMunicipality(municipalityId);
  const [diagnosed, utciByBlock, weather] = await Promise.all([
    diagnoseMunicipality(municipalityId),
    utciAtHour(municipalityId, hour),
    getReferenceWeather(municipalityId),
  ]);

  const features = diagnosed.map(({ block, diagnostics }) => {
    const utci = utciByBlock.get(block.id) ?? diagnostics.utciPeak;
    const primary = diagnostics.prescription.primary;
    return {
      type: "Feature" as const,
      id: block.id,
      geometry: compactPolygon(block.geometry),
      properties: {
        id: block.id,
        code: block.code,
        neighborhood: block.neighborhood,
        street: block.street,
        zone: block.zone,
        lstC: block.lstC,
        utci: round(utci, 1),
        stressCategory: classifyId(utci),
        utciPeak: diagnostics.utciPeak,
        ivtu: diagnostics.ivtu.score,
        ivtuLevel: diagnostics.ivtu.level,
        canopyCover: block.canopyCover,
        imperviousness: block.imperviousness,
        drainageRisk: diagnostics.drainageRisk,
        pedestrianFlow: block.pedestrianFlow,
        recommendation: primary
          ? {
              type: primary.type,
              variant: primary.variant,
              level: primary.level,
              title: primary.title,
            }
          : null,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
    meta: {
      municipalityId,
      hour,
      weather,
      ranges: {
        lstC: extent(features.map((f) => f.properties.lstC)),
        utci: extent(features.map((f) => f.properties.utci)),
      },
      notice: DATA_NOTICE,
    },
  };
}

function classifyId(utci: number) {
  return classifyThermalStress(utci).id;
}

/** UTCI horário (08h–18h) de todos os quarteirões, memoizado por município. */
const utciByHourCache = new Map<string, Promise<UtciByHourResponse>>();

export function buildUtciByHour(municipalityId: string): Promise<UtciByHourResponse> {
  const cached = utciByHourCache.get(municipalityId);
  if (cached) return cached;
  const promise = (async () => {
    await requireMunicipality(municipalityId);
    const [blocks, weather] = await Promise.all([
      getRepositories().blocks.list({ municipalityId }),
      getReferenceWeather(municipalityId),
    ]);
    const values: Record<string, number[]> = {};
    for (const block of blocks) {
      values[block.id] = hourlyProfile(block, weather).map((c) => round(c.utci, 1));
    }
    return { municipalityId, hours: [...DAY_HOURS], values, notice: DATA_NOTICE };
  })();
  utciByHourCache.set(municipalityId, promise);
  promise.catch(() => utciByHourCache.delete(municipalityId));
  return promise;
}

function toHourlyDto(c: HourlyConditions) {
  return {
    hour: c.hour,
    airTemp: round(c.airTemp, 2),
    relativeHumidity: round(c.relativeHumidity, 3),
    windSpeed: round(c.windSpeed, 2),
    solarRadiation: round(c.solarRadiation, 0),
    surfaceTemp: round(c.surfaceTemp, 2),
    meanRadiantTemp: round(c.meanRadiantTemp, 2),
    utci: round(c.utci, 2),
    stressCategory: c.category.id,
  };
}

export async function buildBlockDetail(blockId: string): Promise<BlockDetailResponse> {
  const { block, diagnostics, hourly, weather } = await diagnoseBlockById(blockId);
  return { block, diagnostics, hourly: hourly.map(toHourlyDto), weather, notice: DATA_NOTICE };
}

function toRankingRow({ block, diagnostics }: DiagnosedBlock, rank: number): RankingRow {
  const primary = diagnostics.prescription.primary;
  return {
    rank,
    id: block.id,
    code: block.code,
    neighborhood: block.neighborhood,
    street: block.street,
    zone: block.zone,
    centroid: block.centroid,
    ivtu: diagnostics.ivtu.score,
    ivtuLevel: diagnostics.ivtu.level,
    utciPeak: diagnostics.utciPeak,
    stressCategory: diagnostics.stressCategory,
    drainageRisk: diagnostics.drainageRisk,
    canopyCover: block.canopyCover,
    pedestrianFlow: block.pedestrianFlow,
    recommendation: primary
      ? {
          id: primary.id,
          type: primary.type,
          variant: primary.variant,
          level: primary.level,
          title: primary.title,
          priority: primary.priority,
          confidence: primary.confidence,
        }
      : null,
    additionalRecommendations: Math.max(0, diagnostics.prescription.recommendations.length - 1),
  };
}

const SORTERS: Record<
  "ivtu" | "utci" | "priority" | "code",
  (a: DiagnosedBlock, b: DiagnosedBlock) => number
> = {
  ivtu: (a, b) => a.diagnostics.ivtu.score - b.diagnostics.ivtu.score,
  utci: (a, b) => a.diagnostics.utciPeak - b.diagnostics.utciPeak,
  priority: (a, b) =>
    (a.diagnostics.prescription.primary?.priority ?? -1) -
    (b.diagnostics.prescription.primary?.priority ?? -1),
  code: (a, b) => a.block.code.localeCompare(b.block.code),
};

/**
 * Ranking IVTU paginado. A posição (`rank`) é sempre a do IVTU no município,
 * independentemente da ordenação escolhida na tabela.
 */
export async function buildRanking(query: RankingParams): Promise<RankingResponse> {
  await requireMunicipality(query.municipality);
  const diagnosed = await diagnoseMunicipality(query.municipality);

  const ivtuRank = new Map(
    [...diagnosed].sort((a, b) => SORTERS.ivtu(b, a)).map((d, index) => [d.block.id, index + 1]),
  );

  const search = query.search?.toLocaleLowerCase("pt-BR");
  const filtered = diagnosed.filter(({ block, diagnostics }) => {
    const primary = diagnostics.prescription.primary;
    return (
      (!query.neighborhood || block.neighborhood === query.neighborhood) &&
      (!query.zones?.length || query.zones.includes(block.zone)) &&
      (!query.ivtuLevels?.length || query.ivtuLevels.includes(diagnostics.ivtu.level)) &&
      (!query.executionLevel || primary?.level === query.executionLevel) &&
      (!query.intervention ||
        diagnostics.prescription.recommendations.some((r) => r.type === query.intervention)) &&
      (!search ||
        block.code.toLocaleLowerCase("pt-BR").includes(search) ||
        block.street.toLocaleLowerCase("pt-BR").includes(search) ||
        block.neighborhood.toLocaleLowerCase("pt-BR").includes(search))
    );
  });

  const direction = query.order === "asc" ? 1 : -1;
  const sorted = [...filtered].sort(
    (a, b) => direction * SORTERS[query.sort](a, b) || a.block.code.localeCompare(b.block.code),
  );
  const start = (query.page - 1) * query.pageSize;
  const pageItems = sorted.slice(start, start + query.pageSize);

  const levelCounts = { baixo: 0, medio: 0, alto: 0, critico: 0 };
  for (const d of filtered) levelCounts[d.diagnostics.ivtu.level] += 1;

  return {
    data: pageItems.map((d) => toRankingRow(d, ivtuRank.get(d.block.id) ?? 0)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / query.pageSize),
      neighborhoods: [...new Set(diagnosed.map((d) => d.block.neighborhood))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
      levelCounts,
      notice: DATA_NOTICE,
    },
  };
}

export { toRankingRow };
