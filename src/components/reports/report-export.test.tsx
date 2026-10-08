// @vitest-environment node
import { Packer } from "docx";
import JSZip from "jszip";
import { renderToBuffer } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";
import type { ReportDocument } from "@/lib/api/contracts";
import { buildReportDocument } from "@/server/services/reports";
import { buildReportDocx } from "./report-docx";
import { buildReportOutline, outlineToPlainText } from "./report-outline";
import { registerReportFonts, ReportPdf } from "./report-pdf";

let doc: ReportDocument;

beforeAll(async () => {
  doc = await buildReportDocument({
    programId: "fundo-clima",
    municipalityId: "volta-redonda",
    projectName: "Corredores de sombra na Vila Santa Cecília",
    department: "Secretaria Municipal de Meio Ambiente",
    estimatedBudget: 1_250_000,
    neighborhoods: ["Vila Santa Cecília", "Retiro"],
  });
});

describe("roteiro do relatório", () => {
  it("cobre todas as seções com os números do documento", () => {
    const outline = buildReportOutline(doc);
    expect(outline.sections.map((s) => s.id)).toEqual([
      "resumo",
      "diagnostico",
      "prioritarios",
      "epidemiologia",
      "intervencoes",
      "cenarios",
      "socioeconomico",
      "campo",
      "avisos",
    ]);
    const text = outlineToPlainText(outline);
    expect(text).toContain("Corredores de sombra na Vila Santa Cecília");
    expect(text).toContain("Fiocruz");
    expect(text).toContain(doc.seal);
    expect(outline.cover.facts.find((f) => f.label === "Orçamento estimado")?.value).toMatch(
      /R\$\s1\.250\.000,00/,
    );
    expect(outline.fileBaseName).toMatch(/^ipe-fundo-clima-volta-redonda-\d{4}-\d{2}-\d{2}$/);
  });

  it("toda tabela tem uma célula por coluna e larguras que somam 1", () => {
    for (const section of buildReportOutline(doc).sections) {
      for (const block of section.blocks) {
        if (block.kind !== "table") continue;
        expect(block.columns.reduce((sum, c) => sum + c.width, 0)).toBeCloseTo(1, 2);
        for (const row of block.rows) expect(row).toHaveLength(block.columns.length);
      }
    }
  });
});

describe("exportação", () => {
  it("gera um DOCX válido com o título do projeto e o selo", async () => {
    const buffer = await Packer.toBuffer(buildReportDocx(buildReportOutline(doc)));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Corredores de sombra na Vila Santa Cecília");
    expect(xml).toContain("Pré-diagnóstico automatizado");
    expect(xml).toContain("Quarteirões prioritários");
  });

  it("gera um PDF com capa e conteúdo", async () => {
    registerReportFonts();
    const buffer = await renderToBuffer(<ReportPdf outline={buildReportOutline(doc)} />);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    // Capa + ao menos duas páginas de conteúdo.
    const pages = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBeGreaterThanOrEqual(3);
  }, 30_000);
});
