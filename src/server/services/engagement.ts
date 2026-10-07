import "server-only";
import { ndviTrendPer30Days, type Adoption, type NewAdoption } from "@/domain/adoption/schema";
import { conditionsAt } from "@/domain/block/pedestrian";
import type { NewCitizenReport, ReportStatus } from "@/domain/citizen/schema";
import { computeEsgImpact } from "@/domain/esg/esg";
import { iotStatus } from "@/domain/iot/schema";
import { mean, pearson, round } from "@/domain/shared/math";
import type { AdoptionSummary } from "@/lib/api/contracts";
import { HttpError, NotFoundError } from "@/server/errors";
import { getRepositories, type CitizenReportFilter } from "@/server/repositories";
import { getReferenceWeather } from "./diagnostics";
import { requireMunicipality } from "./thermal-layers";

// ─────────────────────────── Ciência cidadã ───────────────────────────

export async function listCitizenReports(filter: CitizenReportFilter) {
  const repos = getRepositories();
  if (filter.municipalityId) await requireMunicipality(filter.municipalityId);
  // As contagens por status ignoram o filtro de status (alimentam as abas de moderação).
  const countFilter = {
    municipalityId: filter.municipalityId,
    categories: filter.categories,
    since: filter.since,
  };
  const [page, statusCounts] = await Promise.all([
    repos.citizenReports.list(filter),
    repos.citizenReports.countByStatus(countFilter),
  ]);
  return {
    data: page.items,
    meta: {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: Math.ceil(page.total / page.pageSize),
      statusCounts,
    },
  };
}

export async function createCitizenReport(input: NewCitizenReport) {
  await requireMunicipality(input.municipalityId);
  return getRepositories().citizenReports.create(input);
}

export async function moderateCitizenReport(id: string, status: ReportStatus) {
  const updated = await getRepositories().citizenReports.updateStatus(id, status);
  if (!updated) throw new NotFoundError(`Relato ${id}`);
  return updated;
}

// ─────────────────────────── IoT ───────────────────────────

export async function listIotNodes(municipalityId?: string) {
  const repos = getRepositories();
  if (municipalityId) await requireMunicipality(municipalityId);
  const nodes = await repos.sensors.listNodes(municipalityId);
  const now = new Date();
  return Promise.all(
    nodes.map(async (node) => {
      const readings = await repos.sensors.listReadings(node.id, { hours: 24 });
      const all = readings.length > 0 ? readings : await repos.sensors.listReadings(node.id);
      const latest = all.at(-1) ?? null;
      return {
        node,
        status: iotStatus(latest ?? undefined, now),
        latest,
        sparkline: readings.map((r) => r.temperatureC),
      };
    }),
  );
}

export async function listIotReadings(nodeId: string, hours: number) {
  const repos = getRepositories();
  if (!(await repos.sensors.getNode(nodeId))) throw new NotFoundError(`Nó ${nodeId}`);
  return repos.sensors.listReadings(nodeId, { hours });
}

/**
 * Calibração: compara a temperatura medida pelos nós com a temperatura do ar do modelo
 * no quarteirão do nó (mesma hora local), com UTCI e LST de satélite como contexto.
 */
export async function buildCalibration(municipalityId?: string, hours = 72) {
  const repos = getRepositories();
  if (municipalityId) await requireMunicipality(municipalityId);
  const nodes = await repos.sensors.listNodes(municipalityId);
  const points = [];

  for (const node of nodes) {
    const block = await repos.blocks.getById(node.blockId);
    if (!block) continue;
    const weather = await getReferenceWeather(node.municipalityId);
    for (const reading of await repos.sensors.listReadings(node.id, { hours })) {
      const localHour = (new Date(reading.timestamp).getUTCHours() + 21) % 24; // UTC−3
      const model = conditionsAt(block, weather, localHour);
      points.push({
        nodeId: node.id,
        nodeCode: node.code,
        timestamp: reading.timestamp,
        sensorTempC: reading.temperatureC,
        modelAirTempC: round(model.airTemp, 2),
        modelUtci: round(model.utci, 2),
        satelliteLstC: block.lstC,
      });
    }
  }

  const errors = points.map((p) => p.sensorTempC - p.modelAirTempC);
  return {
    data: points,
    stats: {
      points: points.length,
      bias: round(mean(errors), 2),
      rmse: round(Math.sqrt(mean(errors.map((e) => e * e))), 2),
      pearson: round(
        pearson(
          points.map((p) => p.sensorTempC),
          points.map((p) => p.modelAirTempC),
        ),
        3,
      ),
    },
  };
}

// ─────────────────────────── Adote uma Ilha Verde ───────────────────────────

function summarize(adoption: Adoption): AdoptionSummary {
  const today = new Date().toISOString().slice(0, 10);
  const pending = adoption.maintenance
    .filter((t) => t.status !== "concluida")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    adoption,
    ndviTrend30d: round(ndviTrendPer30Days(adoption.ndviSeries), 4),
    esg: computeEsgImpact({
      trees: adoption.commitments.trees,
      permeableAreaM2: adoption.commitments.permeableAreaM2,
      coolRoofAreaM2: adoption.commitments.coolRoofAreaM2,
      horizonYears: 10,
    }),
    nextTask: pending.find((t) => t.dueDate >= today) ?? null,
    overdueTasks: adoption.maintenance.filter(
      (t) => t.status === "atrasada" || (t.status === "pendente" && t.dueDate < today),
    ).length,
  };
}

export async function listAdoptions(municipalityId?: string) {
  if (municipalityId) await requireMunicipality(municipalityId);
  const adoptions = await getRepositories().adoptions.list(municipalityId);
  return adoptions.map(summarize);
}

export async function getAdoption(id: string) {
  const adoption = await getRepositories().adoptions.getById(id);
  if (!adoption) throw new NotFoundError(`Parceria ${id}`);
  return summarize(adoption);
}

export async function createAdoption(input: NewAdoption) {
  await requireMunicipality(input.municipalityId);
  const block = await getRepositories().blocks.getById(input.blockId);
  if (!block || block.municipalityId !== input.municipalityId) {
    throw new HttpError(400, "bad_request", "A área escolhida não pertence ao município informado");
  }
  return summarize(await getRepositories().adoptions.create(input));
}
