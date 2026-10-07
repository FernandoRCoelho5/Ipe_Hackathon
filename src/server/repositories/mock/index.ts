import type { Adoption, MaintenanceTask } from "@/domain/adoption/schema";
import { isAlertActive, type HeatAlert } from "@/domain/alerts/schema";
import type { Block } from "@/domain/block/schema";
import { spamScore, type CitizenReport } from "@/domain/citizen/schema";
import type { IotNode, IotReading } from "@/domain/iot/schema";
import type { FieldChecklist } from "@/domain/prescription/checklist";
import { distanceMeters } from "@/domain/shared/geo";
import type { SavedScenario } from "@/domain/simulation/saved-scenario";
import type { DailyWeather } from "@/domain/thermal/diurnal";
import type { Page, PageRequest, Repositories } from "../types";
import { createTimeShift, type Clock } from "./clock";
import adoptionsJson from "./data/adoptions.json";
import alertsJson from "./data/alerts.json";
import blocksJson from "./data/blocks.json";
import citizenReportsJson from "./data/citizen-reports.json";
import iotNodesJson from "./data/iot-nodes.json";
import iotReadingsJson from "./data/iot-readings.json";
import metaJson from "./data/meta.json";
import weatherJson from "./data/weather.json";
import { mockMunicipalityRepository } from "./municipalities";

/**
 * Implementação mock dos repositórios sobre os dados demonstrativos
 * (gerados e validados por `npm run seed`).
 *
 * - Dados estáticos são congelados: nenhum consumidor consegue alterá-los.
 * - Escritas (relatos, moderação, parcerias, cenários, checklists) ficam em memória
 *   no processo do servidor e se perdem ao reiniciar — comportamento esperado da demo.
 */

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

const BLOCKS = deepFreeze(blocksJson as Block[]);
const BLOCKS_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]));
const WEATHER = deepFreeze(weatherJson as DailyWeather[]);
const NODES = deepFreeze(iotNodesJson as IotNode[]);
const READINGS = deepFreeze(iotReadingsJson as IotReading[]);
const READINGS_BY_NODE = Map.groupBy(READINGS, (r) => r.nodeId);
const REPORTS = deepFreeze(citizenReportsJson as CitizenReport[]);
const ADOPTIONS = deepFreeze(adoptionsJson as Adoption[]);
const ALERTS = deepFreeze(alertsJson as HeatAlert[]);
export const DEMO_META = deepFreeze(metaJson);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function paginate<T>(items: readonly T[], request: PageRequest = {}): Page<T> {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, request.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, request.page ?? 1);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

/** Estado mutável da demo (escritas feitas durante a apresentação). */
interface MockState {
  newReports: CitizenReport[];
  statusOverrides: Map<string, CitizenReport["status"]>;
  newAdoptions: Adoption[];
  scenarios: SavedScenario[];
  checklists: Map<string, FieldChecklist>;
}

function createState(): MockState {
  return {
    newReports: [],
    statusOverrides: new Map(),
    newAdoptions: [],
    scenarios: [],
    checklists: new Map(),
  };
}

function shortId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function nearestBlockId(
  municipalityId: string,
  location: readonly [number, number],
): string | null {
  let best: { id: string; d: number } | null = null;
  for (const block of BLOCKS) {
    if (block.municipalityId !== municipalityId) continue;
    const d = distanceMeters(block.centroid, location);
    if (!best || d < best.d) best = { id: block.id, d };
  }
  return best && best.d <= 200 ? best.id : null;
}

function initialMaintenance(adoptionId: string, start: Date): MaintenanceTask[] {
  const day = 86_400_000;
  const tasks: MaintenanceTask[] = [];
  for (let week = 1; week <= 6; week++) {
    tasks.push({
      id: `${adoptionId}-t${String(week).padStart(2, "0")}`,
      type: "irrigacao",
      dueDate: new Date(start.getTime() + week * 7 * day).toISOString().slice(0, 10),
      status: "pendente",
      predicted: false,
      reason: "Rega semanal nos primeiros 6 meses",
    });
  }
  tasks.push({
    id: `${adoptionId}-t07`,
    type: "adubacao",
    dueDate: new Date(start.getTime() + 90 * day).toISOString().slice(0, 10),
    status: "pendente",
    predicted: false,
    reason: "Adubação trimestral",
  });
  return tasks;
}

export interface MockRepositoryOptions {
  clock?: Clock;
}

export function createMockRepositories({
  clock = () => new Date(),
}: MockRepositoryOptions = {}): Repositories {
  const state = createState();
  const shift = () => createTimeShift(DEMO_META.anchor, clock());

  const shiftReport = (report: CitizenReport, s = shift()): CitizenReport => ({
    ...report,
    location: [...report.location],
    createdAt: s.instant(report.createdAt),
    status: state.statusOverrides.get(report.id) ?? report.status,
  });

  const allReports = (): CitizenReport[] => {
    const s = shift();
    const now = s.now.getTime();
    return [
      ...state.newReports.map((r) => ({
        ...r,
        status: state.statusOverrides.get(r.id) ?? r.status,
      })),
      ...REPORTS.map((r) => shiftReport(r, s)),
    ]
      .filter((r) => Date.parse(r.createdAt) <= now)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const shiftAdoption = (adoption: Adoption): Adoption => {
    const s = shift();
    return {
      ...adoption,
      adoptedAt: s.date(adoption.adoptedAt),
      ndviSeries: adoption.ndviSeries.map((o) => ({ ...o, date: s.date(o.date) })),
      maintenance: adoption.maintenance.map((t) => ({ ...t, dueDate: s.date(t.dueDate) })),
    };
  };

  return {
    municipalities: mockMunicipalityRepository,

    blocks: {
      async list({ municipalityId, neighborhood, zones }) {
        return BLOCKS.filter(
          (b) =>
            b.municipalityId === municipalityId &&
            (!neighborhood || b.neighborhood === neighborhood) &&
            (!zones || zones.length === 0 || zones.includes(b.zone)),
        );
      },
      async getById(id) {
        return BLOCKS_BY_ID.get(id) ?? null;
      },
      async listNeighborhoods(municipalityId) {
        const names = new Set(
          BLOCKS.filter((b) => b.municipalityId === municipalityId).map((b) => b.neighborhood),
        );
        return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
      },
    },

    weather: {
      async getReferenceDay(municipalityId) {
        const day = WEATHER.find((w) => w.municipalityId === municipalityId);
        return day ? { ...day, date: shift().date(day.date) } : null;
      },
    },

    alerts: {
      async listActive(municipalityId) {
        const s = shift();
        return ALERTS.map((a) => ({
          ...a,
          municipalityIds: [...a.municipalityIds],
          startsAt: s.instant(a.startsAt),
          endsAt: s.instant(a.endsAt),
        })).filter((a) => a.municipalityIds.includes(municipalityId) && isAlertActive(a, s.now));
      },
    },

    sensors: {
      async listNodes(municipalityId) {
        const s = shift();
        return NODES.filter((n) => !municipalityId || n.municipalityId === municipalityId).map(
          (n) => ({
            ...n,
            location: [...n.location],
            installedAt: s.instant(n.installedAt),
          }),
        );
      },
      async getNode(id) {
        const node = NODES.find((n) => n.id === id);
        if (!node) return null;
        return {
          ...node,
          location: [...node.location],
          installedAt: shift().instant(node.installedAt),
        };
      },
      async listReadings(nodeId, options = {}) {
        const s = shift();
        const readings = (READINGS_BY_NODE.get(nodeId) ?? [])
          .map((r) => ({ ...r, timestamp: s.instant(r.timestamp) }))
          .filter((r) => s.isPast(r.timestamp));
        if (!options.hours) return readings;
        const from = s.now.getTime() - options.hours * 3_600_000;
        return readings.filter((r) => Date.parse(r.timestamp) >= from);
      },
    },

    citizenReports: {
      async list(filter = {}) {
        const since = filter.since ? Date.parse(filter.since) : undefined;
        const items = allReports().filter(
          (r) =>
            (!filter.municipalityId || r.municipalityId === filter.municipalityId) &&
            (!filter.statuses?.length || filter.statuses.includes(r.status)) &&
            (!filter.categories?.length || filter.categories.includes(r.category)) &&
            (since === undefined || Date.parse(r.createdAt) >= since),
        );
        return paginate(items, filter);
      },
      async getById(id) {
        return allReports().find((r) => r.id === id) ?? null;
      },
      async create(input) {
        const report: CitizenReport = {
          id: `rel-web-${shortId()}`,
          municipalityId: input.municipalityId,
          blockId: nearestBlockId(input.municipalityId, input.location),
          location: [...input.location],
          category: input.category,
          text: input.text,
          createdAt: clock().toISOString(),
          anonId: `anon-${shortId().slice(0, 6)}`,
          channel: "web",
          spamScore: spamScore(input.text),
          status: "pendente",
          hasPhoto: false,
        };
        state.newReports.unshift(report);
        return report;
      },
      async countByStatus(filter = {}) {
        const since = filter.since ? Date.parse(filter.since) : undefined;
        const counts = { pendente: 0, validado: 0, descartado: 0, spam: 0 };
        for (const r of allReports()) {
          if (filter.municipalityId && r.municipalityId !== filter.municipalityId) continue;
          if (filter.categories?.length && !filter.categories.includes(r.category)) continue;
          if (since !== undefined && Date.parse(r.createdAt) < since) continue;
          counts[r.status] += 1;
        }
        return counts;
      },
      async updateStatus(id, status) {
        const exists =
          state.newReports.some((r) => r.id === id) || REPORTS.some((r) => r.id === id);
        if (!exists) return null;
        state.statusOverrides.set(id, status);
        return allReports().find((r) => r.id === id) ?? null;
      },
    },

    adoptions: {
      async list(municipalityId) {
        return [...state.newAdoptions, ...ADOPTIONS.map(shiftAdoption)].filter(
          (a) => !municipalityId || a.municipalityId === municipalityId,
        );
      },
      async getById(id) {
        const created = state.newAdoptions.find((a) => a.id === id);
        if (created) return created;
        const seeded = ADOPTIONS.find((a) => a.id === id);
        return seeded ? shiftAdoption(seeded) : null;
      },
      async create(input) {
        const block = BLOCKS_BY_ID.get(input.blockId);
        if (!block || block.municipalityId !== input.municipalityId) {
          throw new Error("Área inválida para o município informado");
        }
        const now = clock();
        const id = `adote-${shortId()}`;
        const adoption: Adoption = {
          id,
          municipalityId: input.municipalityId,
          blockId: block.id,
          areaName:
            block.zone === "verde"
              ? `${block.street} (${block.neighborhood})`
              : `Canteiros da ${block.street} (${block.neighborhood})`,
          partnerName: input.partnerName,
          partnerType: input.partnerType,
          status: "em-implantacao",
          adoptedAt: now.toISOString().slice(0, 10),
          commitments: {
            trees: input.trees,
            permeableAreaM2: input.permeableAreaM2,
            coolRoofAreaM2: input.coolRoofAreaM2,
            maintenanceMonths: input.maintenanceMonths,
          },
          ndviSeries: [
            {
              date: now.toISOString().slice(0, 10),
              ndvi: block.ndvi,
              sensor: "Sentinel-2",
              cloudy: false,
            },
          ],
          maintenance: initialMaintenance(id, now),
        };
        state.newAdoptions.unshift(adoption);
        return adoption;
      },
    },

    scenarios: {
      async list(municipalityId) {
        return state.scenarios.filter(
          (s) => !municipalityId || s.municipalityId === municipalityId,
        );
      },
      async getById(id) {
        return state.scenarios.find((s) => s.id === id) ?? null;
      },
      async save(input) {
        const saved: SavedScenario = {
          ...input,
          id: `cen-${shortId()}`,
          createdAt: clock().toISOString(),
        };
        state.scenarios.unshift(saved);
        return saved;
      },
    },

    checklists: {
      async get(blockId) {
        return state.checklists.get(blockId) ?? null;
      },
      async save(checklist) {
        const saved = {
          ...checklist,
          items: { ...checklist.items },
          updatedAt: clock().toISOString(),
        };
        state.checklists.set(checklist.blockId, saved);
        return saved;
      },
    },
  };
}
