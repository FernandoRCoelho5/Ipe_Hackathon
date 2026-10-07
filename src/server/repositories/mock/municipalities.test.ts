import { describe, expect, it } from "vitest";
import { municipalitySchema } from "@/domain/municipality/types";
import { mockMunicipalityRepository, MOCK_MUNICIPALITIES } from "./municipalities";

describe("repositório mock de municípios", () => {
  it("lista os três municípios do piloto com população do Censo 2022", async () => {
    const list = await mockMunicipalityRepository.list();
    expect(list.map((m) => m.name)).toEqual(["Volta Redonda", "Barra Mansa", "Resende"]);
    expect(list.reduce((sum, m) => sum + m.population, 0)).toBe(561_069);
  });

  it("cadastro válido pelo schema do domínio (escala territorial orientada a dados)", () => {
    for (const municipality of MOCK_MUNICIPALITIES) {
      expect(municipalitySchema.safeParse(municipality).success).toBe(true);
    }
    expect(
      municipalitySchema.safeParse({ ...MOCK_MUNICIPALITIES[0], ibgeCode: "123" }).success,
    ).toBe(false);
  });

  it("mantém o centro de cada município dentro do seu bounding box", () => {
    for (const { center, bbox } of MOCK_MUNICIPALITIES) {
      const [lng, lat] = center;
      const [west, south, east, north] = bbox;
      expect(lng).toBeGreaterThan(west);
      expect(lng).toBeLessThan(east);
      expect(lat).toBeGreaterThan(south);
      expect(lat).toBeLessThan(north);
    }
  });

  it("busca por id e retorna null para id desconhecido", async () => {
    expect((await mockMunicipalityRepository.getById("resende"))?.ibgeCode).toBe("3304201");
    expect(await mockMunicipalityRepository.getById("petropolis")).toBeNull();
  });

  it("devolve cópia, protegendo os dados de origem contra mutação", async () => {
    const list = await mockMunicipalityRepository.list();
    list.pop();
    expect(MOCK_MUNICIPALITIES).toHaveLength(3);
  });
});
