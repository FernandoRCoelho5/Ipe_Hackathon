// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTimeShift, localDayIndex } from "./clock";
import { createMockRepositories, DEMO_META, paginate } from "./index";

const ANCHOR = Date.parse(DEMO_META.anchor);
const NOW = new Date(ANCHOR + 260 * 86_400_000 + 25 * 60_000); // ~8,5 meses depois, hh:25
const repos = () => createMockRepositories({ clock: () => NOW });

describe("deslocamento temporal", () => {
  it("alinha a data local do âncora a hoje, preservando a hora do dia", () => {
    const shift = createTimeShift(DEMO_META.anchor, NOW);
    const shiftedAnchor = new Date(shift.instant(DEMO_META.anchor));
    // Âncora: 15h em Brasília (18h UTC), na mesma data local de NOW.
    expect(shiftedAnchor.getUTCHours()).toBe(18);
    expect(localDayIndex(shiftedAnchor.getTime())).toBe(localDayIndex(NOW.getTime()));
    expect(shift.date("2026-01-20")).toBe(shift.instant(DEMO_META.anchor).slice(0, 10));
    expect(shift.isPast(new Date(NOW.getTime() + 1).toISOString())).toBe(false);
  });

  it("de madrugada: leitura mais recente é da hora atual, nó offline segue offline e alerta ativo", async () => {
    // 06h30 em Brasília, antes do horário do âncora (15h).
    const early = new Date(Date.UTC(2026, 9, 7, 9, 30));
    const r = createMockRepositories({ clock: () => early });
    const [node] = await r.sensors.listNodes("volta-redonda");
    const last = (await r.sensors.listReadings(node.id)).at(-1);
    expect(early.getTime() - Date.parse(last?.timestamp ?? "")).toBeLessThan(3_600_000);
    // Pico diurno preservado: a leitura das 06h (local) é mais fria que a das 15h da véspera.
    const readings = await r.sensors.listReadings(node.id, { hours: 24 });
    const at = (localHour: number) =>
      readings.find((x) => new Date(x.timestamp).getUTCHours() === (localHour + 3) % 24)
        ?.temperatureC ?? NaN;
    expect(at(6)).toBeLessThan(at(15));
    const offline = await r.sensors.listReadings("iot-bm-02");
    expect(early.getTime() - Date.parse(offline.at(-1)?.timestamp ?? "")).toBeGreaterThan(
      2 * 3_600_000,
    );
    expect(await r.alerts.listActive("volta-redonda")).toHaveLength(1);
    const reports = await r.citizenReports.list({ pageSize: 100 });
    expect(reports.items.every((x) => Date.parse(x.createdAt) <= early.getTime())).toBe(true);
  });
});

describe("repositórios mock", () => {
  it("quarteirões: filtros por município, bairro e zona", async () => {
    const r = repos();
    const vr = await r.blocks.list({ municipalityId: "volta-redonda" });
    expect(vr.length).toBeGreaterThan(300);
    const commercial = await r.blocks.list({
      municipalityId: "volta-redonda",
      zones: ["comercial"],
    });
    expect(commercial.every((b) => b.zone === "comercial")).toBe(true);
    const neighborhoods = await r.blocks.listNeighborhoods("volta-redonda");
    expect(neighborhoods).toContain("Vila Santa Cecília");
    expect([...neighborhoods].sort((a, b) => a.localeCompare(b, "pt-BR"))).toEqual(neighborhoods);
    const one = await r.blocks.list({ municipalityId: "volta-redonda", neighborhood: "Retiro" });
    expect(one.every((b) => b.neighborhood === "Retiro")).toBe(true);
    expect(await r.blocks.getById(vr[0].id)).toBe(vr[0]);
    expect(await r.blocks.getById("nao-existe")).toBeNull();
  });

  it("dados estáticos são imutáveis para os consumidores", async () => {
    const [block] = await repos().blocks.list({ municipalityId: "resende" });
    expect(() => {
      (block as { lstC: number }).lstC = 0;
    }).toThrow();
  });

  it("clima de referência e alerta ativo acompanham o relógio", async () => {
    const r = repos();
    const weather = await r.weather.getReferenceDay("barra-mansa");
    expect(weather?.date).toBe(NOW.toISOString().slice(0, 10));
    expect(await r.weather.getReferenceDay("petropolis")).toBeNull();
    const alerts = await r.alerts.listActive("resende");
    expect(alerts).toHaveLength(1);
    expect(Date.parse(alerts[0].endsAt)).toBeGreaterThan(NOW.getTime());
  });

  it("sensores: leituras até a hora atual, com janela opcional", async () => {
    const r = repos();
    const nodes = await r.sensors.listNodes("volta-redonda");
    expect(nodes).toHaveLength(4);
    expect((await r.sensors.listNodes()).length).toBe(10);
    const readings = await r.sensors.listReadings(nodes[0].id);
    const last = Date.parse(readings.at(-1)?.timestamp ?? "");
    expect(NOW.getTime() - last).toBeLessThan(3_600_000);
    expect((await r.sensors.listReadings(nodes[0].id, { hours: 24 })).length).toBeLessThanOrEqual(
      25,
    );
    expect(await r.sensors.getNode("iot-xx")).toBeNull();
    expect((await r.sensors.getNode(nodes[0].id))?.code).toBe(nodes[0].code);
  });

  it("relatos: paginação, filtros, criação anônima e moderação", async () => {
    const r = repos();
    const page = await r.citizenReports.list({ pageSize: 10, page: 2 });
    expect(page.items).toHaveLength(10);
    expect(page.total).toBeGreaterThan(100);
    const sorted = page.items.map((x) => x.createdAt);
    expect([...sorted].sort().reverse()).toEqual(sorted);

    const pending = await r.citizenReports.list({ statuses: ["pendente"], pageSize: 100 });
    expect(pending.items.every((x) => x.status === "pendente")).toBe(true);

    const created = await r.citizenReports.create({
      municipalityId: "volta-redonda",
      location: [-44.104, -22.5231],
      category: "calcada-sem-arvores",
      text: "Rua inteira sem uma árvore, sol o dia todo.",
    });
    expect(created).toMatchObject({ status: "pendente", channel: "web", hasPhoto: false });
    expect(created.anonId).toMatch(/^anon-[0-9a-f]{6}$/);
    expect(created.blockId).not.toBeNull();
    expect((await r.citizenReports.list({ pageSize: 1 })).items[0].id).toBe(created.id);

    const moderated = await r.citizenReports.updateStatus(created.id, "validado");
    expect(moderated?.status).toBe("validado");
    const seeded = page.items[0];
    expect((await r.citizenReports.updateStatus(seeded.id, "spam"))?.status).toBe("spam");
    expect(await r.citizenReports.updateStatus("nao-existe", "spam")).toBeNull();
    expect((await r.citizenReports.getById(seeded.id))?.status).toBe("spam");

    const since = await r.citizenReports.list({
      since: new Date(NOW.getTime() - 86_400_000).toISOString(),
      pageSize: 100,
    });
    expect(since.items.every((x) => Date.parse(x.createdAt) >= NOW.getTime() - 86_400_000)).toBe(
      true,
    );
  });

  it("parcerias: listagem deslocada no tempo e cadastro", async () => {
    const r = repos();
    const all = await r.adoptions.list();
    expect(all.length).toBeGreaterThanOrEqual(6);
    const lastNdvi = all[0].ndviSeries.at(-1)?.date ?? "";
    expect(Date.parse(lastNdvi)).toBeLessThanOrEqual(NOW.getTime());
    expect((await r.adoptions.getById(all[0].id))?.partnerName).toBe(all[0].partnerName);
    expect(await r.adoptions.getById("adote-xx")).toBeNull();

    const [block] = await r.blocks.list({ municipalityId: "resende", zones: ["verde"] });
    const created = await r.adoptions.create({
      municipalityId: "resende",
      blockId: block.id,
      partnerName: "Mercearia Exemplo",
      partnerType: "comercio",
      trees: [{ speciesId: "quaresmeira", count: 4 }],
      permeableAreaM2: 0,
      coolRoofAreaM2: 0,
      maintenanceMonths: 24,
    });
    expect(created.status).toBe("em-implantacao");
    expect(created.maintenance.length).toBeGreaterThan(0);
    expect((await r.adoptions.list("resende"))[0].id).toBe(created.id);
    await expect(
      r.adoptions.create({
        ...created,
        blockId: "vr-0001",
        trees: [],
        permeableAreaM2: 0,
        coolRoofAreaM2: 0,
        maintenanceMonths: 24,
      }),
    ).rejects.toThrow(/Área inválida/);
  });

  it("cenários e checklists persistem em memória", async () => {
    const r = repos();
    const saved = await r.scenarios.save({
      name: "Corredor Rua 33",
      municipalityId: "volta-redonda",
      scenario: {
        blockId: "vr-0001",
        trees: [],
        permeablePavementShare: 0,
        coolRoofShare: 0,
        horizonYears: 10,
      },
      summary: {
        blockCode: "VR-0001",
        blockLabel: "Rua 33",
        peakUtciDelta: -2.1,
        peakUtciDeltaRange: [-1.4, -2.6],
        runoffChange: 0,
        evapotranspirationChange: 0.2,
        plantedTrees: 12,
        permeableAreaM2: 0,
        coolRoofAreaM2: 0,
      },
    });
    expect(saved.id).toMatch(/^cen-/);
    expect(await r.scenarios.list("volta-redonda")).toEqual([saved]);
    expect(await r.scenarios.list("resende")).toEqual([]);
    expect(await r.scenarios.getById(saved.id)).toBe(saved);

    expect(await r.checklists.get("vr-0001")).toBeNull();
    const checklist = await r.checklists.save({
      blockId: "vr-0001",
      items: { "fiacao-aerea": "conforme" },
      notes: "",
    });
    expect(checklist.updatedAt).toBe(NOW.toISOString());
    expect((await r.checklists.get("vr-0001"))?.items["fiacao-aerea"]).toBe("conforme");
  });

  it("paginação limita o tamanho da página", () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    expect(paginate(items, { pageSize: 1000 }).items).toHaveLength(100);
    expect(paginate(items, { page: 0, pageSize: 0 })).toMatchObject({ page: 1, pageSize: 1 });
    expect(paginate(items, { page: 3, pageSize: 100 }).items).toHaveLength(50);
  });
});
