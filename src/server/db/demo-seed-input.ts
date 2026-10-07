import type { Adoption } from "@/domain/adoption/schema";
import type { HeatAlert } from "@/domain/alerts/schema";
import type { Block } from "@/domain/block/schema";
import type { CitizenReport } from "@/domain/citizen/schema";
import type { IotNode, IotReading } from "@/domain/iot/schema";
import type { DailyWeather } from "@/domain/thermal/diurnal";
import adoptions from "../repositories/mock/data/adoptions.json";
import alerts from "../repositories/mock/data/alerts.json";
import blocks from "../repositories/mock/data/blocks.json";
import citizenReports from "../repositories/mock/data/citizen-reports.json";
import iotNodes from "../repositories/mock/data/iot-nodes.json";
import iotReadings from "../repositories/mock/data/iot-readings.json";
import weather from "../repositories/mock/data/weather.json";
import { MOCK_MUNICIPALITIES } from "../repositories/mock/municipalities";
import type { SeedInput } from "./seed-sql";

/** Dados demonstrativos versionados, no formato de entrada do seed SQL. */
export const DEMO_SEED_INPUT: SeedInput = {
  municipalities: MOCK_MUNICIPALITIES,
  weather: weather as DailyWeather[],
  blocks: blocks as Block[],
  iotNodes: iotNodes as IotNode[],
  iotReadings: iotReadings as IotReading[],
  citizenReports: citizenReports as CitizenReport[],
  adoptions: adoptions as Adoption[],
  alerts: alerts as HeatAlert[],
};
