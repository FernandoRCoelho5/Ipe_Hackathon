import type { Adoption, NewAdoption } from "@/domain/adoption/schema";
import type { HeatAlert } from "@/domain/alerts/schema";
import type { Block, Zone } from "@/domain/block/schema";
import type {
  CitizenReport,
  NewCitizenReport,
  ReportCategory,
  ReportStatus,
} from "@/domain/citizen/schema";
import type { IotNode, IotReading } from "@/domain/iot/schema";
import type { Municipality } from "@/domain/municipality/types";
import type { FieldChecklist } from "@/domain/prescription/checklist";
import type { SavedScenario } from "@/domain/simulation/saved-scenario";
import type { DailyWeather } from "@/domain/thermal/diurnal";

/**
 * Contratos de acesso a dados.
 * Telas e rotas da API dependem apenas destes contratos; a implementação `mock`
 * (dados demonstrativos) pode ser trocada por PostGIS ou pelo backend FastAPI sem
 * mudanças no domínio ou na interface. Ver docs/ARCHITECTURE.md.
 */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageRequest {
  /** Página a partir de 1. */
  page?: number;
  pageSize?: number;
}

export interface MunicipalityRepository {
  list(): Promise<Municipality[]>;
  getById(id: string): Promise<Municipality | null>;
}

export interface BlockFilter {
  municipalityId: string;
  neighborhood?: string;
  zones?: readonly Zone[];
}

export interface BlockRepository {
  list(filter: BlockFilter): Promise<Block[]>;
  getById(id: string): Promise<Block | null>;
  listNeighborhoods(municipalityId: string): Promise<string[]>;
}

export interface WeatherRepository {
  /** Dia de referência do município (no piloto: estação INMET mais próxima). */
  getReferenceDay(municipalityId: string): Promise<DailyWeather | null>;
}

export interface AlertRepository {
  listActive(municipalityId: string): Promise<HeatAlert[]>;
}

export interface SensorRepository {
  listNodes(municipalityId?: string): Promise<IotNode[]>;
  getNode(id: string): Promise<IotNode | null>;
  /** Leituras em ordem cronológica, opcionalmente limitadas às últimas `hours` horas. */
  listReadings(nodeId: string, options?: { hours?: number }): Promise<IotReading[]>;
}

export interface CitizenReportFilter extends PageRequest {
  municipalityId?: string;
  statuses?: readonly ReportStatus[];
  categories?: readonly ReportCategory[];
  /** Apenas relatos a partir deste instante (ISO). */
  since?: string;
}

export interface CitizenReportRepository {
  list(filter?: CitizenReportFilter): Promise<Page<CitizenReport>>;
  getById(id: string): Promise<CitizenReport | null>;
  create(input: NewCitizenReport): Promise<CitizenReport>;
  updateStatus(id: string, status: ReportStatus): Promise<CitizenReport | null>;
  /** Contagem por status com os demais filtros aplicados (abas de moderação). */
  countByStatus(
    filter?: Omit<CitizenReportFilter, "statuses" | "page" | "pageSize">,
  ): Promise<Record<ReportStatus, number>>;
}

export interface AdoptionRepository {
  list(municipalityId?: string): Promise<Adoption[]>;
  getById(id: string): Promise<Adoption | null>;
  create(input: NewAdoption): Promise<Adoption>;
}

export interface ScenarioRepository {
  list(municipalityId?: string): Promise<SavedScenario[]>;
  getById(id: string): Promise<SavedScenario | null>;
  save(scenario: Omit<SavedScenario, "id" | "createdAt">): Promise<SavedScenario>;
}

export interface ChecklistRepository {
  get(blockId: string): Promise<FieldChecklist | null>;
  save(checklist: FieldChecklist): Promise<FieldChecklist>;
}

export interface Repositories {
  municipalities: MunicipalityRepository;
  blocks: BlockRepository;
  weather: WeatherRepository;
  alerts: AlertRepository;
  sensors: SensorRepository;
  citizenReports: CitizenReportRepository;
  adoptions: AdoptionRepository;
  scenarios: ScenarioRepository;
  checklists: ChecklistRepository;
}
