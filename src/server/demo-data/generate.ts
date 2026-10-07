import type { Adoption, MaintenanceTask, NdviObservation } from "@/domain/adoption/schema";
import type { HeatAlert } from "@/domain/alerts/schema";
import { localAirTempOffset } from "@/domain/block/pedestrian";
import type { Block, Zone } from "@/domain/block/schema";
import { spamScore, type CitizenReport, type ReportCategory } from "@/domain/citizen/schema";
import type { IotNode, IotReading } from "@/domain/iot/schema";
import type { SpeciesId } from "@/domain/prescription/species";
import {
  bboxContains,
  distanceMeters,
  distanceToPolylineMeters,
  fromLocalMeters,
  ringAreaMeters,
  ringCentroid,
  ringPerimeterMeters,
  type LngLat,
} from "@/domain/shared/geo";
import { clamp, clamp01, round } from "@/domain/shared/math";
import { createRng, hashString, type Rng } from "@/domain/shared/random";
import { airTemperatureAt, relativeHumidityAt, type DailyWeather } from "@/domain/thermal/diurnal";
import { MOCK_MUNICIPALITIES } from "../repositories/mock/municipalities";
import {
  MUNICIPALITY_PROFILES,
  type MunicipalityProfile,
  type NeighborhoodKind,
  type NeighborhoodProfile,
} from "./profiles";

/**
 * Gerador DETERMINÍSTICO dos dados demonstrativos.
 * Mesma semente ⇒ mesmo conjunto, byte a byte. Todas as datas são relativas a
 * `DEMO_ANCHOR`; o repositório mock desloca o conjunto para "agora" na leitura.
 */
export const DEMO_SEED = 20260120;
/** Instante de referência do conjunto: 20/01/2026, 15h (horário de Brasília). */
export const DEMO_ANCHOR = "2026-01-20T18:00:00.000Z";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const anchorMs = Date.parse(DEMO_ANCHOR);
const iso = (ms: number) => new Date(ms).toISOString();
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

type Range = readonly [number, number];
const pickRange = (rng: Rng, [min, max]: Range) => rng.range(min, max);
const coord = (p: LngLat): LngLat => [round(p[0], 6), round(p[1], 6)];

// ───────────────────────────── Quarteirões ─────────────────────────────

const ZONE_WEIGHTS: Record<NeighborhoodKind, Partial<Record<Zone, number>>> = {
  centro: { comercial: 0.65, misto: 0.25, residencial: 0.05, verde: 0.05 },
  misto: { comercial: 0.25, misto: 0.45, residencial: 0.25, verde: 0.05 },
  "residencial-medio": { residencial: 0.75, misto: 0.15, comercial: 0.04, verde: 0.06 },
  "residencial-alto": { residencial: 0.82, misto: 0.08, verde: 0.1 },
  periferia: { residencial: 0.86, misto: 0.09, comercial: 0.02, verde: 0.03 },
  industrial: { industrial: 0.9, misto: 0.06, verde: 0.04 },
};

function chooseZone(rng: Rng, kind: NeighborhoodKind, distanceToCore: number): Zone {
  const weights = { ...ZONE_WEIGHTS[kind] };
  // O miolo do bairro concentra comércio; as bordas, residências.
  if (weights.comercial) weights.comercial *= 1.6 - distanceToCore;
  const zones = Object.keys(weights) as Zone[];
  return rng.weighted(
    zones,
    zones.map((z) => weights[z] ?? 0),
  );
}

function residentialRange<T>(
  kind: NeighborhoodKind,
  ranges: { periferia: T; medio: T; alto: T },
): T {
  if (kind === "periferia") return ranges.periferia;
  if (kind === "residencial-alto") return ranges.alto;
  return ranges.medio;
}

interface BlockSeed {
  ring: LngLat[];
  centroid: LngLat;
  neighborhood: NeighborhoodProfile;
  row: number;
  distanceToCore: number;
}

/** Malha de quarteirões retangulares, girada e com bordas irregulares, por bairro. */
function blockSeeds(profile: MunicipalityProfile): BlockSeed[] {
  const municipality = MOCK_MUNICIPALITIES.find((m) => m.id === profile.municipalityId);
  if (!municipality) throw new Error(`Município sem cadastro: ${profile.municipalityId}`);
  const seeds: BlockSeed[] = [];
  const occupied: LngLat[] = [];

  for (const nb of profile.neighborhoods) {
    const rng = createRng(hashString(`${profile.municipalityId}/${nb.name}`));
    const industrial = nb.kind === "industrial";
    const angle = (rng.range(-28, 28) * Math.PI) / 180;
    const baseW = industrial ? rng.range(190, 240) : rng.range(92, 124);
    const baseH = industrial ? rng.range(130, 170) : rng.range(66, 88);
    const street = industrial ? 18 : 13;
    const cellW = baseW + street;
    const cellH = baseH + street;
    const radiusM = nb.radiusKm * 1000;
    const n = Math.ceil(radiusM / Math.min(cellW, cellH)) + 1;
    const [ox, oy] = [nb.offsetKm[0] * 1000, nb.offsetKm[1] * 1000];

    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const gx = i * cellW;
        const gy = j * cellH;
        const r = Math.hypot(gx, gy);
        const edge = radiusM * (0.82 + 0.3 * rng.next());
        if (r > edge || rng.chance(0.05)) continue;

        const w = baseW * rng.range(0.9, 1.08);
        const h = baseH * rng.range(0.9, 1.08);
        const localAngle = angle + (rng.range(-2.5, 2.5) * Math.PI) / 180;
        const cos = Math.cos(localAngle);
        const sin = Math.sin(localAngle);
        const cx = ox + gx * Math.cos(angle) - gy * Math.sin(angle);
        const cy = oy + gx * Math.sin(angle) + gy * Math.cos(angle);
        const corners: Array<[number, number]> = [
          [-w / 2, -h / 2],
          [w / 2, -h / 2],
          [w / 2, h / 2],
          [-w / 2, h / 2],
        ];
        const ring = corners.map(([x, y]) => {
          const jx = x + rng.range(-4, 4);
          const jy = y + rng.range(-4, 4);
          return coord(
            fromLocalMeters(cx + jx * cos - jy * sin, cy + jx * sin + jy * cos, profile.center),
          );
        });
        ring.push(ring[0]);
        const centroid = coord(ringCentroid(ring));

        if (!bboxContains(municipality.bbox, centroid)) continue;
        if (distanceToPolylineMeters(centroid, profile.river) < Math.max(w, h) / 2 + 60) continue;
        if (occupied.some((p) => distanceMeters(p, centroid) < 75)) continue;

        occupied.push(centroid);
        seeds.push({ ring, centroid, neighborhood: nb, row: j + n, distanceToCore: r / radiusM });
      }
    }
  }
  return seeds;
}

function buildBlock(profile: MunicipalityProfile, seed: BlockSeed, index: number): Block {
  const nb = seed.neighborhood;
  const rng = createRng(hashString(`${profile.municipalityId}#${index}`));
  const zone = chooseZone(rng, nb.kind, seed.distanceToCore);
  const kind = nb.kind;
  const core = 1 - clamp01(seed.distanceToCore);

  const imperviousness = clamp(
    {
      comercial: pickRange(rng, [0.86, 0.97]),
      misto: pickRange(rng, [0.76, 0.92]),
      residencial: pickRange(
        rng,
        residentialRange(kind, { periferia: [0.74, 0.9], medio: [0.62, 0.82], alto: [0.5, 0.72] }),
      ),
      industrial: pickRange(rng, [0.85, 0.97]),
      verde: pickRange(rng, [0.15, 0.4]),
    }[zone],
    0,
    1,
  );

  const canopyCover = clamp(
    zone === "verde"
      ? rng.range(0.42, 0.78)
      : nb.canopy * (zone === "comercial" ? 0.7 : 1) + rng.normal(0, 0.035),
    0.01,
    0.85,
  );
  const streetCanopy = clamp(canopyCover * rng.range(0.7, 1.3), 0, 0.85);

  const roofMetalShare = clamp(
    {
      comercial: pickRange(rng, [0.12, 0.35]),
      misto: pickRange(rng, [0.1, 0.3]),
      residencial: pickRange(
        rng,
        residentialRange(kind, { periferia: [0.25, 0.55], medio: [0.06, 0.2], alto: [0.03, 0.12] }),
      ),
      industrial: pickRange(rng, [0.6, 0.92]),
      verde: pickRange(rng, [0, 0.1]),
    }[zone],
    0,
    1,
  );

  const builtShare = {
    comercial: pickRange(rng, [0.55, 0.75]),
    misto: pickRange(rng, [0.45, 0.65]),
    residencial: pickRange(rng, [0.4, 0.6]),
    industrial: pickRange(rng, [0.5, 0.7]),
    verde: pickRange(rng, [0.01, 0.06]),
  }[zone];

  const freeSoilShare = clamp(
    {
      comercial: pickRange(rng, [0, 0.04]),
      misto: pickRange(rng, [0.02, 0.07]),
      residencial: pickRange(
        rng,
        residentialRange(kind, { periferia: [0.02, 0.08], medio: [0.05, 0.14], alto: [0.1, 0.2] }),
      ),
      industrial: pickRange(rng, [0.03, 0.12]),
      verde: pickRange(rng, [0.4, 0.65]),
    }[zone],
    0,
    1,
  );

  const sidewalkWidthM = {
    comercial: pickRange(rng, [2.2, 4.2]),
    misto: pickRange(rng, [1.8, 3.2]),
    residencial: pickRange(
      rng,
      residentialRange(kind, { periferia: [0.9, 2], medio: [1.5, 2.8], alto: [2, 3.2] }),
    ),
    industrial: pickRange(rng, [1.5, 3]),
    verde: pickRange(rng, [2, 4]),
  }[zone];

  const buildingShade = {
    comercial: pickRange(rng, [0.1, 0.24]),
    misto: pickRange(rng, [0.06, 0.14]),
    residencial: pickRange(rng, [0.03, 0.1]),
    industrial: pickRange(rng, [0.02, 0.05]),
    verde: pickRange(rng, [0, 0.02]),
  }[zone];

  const windExposure = {
    comercial: pickRange(rng, [0.55, 0.75]),
    misto: pickRange(rng, [0.65, 0.85]),
    residencial: pickRange(rng, [0.7, 0.95]),
    industrial: pickRange(rng, [0.85, 1.1]),
    verde: pickRange(rng, [0.9, 1.1]),
  }[zone];

  const distanceToRiverM = distanceToPolylineMeters(seed.centroid, profile.river);
  const riverCooling = distanceToRiverM < 300 ? 2 * (1 - distanceToRiverM / 300) : 0;

  const lstC = clamp(
    27 +
      15 * imperviousness +
      7 * roofMetalShare -
      13 * canopyCover +
      3 * nb.heat -
      riverCooling +
      rng.normal(0, 1.1),
    22,
    56,
  );
  const ndvi = clamp(
    0.05 + 0.75 * canopyCover + 0.3 * freeSoilShare * (1 - imperviousness) + rng.normal(0, 0.03),
    -0.05,
    0.88,
  );

  const hilly = kind === "periferia" || kind === "residencial-alto";
  const slopePct = clamp(
    1 +
      rng.range(0, 3) +
      (distanceToRiverM > 600 ? (hilly ? rng.range(3, 14) : rng.range(0, 5)) : 0),
    0.5,
    30,
  );

  const pedestrianBase = {
    comercial: pickRange(rng, [500, 1700]),
    misto: pickRange(rng, [200, 650]),
    residencial: pickRange(rng, [40, 260]),
    industrial: pickRange(rng, [15, 120]),
    verde: pickRange(rng, [120, 450]),
  }[zone];
  const pedestrianFlow = Math.round(
    pedestrianBase * (zone === "industrial" ? 1 : nb.pedestrian) * (0.7 + 0.5 * core),
  );

  const densityPerKm2 = Math.round(
    zone === "industrial"
      ? rng.range(100, 700)
      : nb.densityPerKm2 * rng.range(0.75, 1.25) * (zone === "comercial" ? 0.6 : 1),
  );
  const areaM2 = ringAreaMeters(seed.ring);
  const population = zone === "verde" ? 0 : Math.round((densityPerKm2 * areaM2) / 1_000_000);

  const code = `${profile.codePrefix}-${String(index + 1).padStart(4, "0")}`;
  const street =
    zone === "verde"
      ? `Praça ${rng.pick(["da Matriz", "do Rosário", "São Sebastião", "dos Expedicionários", "da Bandeira", "do Trabalhador", "Brasil", "Santa Cecília"])}`
      : nb.streets[seed.row % nb.streets.length];

  return {
    id: code.toLowerCase(),
    municipalityId: profile.municipalityId,
    code,
    neighborhood: nb.name,
    street,
    zone,
    geometry: { type: "Polygon", coordinates: [seed.ring] },
    centroid: seed.centroid,
    areaM2: round(areaM2, 0),
    perimeterM: round(ringPerimeterMeters(seed.ring), 0),
    lstC: round(lstC, 1),
    ndvi: round(ndvi, 3),
    canopyCover: round(canopyCover, 3),
    streetCanopy: round(streetCanopy, 3),
    buildingShade: round(buildingShade, 3),
    imperviousness: round(imperviousness, 3),
    roofMetalShare: round(roofMetalShare, 3),
    roofAreaM2: round(areaM2 * Math.min(builtShare, imperviousness), 0),
    freeSoilShare: round(freeSoilShare, 3),
    sidewalkWidthM: round(sidewalkWidthM, 1),
    windExposure: round(windExposure, 2),
    distanceToRiverM: round(distanceToRiverM, 0),
    slopePct: round(slopePct, 1),
    pedestrianFlow,
    population,
    densityPerKm2,
    elderlyShare: round(clamp(nb.elderlyShare + rng.normal(0, 0.02), 0.03, 0.35), 3),
    incomePerCapita: Math.round(nb.incomePerCapita * rng.range(0.8, 1.2)),
  };
}

export function generateBlocks(): Block[] {
  return MUNICIPALITY_PROFILES.flatMap((profile) =>
    blockSeeds(profile).map((seed, index) => buildBlock(profile, seed, index)),
  );
}

// ───────────────────────────── Sensores IoT ─────────────────────────────

const NODES_PER_MUNICIPALITY: Record<string, number> = {
  "volta-redonda": 4,
  "barra-mansa": 3,
  resende: 3,
};

/** Estados realistas: um nó com bateria baixa, um offline e um com sinal fraco. */
const NODE_QUIRKS: Record<string, "low-battery" | "offline" | "weak-signal"> = {
  "VR-03": "low-battery",
  "BM-02": "offline",
  "RS-03": "weak-signal",
};

export function generateIot(
  blocks: readonly Block[],
  weatherById: ReadonlyMap<string, DailyWeather>,
): { nodes: IotNode[]; readings: IotReading[] } {
  const rng = createRng(DEMO_SEED ^ 0x10f);
  const nodes: IotNode[] = [];
  const readings: IotReading[] = [];
  const dailyTmaxShift = [-1.8, -0.9, -0.3, 0.4, 0.8, 0.2, 0];

  for (const profile of MUNICIPALITY_PROFILES) {
    const candidates = blocks
      .filter(
        (b) =>
          b.municipalityId === profile.municipalityId &&
          (b.zone === "comercial" || b.zone === "misto"),
      )
      .sort((a, b) => b.pedestrianFlow - a.pedestrianFlow);
    const chosen: Block[] = [];
    for (const b of candidates) {
      if (chosen.length >= NODES_PER_MUNICIPALITY[profile.municipalityId]) break;
      const sameNeighborhood = chosen.filter((c) => c.neighborhood === b.neighborhood).length;
      if (sameNeighborhood >= 2 || chosen.some((c) => distanceMeters(c.centroid, b.centroid) < 400))
        continue;
      chosen.push(b);
    }

    const weather = weatherById.get(profile.municipalityId);
    if (!weather) throw new Error(`Sem dia meteorológico para ${profile.municipalityId}`);

    chosen.forEach((block, i) => {
      const code = `${profile.codePrefix}-${String(i + 1).padStart(2, "0")}`;
      const id = `iot-${code.toLowerCase()}`;
      const quirk = NODE_QUIRKS[code];
      nodes.push({
        id,
        code,
        municipalityId: profile.municipalityId,
        blockId: block.id,
        label: `${block.street} · ${block.neighborhood}`,
        location: block.centroid,
        hardware: "ESP32 + SHT31",
        connectivity: block.zone === "comercial" ? "wifi" : "4g",
        installedAt: iso(anchorMs - rng.int(40, 75) * DAY),
      });

      const bias = rng.normal(0.25, 0.2);
      const offset = localAirTempOffset(block);
      const signalBase = quirk === "weak-signal" ? -99 : rng.range(-78, -58);
      // Leituras de 7 dias antes até 23 h depois do âncora (o repositório corta o futuro).
      // O nó offline para 18 h antes do âncora: em qualquer hora do dia, está mudo há 3–27 h.
      const lastHour = quirk === "offline" ? 18 : -23;
      let battery = quirk === "low-battery" ? 41 : rng.range(78, 96);

      for (let h = 7 * 24 - 1; h >= lastHour; h--) {
        const ts = anchorMs - h * HOUR;
        const local = new Date(ts - 3 * HOUR);
        const hourOfDay = local.getUTCHours();
        const dayIndex = Math.min(6, 6 - Math.floor(h / 24));
        const day = { ...weather, tMax: weather.tMax + dailyTmaxShift[dayIndex] };
        const temperature =
          airTemperatureAt(hourOfDay, day.tMin, day.tMax) + offset + bias + rng.normal(0, 0.35);
        const humidity = clamp(
          relativeHumidityAt(hourOfDay, day, offset + bias) + rng.normal(0, 0.025),
          0.2,
          0.99,
        );
        // Bateria com painel solar: descarrega à noite e recarrega de dia.
        const charging = hourOfDay >= 9 && hourOfDay <= 16;
        battery =
          quirk === "low-battery"
            ? battery - 0.17
            : clamp(battery + (charging ? 0.9 : -0.55) + rng.normal(0, 0.1), 35, 100);
        readings.push({
          nodeId: id,
          timestamp: iso(ts),
          temperatureC: round(temperature, 2),
          humidity: round(humidity, 3),
          batteryPct: round(clamp(battery, 0, 100), 1),
          signalDbm: Math.round(clamp(signalBase + rng.normal(0, 3), -115, -40)),
        });
      }
    });
  }
  return { nodes, readings };
}

// ───────────────────────────── Ciência cidadã ─────────────────────────────

const REPORT_TEXTS: Record<ReportCategory, readonly string[]> = {
  "ponto-onibus-sem-sombra": [
    "Ponto de ônibus da {street} sem nenhuma cobertura. Ao meio-dia é impossível esperar no sol.",
    "Idosos esperando ônibus no sol forte na {street}. Precisa de sombra com urgência.",
    "O abrigo do ponto na {street} foi retirado e ninguém repôs. Calor demais.",
  ],
  "asfalto-derretendo": [
    "O asfalto da {street} está mole de tanto calor, gruda no chinelo.",
    "Cheiro forte de asfalto quente na {street} hoje à tarde, o chão parece uma chapa.",
  ],
  "calcada-sem-arvores": [
    "Quarteirão inteiro da {street} sem uma árvore. A calçada fica pelando.",
    "O caminho das crianças para a escola na {street} não tem sombra nenhuma.",
    "Moro na {street} e não tem uma árvore na rua, dentro de casa fica um forno.",
  ],
  "praca-sem-sombra": [
    "A praça perto da {street} não tem sombra, os bancos ficam quentes demais para sentar.",
    "Os brinquedos da praça esquentam muito, criança não consegue brincar depois das 10h.",
  ],
  "calor-equipamento-publico": [
    "Sala de espera do posto de saúde perto da {street} muito quente, sem ventilação.",
    "Escola na {street} com telhado de zinco, as salas viram um forno à tarde.",
  ],
  alagamento: [
    "Toda chuva forte alaga a {street}, a água não tem para onde escoar.",
    "Bueiro entupido na {street}; depois da chuva fica tudo alagado.",
  ],
  "arvore-precisa-cuidado": [
    "A muda plantada na {street} está secando, precisa de rega.",
    "Árvore da {street} com galhos quebrados depois do temporal.",
  ],
};

const SPAM_TEXTS = [
  "PROMOÇÃO imperdível!!! clique em www.ofertas-top.com",
  "ganhe pix grátis no sorteio, chama no zap",
  "teste teste",
  "kkkkkkkkkkk",
];

function categoryFor(rng: Rng, block: Block): ReportCategory {
  if (block.zone === "verde")
    return rng.chance(0.75) ? "praca-sem-sombra" : "arvore-precisa-cuidado";
  if (block.distanceToRiverM < 450 && block.imperviousness > 0.8 && rng.chance(0.35))
    return "alagamento";
  const options: ReportCategory[] =
    block.zone === "comercial" || block.zone === "misto"
      ? [
          "ponto-onibus-sem-sombra",
          "asfalto-derretendo",
          "calcada-sem-arvores",
          "calor-equipamento-publico",
        ]
      : [
          "calcada-sem-arvores",
          "ponto-onibus-sem-sombra",
          "calor-equipamento-publico",
          "arvore-precisa-cuidado",
        ];
  return rng.weighted(options, [0.4, 0.25, 0.22, 0.13]);
}

export function generateCitizenReports(blocks: readonly Block[], count = 240): CitizenReport[] {
  const rng = createRng(DEMO_SEED ^ 0xc17);
  const senders = Array.from(
    { length: 150 },
    (_, i) => `anon-${(hashString(`sender-${i}`) & 0xffffff).toString(16).padStart(6, "0")}`,
  );
  const weights = blocks.map(
    (b) =>
      Math.max(0, b.lstC - 30) ** 2 *
      Math.log1p(b.pedestrianFlow) *
      (b.zone === "industrial" ? 0.15 : 1),
  );
  const reports: CitizenReport[] = [];

  for (let i = 0; i < count; i++) {
    const block = rng.weighted(blocks, weights);
    const isSpam = rng.chance(0.05);
    const category = categoryFor(rng, block);
    const text = isSpam
      ? rng.pick(SPAM_TEXTS)
      : rng.pick(REPORT_TEXTS[category]).replace("{street}", block.street);

    // Mais relatos recentes que antigos; horário concentrado no pico de calor.
    const daysAgo = 30 * rng.next() ** 1.8;
    const dayStart = anchorMs - Math.floor(daysAgo) * DAY - 15 * HOUR;
    let createdMs = dayStart + rng.range(9, 19) * HOUR;
    if (createdMs > anchorMs) createdMs = anchorMs - rng.range(0.1, 6) * HOUR;

    const ageHours = (anchorMs - createdMs) / HOUR;
    const score = isSpam ? spamScore(text) : clamp(spamScore(text) + rng.range(0, 0.12), 0, 1);
    const status: CitizenReport["status"] = isSpam
      ? ageHours > 24
        ? "spam"
        : "pendente"
      : ageHours < 36
        ? "pendente"
        : rng.weighted(["validado", "descartado", "pendente"] as const, [0.82, 0.1, 0.08]);

    const [dx, dy] = [rng.range(-35, 35), rng.range(-35, 35)];
    reports.push({
      id: `rel-${String(i + 1).padStart(4, "0")}`,
      municipalityId: block.municipalityId,
      blockId: block.id,
      location: coord(fromLocalMeters(dx, dy, block.centroid)),
      category,
      text,
      createdAt: iso(Math.round(createdMs / 60_000) * 60_000),
      anonId: rng.pick(senders),
      channel: rng.chance(0.78) ? "whatsapp" : "web",
      spamScore: round(score, 2),
      status,
      hasPhoto: !isSpam && rng.chance(0.4),
    });
  }
  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ───────────────────────── Adote uma Ilha Verde ─────────────────────────

interface PartnerSeed {
  partnerName: string;
  partnerType: Adoption["partnerType"];
  municipalityId: string;
  daysAgo: number;
  trees: Array<{ speciesId: SpeciesId; count: number }>;
  permeableAreaM2: number;
  coolRoofAreaM2: number;
  maintenanceMonths: number;
  /** Simula estiagem recente: NDVI cai e o modelo preditivo gera tarefas extras. */
  recentDrought?: boolean;
}

/** Parceiros FICTÍCIOS para demonstração. */
const PARTNERS: readonly PartnerSeed[] = [
  {
    partnerName: "Aços Paraíba Sul",
    partnerType: "industria",
    municipalityId: "volta-redonda",
    daysAgo: 420,
    trees: [
      { speciesId: "sibipiruna", count: 18 },
      { speciesId: "ipe-roxo", count: 12 },
    ],
    permeableAreaM2: 600,
    coolRoofAreaM2: 2400,
    maintenanceMonths: 48,
  },
  {
    partnerName: "Shopping Vale Verde",
    partnerType: "shopping",
    municipalityId: "volta-redonda",
    daysAgo: 240,
    trees: [
      { speciesId: "oiti", count: 16 },
      { speciesId: "ipe-amarelo", count: 10 },
    ],
    permeableAreaM2: 450,
    coolRoofAreaM2: 0,
    maintenanceMonths: 36,
    recentDrought: true,
  },
  {
    partnerName: "Padaria Pão do Vale",
    partnerType: "comercio",
    municipalityId: "volta-redonda",
    daysAgo: 30,
    trees: [{ speciesId: "quaresmeira", count: 6 }],
    permeableAreaM2: 0,
    coolRoofAreaM2: 0,
    maintenanceMonths: 24,
  },
  {
    partnerName: "Construtora Horizonte Fluminense",
    partnerType: "construtora",
    municipalityId: "barra-mansa",
    daysAgo: 300,
    trees: [
      { speciesId: "ipe-amarelo", count: 14 },
      { speciesId: "aroeira-pimenteira", count: 10 },
    ],
    permeableAreaM2: 380,
    coolRoofAreaM2: 0,
    maintenanceMonths: 36,
  },
  {
    partnerName: "Farmácia Bem-Estar do Vale",
    partnerType: "comercio",
    municipalityId: "barra-mansa",
    daysAgo: 110,
    trees: [{ speciesId: "quaresmeira", count: 8 }],
    permeableAreaM2: 0,
    coolRoofAreaM2: 0,
    maintenanceMonths: 24,
  },
  {
    partnerName: "Dutra Park Logística",
    partnerType: "logistica",
    municipalityId: "resende",
    daysAgo: 180,
    trees: [
      { speciesId: "pau-ferro", count: 10 },
      { speciesId: "sibipiruna", count: 12 },
    ],
    permeableAreaM2: 520,
    coolRoofAreaM2: 5200,
    maintenanceMonths: 48,
  },
  {
    partnerName: "Autopeças Mantiqueira",
    partnerType: "industria",
    municipalityId: "resende",
    daysAgo: 150,
    trees: [{ speciesId: "ipe-roxo", count: 8 }],
    permeableAreaM2: 0,
    coolRoofAreaM2: 1800,
    maintenanceMonths: 36,
  },
  {
    partnerName: "Cooperativa Agro Médio Paraíba",
    partnerType: "servicos",
    municipalityId: "resende",
    daysAgo: 60,
    trees: [
      { speciesId: "aroeira-pimenteira", count: 12 },
      { speciesId: "ipe-amarelo", count: 6 },
    ],
    permeableAreaM2: 200,
    coolRoofAreaM2: 0,
    maintenanceMonths: 24,
  },
];

function ndviSeries(
  rng: Rng,
  startMs: number,
  baseline: number,
  gain: number,
  drought: boolean,
): NdviObservation[] {
  const series: NdviObservation[] = [];
  let t = startMs - 30 * DAY;
  let useSentinel = true;
  while (t <= anchorMs) {
    const daysSinceStart = (t - startMs) / DAY;
    const growth = daysSinceStart <= 0 ? 0 : 1 / (1 + Math.exp(-(daysSinceStart - 110) / 40));
    const seasonal = 0.02 * Math.sin((2 * Math.PI * (t / DAY)) / 365);
    const droughtDip =
      drought && anchorMs - t < 25 * DAY ? -0.07 * (1 - (anchorMs - t) / (25 * DAY)) : 0;
    const cloudy = rng.chance(0.17);
    const clear = baseline + gain * growth + seasonal + droughtDip + rng.normal(0, 0.012);
    series.push({
      date: isoDate(t),
      ndvi: round(clamp(cloudy ? clear - rng.range(0.12, 0.3) : clear, -0.1, 0.95), 3),
      sensor: useSentinel ? "Sentinel-2" : "Landsat 8/9",
      cloudy,
    });
    t += (useSentinel ? 5 : 8) * DAY;
    useSentinel = !useSentinel;
  }
  return series;
}

function maintenancePlan(
  rng: Rng,
  adoptionId: string,
  seed: PartnerSeed,
  startMs: number,
): MaintenanceTask[] {
  const tasks: MaintenanceTask[] = [];
  const windowStart = anchorMs - 21 * DAY;
  const windowEnd = anchorMs + 42 * DAY;
  const add = (type: MaintenanceTask["type"], ms: number, reason: string, predicted = false) => {
    if (ms < Math.max(windowStart, startMs) || ms > windowEnd) return;
    const past = ms < anchorMs - DAY;
    tasks.push({
      id: `${adoptionId}-t${String(tasks.length + 1).padStart(2, "0")}`,
      type,
      dueDate: isoDate(ms),
      status: past ? (rng.chance(0.88) ? "concluida" : "atrasada") : "pendente",
      predicted,
      reason,
    });
  };

  const youngPlanting = anchorMs - startMs < 180 * DAY;
  const irrigationEvery = (youngPlanting ? 7 : 14) * DAY;
  for (let t = startMs + 3 * DAY; t <= windowEnd; t += irrigationEvery) {
    add(
      "irrigacao",
      t,
      youngPlanting ? "Rega semanal nos primeiros 6 meses" : "Rega quinzenal de manutenção",
    );
  }
  for (let t = startMs + 90 * DAY; t <= windowEnd; t += 90 * DAY)
    add("adubacao", t, "Adubação trimestral");
  for (let t = startMs + 180 * DAY; t <= windowEnd; t += 180 * DAY)
    add("poda", t, "Poda de formação semestral");
  if (seed.permeableAreaM2 > 0) {
    for (let t = startMs + 30 * DAY; t <= windowEnd; t += 30 * DAY) {
      add("vistoria-pavimento", t, "Vistoria mensal da infiltração do piso drenante");
    }
  }

  // Tarefas preditivas: onda de calor prevista e queda de NDVI.
  add(
    "irrigacao",
    anchorMs + DAY,
    "Rega extra: onda de calor prevista para os próximos dias",
    true,
  );
  if (seed.recentDrought) {
    add(
      "reposicao-muda",
      anchorMs + 3 * DAY,
      "Queda de NDVI nas últimas 3 passagens do satélite: vistoriar e repor mudas",
      true,
    );
  }
  return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function generateAdoptions(blocks: readonly Block[]): Adoption[] {
  const rng = createRng(DEMO_SEED ^ 0xad0);
  const used = new Set<string>();

  return PARTNERS.map((seed, i) => {
    const candidates = blocks
      .filter(
        (b) =>
          b.municipalityId === seed.municipalityId &&
          !used.has(b.id) &&
          (b.zone === "verde" || (b.freeSoilShare > 0.05 && b.canopyCover < 0.2)) &&
          (seed.partnerType === "industria" || seed.partnerType === "logistica"
            ? true
            : b.zone !== "industrial"),
      )
      .sort((a, b) => b.lstC - a.lstC);
    const block = candidates[Math.min(candidates.length - 1, i % 3)];
    if (!block) throw new Error(`Sem área disponível para ${seed.partnerName}`);
    used.add(block.id);

    const id = `adote-${String(i + 1).padStart(2, "0")}`;
    const startMs = anchorMs - seed.daysAgo * DAY;
    const gain = 0.12 + 0.004 * seed.trees.reduce((s, t) => s + t.count, 0);

    return {
      id,
      municipalityId: seed.municipalityId,
      blockId: block.id,
      areaName:
        block.zone === "verde"
          ? `${block.street} (${block.neighborhood})`
          : `Canteiros da ${block.street} (${block.neighborhood})`,
      partnerName: seed.partnerName,
      partnerType: seed.partnerType,
      status: seed.daysAgo < 45 ? "em-implantacao" : "ativa",
      adoptedAt: isoDate(startMs),
      commitments: {
        trees: seed.trees,
        permeableAreaM2: seed.permeableAreaM2,
        coolRoofAreaM2: seed.coolRoofAreaM2,
        maintenanceMonths: seed.maintenanceMonths,
      },
      ndviSeries: ndviSeries(
        rng,
        startMs,
        block.ndvi,
        Math.min(gain, 0.3),
        seed.recentDrought ?? false,
      ),
      maintenance: maintenancePlan(rng, id, seed, startMs),
    };
  });
}

// ───────────────────────────── Alertas ─────────────────────────────

export function generateAlerts(): HeatAlert[] {
  return [
    {
      id: "alerta-onda-de-calor",
      municipalityIds: MUNICIPALITY_PROFILES.map((p) => p.municipalityId),
      level: "alerta",
      title: "Onda de calor no Médio Paraíba",
      message:
        "Máximas de até 38,4 °C previstas para os próximos 4 dias, com sensação térmica acima de 40 °C nas áreas centrais entre 11h e 16h. Priorize sombra e hidratação em pontos de ônibus, feiras e obras.",
      maxTempC: 38.4,
      startsAt: iso(anchorMs - 30 * HOUR),
      endsAt: iso(anchorMs + 4 * DAY),
      source: "Simulado para demonstração (no piloto: INMET e Defesa Civil)",
    },
  ];
}

// ───────────────────────────── Conjunto completo ─────────────────────────────

export interface DemoDataset {
  meta: { seed: number; anchor: string; generator: string; counts: Record<string, number> };
  weather: DailyWeather[];
  blocks: Block[];
  iotNodes: IotNode[];
  iotReadings: IotReading[];
  citizenReports: CitizenReport[];
  adoptions: Adoption[];
  alerts: HeatAlert[];
}

export function generateDemoDataset(): DemoDataset {
  const weather = MUNICIPALITY_PROFILES.map((p) => p.weather);
  const weatherById = new Map(weather.map((w) => [w.municipalityId, w]));
  const blocks = generateBlocks();
  const { nodes, readings } = generateIot(blocks, weatherById);
  const citizenReports = generateCitizenReports(blocks);
  const adoptions = generateAdoptions(blocks);
  const alerts = generateAlerts();

  return {
    meta: {
      seed: DEMO_SEED,
      anchor: DEMO_ANCHOR,
      generator: "scripts/seed-demo-data.ts",
      counts: {
        blocks: blocks.length,
        iotNodes: nodes.length,
        iotReadings: readings.length,
        citizenReports: citizenReports.length,
        adoptions: adoptions.length,
        alerts: alerts.length,
      },
    },
    weather,
    blocks,
    iotNodes: nodes,
    iotReadings: readings,
    citizenReports,
    adoptions,
    alerts,
  };
}
