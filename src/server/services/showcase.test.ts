// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rankingQuerySchema } from "@/lib/api/contracts";
import { buildShowcase } from "./showcase";
import { buildRanking } from "./thermal-layers";

describe("vitrine da landing", () => {
  it("recorta o entorno do quarteirão mais crítico do primeiro município", async () => {
    const showcase = await buildShowcase();
    expect(showcase).not.toBeNull();
    if (!showcase) return;

    const ranking = await buildRanking(
      rankingQuerySchema.parse({ municipality: "volta-redonda", pageSize: 1 }),
    );
    expect(showcase.municipality).toBe("Volta Redonda");
    expect(showcase.focus.id).toBe(ranking.data[0].id);
    expect(showcase.blocks.some((b) => b.id === showcase.focus.id)).toBe(true);
    expect(showcase.blocks.length).toBeGreaterThan(8);
    const [x, y] = showcase.focus.anchor;
    // O crítico fica no terço central do recorte.
    expect(Math.abs(x - showcase.width / 2)).toBeLessThanOrEqual(showcase.width / 6 + 0.1);
    expect(Math.abs(y - showcase.height / 2)).toBeLessThanOrEqual(showcase.height / 6 + 0.1);
  });

  it("pixels de 30 m cobrem o recorte com a média da superfície", async () => {
    const showcase = await buildShowcase();
    if (!showcase) throw new Error("sem vitrine");
    const columns = Math.ceil(showcase.width / 30);
    const rows = Math.ceil(showcase.height / 30);
    expect(showcase.pixels).toHaveLength(columns * rows);
    const lst = showcase.blocks.map((b) => b.lst);
    for (const pixel of showcase.pixels) {
      expect(pixel.lst).toBeGreaterThanOrEqual(Math.min(...lst) - 0.05);
      expect(pixel.lst).toBeLessThanOrEqual(Math.max(...lst) + 0.05);
    }
  });
});
