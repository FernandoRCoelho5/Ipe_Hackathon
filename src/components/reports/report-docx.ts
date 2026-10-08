import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from "docx";
import type { OutlineBlock, ReportOutline } from "./report-outline";

/**
 * Relatório em Word (DOCX) a partir do roteiro. Editável pela equipe da prefeitura
 * antes da submissão; títulos usam estilos de cabeçalho para gerar sumário no Word.
 */

const INK = "083E28";
const MUTED = "4A6357";
const ACCENT = "1E842D";
const LINE = "C7CCBD";
const SOFT = "EEF5F0";
const HIGHLIGHT = "FAB20A";
const FONT = "Poppins";

/** Largura útil da página A4 com margens de 2 cm (em twips). */
const CONTENT_WIDTH = 9638;

function text(
  value: string,
  options: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {},
) {
  return new TextRun({ text: value, font: FONT, color: options.color ?? INK, ...options });
}

function blockToDocx(block: OutlineBlock): (Paragraph | Table)[] {
  switch (block.kind) {
    case "paragraph":
      return [
        new Paragraph({
          spacing: { after: 160, line: 300 },
          children: [text(block.text, { color: block.muted ? MUTED : INK, size: 20 })],
        }),
      ];
    case "bullets":
      return block.items.map(
        (item) =>
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 100, line: 280 },
            children: [
              text(item.text, { size: 20 }),
              ...(item.source
                ? [
                    new TextRun({ break: 1 }),
                    text(item.source, { size: 16, color: MUTED, italics: true }),
                  ]
                : []),
            ],
          }),
      );
    case "kpis":
      return [
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: block.items.map(
                (kpi) =>
                  new TableCell({
                    width: {
                      size: Math.floor(CONTENT_WIDTH / block.items.length),
                      type: WidthType.DXA,
                    },
                    shading: { type: ShadingType.CLEAR, fill: SOFT, color: "auto" },
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    borders: cellBorders("FFFFFF"),
                    children: [
                      new Paragraph({ children: [text(kpi.label, { size: 16, color: MUTED })] }),
                      new Paragraph({ children: [text(kpi.value, { size: 28, bold: true })] }),
                      ...(kpi.hint
                        ? [
                            new Paragraph({
                              children: [text(kpi.hint, { size: 16, color: MUTED })],
                            }),
                          ]
                        : []),
                    ],
                  }),
              ),
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      ];
    case "table": {
      const widths = block.columns.map((c) => Math.floor(CONTENT_WIDTH * c.width));
      const cell = (value: string, i: number, header: boolean) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.DXA },
          shading: header ? { type: ShadingType.CLEAR, fill: INK, color: "auto" } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          borders: cellBorders(LINE),
          children: [
            new Paragraph({
              alignment:
                block.columns[i].align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [text(value, { size: 17, bold: header, color: header ? "FFFFFF" : INK })],
            }),
          ],
        });
      return [
        ...(block.caption
          ? [
              new Paragraph({
                spacing: { before: 120, after: 80 },
                children: [text(block.caption, { size: 18, bold: true, color: MUTED })],
              }),
            ]
          : []),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: widths,
          rows: [
            new TableRow({
              tableHeader: true,
              children: block.columns.map((c, i) => cell(c.label, i, true)),
            }),
            ...block.rows.map(
              (row) => new TableRow({ children: row.map((v, i) => cell(v, i, false)) }),
            ),
          ],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      ];
    }
  }
}

function cellBorders(color: string) {
  const side = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: side, bottom: side, left: side, right: side };
}

export function buildReportDocx(outline: ReportOutline): Document {
  const cover: Paragraph[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [text("ipê", { size: 56, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 480 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: HIGHLIGHT, space: 6 } },
      children: [text("inteligência térmica urbana", { size: 18, color: ACCENT })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [text(outline.cover.eyebrow.toUpperCase(), { size: 16, color: MUTED })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
      children: [text(outline.cover.title, { size: 48, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [text(outline.cover.program, { size: 26, bold: true, color: ACCENT })],
    }),
    new Paragraph({
      spacing: { after: 360 },
      children: [text(outline.cover.sponsor, { size: 20, color: MUTED })],
    }),
    ...outline.cover.facts.map(
      (fact) =>
        new Paragraph({
          spacing: { after: 80 },
          children: [
            text(`${fact.label}: `, { size: 20, bold: true }),
            text(fact.value, { size: 20 }),
          ],
        }),
    ),
    new Paragraph({
      spacing: { before: 480 },
      shading: { type: ShadingType.CLEAR, fill: SOFT, color: "auto" },
      children: [text(outline.seal, { size: 18, italics: true })],
    }),
  ];

  const body = outline.sections.flatMap((section, index) => [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: index === 0,
      spacing: { before: 360, after: 160 },
      children: [text(section.title, { size: 30, bold: true })],
    }),
    ...section.blocks.flatMap(blockToDocx),
  ]);

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          text(`${outline.footer} · página `, { size: 14, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: MUTED }),
        ],
      }),
    ],
  });

  const section: ISectionOptions = {
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
      },
    },
    footers: { default: footer },
    children: [...cover, ...body],
  };

  return new Document({
    creator: "Ipê · Inteligência Térmica Urbana",
    title: outline.title,
    description: outline.cover.program,
    styles: { default: { document: { run: { font: FONT, color: INK } } } },
    sections: [section],
  });
}

/** Gera o arquivo no navegador. */
export function reportDocxBlob(outline: ReportOutline): Promise<Blob> {
  return Packer.toBlob(buildReportDocx(outline));
}
