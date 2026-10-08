import {
  Circle,
  Document,
  Font,
  G,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { WORDMARK } from "@/components/brand/logo-geometry";
import type { OutlineBlock, ReportOutline } from "./report-outline";

/**
 * Relatório em PDF (A4) a partir do roteiro, com a tipografia e as cores da marca.
 * Gerado no navegador (`@react-pdf/renderer`), sem serviço externo.
 */

const C = {
  ink: "#083e28",
  muted: "#4a6357",
  accent: "#1e842d",
  line: "#d9ddd0",
  soft: "#eef5f0",
  paper: "#f9f9f3",
  highlight: "#fab20a",
};

let fontFamily = "Helvetica";

/**
 * Registra a Poppins (TTF em /public/fonts, licença OFL). Sem `baseUrl` (testes em Node),
 * o PDF usa Helvetica, embutida no próprio formato.
 */
export function registerReportFonts(baseUrl?: string) {
  // Palavras em português não devem ser hifenizadas pela heurística inglesa.
  Font.registerHyphenationCallback((word) => [word]);
  if (!baseUrl) return;
  Font.register({
    family: "Poppins",
    fonts: [
      { src: `${baseUrl}/fonts/poppins/Poppins-Regular.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/fonts/poppins/Poppins-Medium.ttf`, fontWeight: 500 },
      { src: `${baseUrl}/fonts/poppins/Poppins-SemiBold.ttf`, fontWeight: 600 },
      { src: `${baseUrl}/fonts/poppins/Poppins-Bold.ttf`, fontWeight: 700 },
    ],
  });
  fontFamily = "Poppins";
}

function styles() {
  return StyleSheet.create({
    page: {
      fontFamily,
      fontSize: 9.5,
      color: C.ink,
      paddingTop: 48,
      paddingBottom: 56,
      paddingHorizontal: 48,
      lineHeight: 1.45,
    },
    cover: { fontFamily, color: C.ink, padding: 56, backgroundColor: C.paper },
    brandBar: { flexDirection: "row", height: 4, marginBottom: 28 },
    eyebrow: { fontSize: 8, letterSpacing: 1.6, color: C.muted, textTransform: "uppercase" },
    coverTitle: { fontSize: 26, fontWeight: 700, marginTop: 10, marginBottom: 16, lineHeight: 1.2 },
    program: { fontSize: 13, fontWeight: 600, color: C.accent },
    sponsor: { fontSize: 9.5, color: C.muted, marginTop: 2, marginBottom: 28 },
    fact: { flexDirection: "row", paddingVertical: 6, borderBottom: `0.5pt solid ${C.line}` },
    factLabel: { width: 130, fontWeight: 600, fontSize: 9 },
    factValue: { flex: 1, fontSize: 9 },
    seal: {
      marginTop: 28,
      padding: 12,
      backgroundColor: C.soft,
      borderLeft: `3pt solid ${C.accent}`,
      fontSize: 9,
    },
    header: {
      position: "absolute",
      top: 20,
      left: 48,
      right: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 7.5,
      color: C.muted,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 48,
      right: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 7,
      color: C.muted,
      borderTop: `0.5pt solid ${C.line}`,
      paddingTop: 6,
    },
    h1: { fontSize: 14, fontWeight: 700, marginTop: 18, marginBottom: 8 },
    paragraph: { marginBottom: 8 },
    muted: { color: C.muted },
    bullet: { flexDirection: "row", marginBottom: 5 },
    bulletDot: { width: 10, color: C.highlight, fontWeight: 700 },
    source: { color: C.muted, fontSize: 8 },
    kpis: { flexDirection: "row", gap: 6, marginVertical: 8 },
    kpi: { flex: 1, padding: 8, backgroundColor: C.soft, borderRadius: 4 },
    kpiLabel: { fontSize: 7, color: C.muted, marginBottom: 2 },
    kpiValue: { fontSize: 13, fontWeight: 700 },
    kpiHint: { fontSize: 7, color: C.muted },
    caption: { fontSize: 8.5, fontWeight: 600, color: C.muted, marginTop: 6, marginBottom: 4 },
    table: { marginBottom: 10, borderTop: `0.5pt solid ${C.line}` },
    tr: { flexDirection: "row", borderBottom: `0.5pt solid ${C.line}` },
    th: { backgroundColor: C.ink, color: "#ffffff", fontWeight: 600 },
    td: { paddingVertical: 4, paddingHorizontal: 5, fontSize: 8 },
  });
}

function Wordmark({ width }: { width: number }) {
  const { viewBox: vb } = WORDMARK;
  return (
    <Svg
      width={width}
      height={(width * vb.height) / vb.width}
      viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
    >
      <G fill={C.ink}>
        <Circle cx={WORDMARK.iDot.cx} cy={WORDMARK.iDot.cy} r={WORDMARK.iDot.r} />
        <Rect {...WORDMARK.iStem} />
        <Rect {...WORDMARK.pStem} />
        <Path d={WORDMARK.pBowl} fillRule="evenodd" />
        <Path d={WORDMARK.eBowl} />
        <Rect {...WORDMARK.eBar} />
        <Path d={WORDMARK.circumflex} />
      </G>
      <G transform={WORDMARK.leafTransform}>
        <Path d={WORDMARK.leaf} fill={C.accent} />
      </G>
    </Svg>
  );
}

function Block({ block, s }: { block: OutlineBlock; s: ReturnType<typeof styles> }) {
  switch (block.kind) {
    case "paragraph":
      return <Text style={block.muted ? [s.paragraph, s.muted] : s.paragraph}>{block.text}</Text>;
    case "bullets":
      return (
        <View style={{ marginBottom: 6 }}>
          {block.items.map((item) => (
            <View key={item.text} style={s.bullet} wrap={false}>
              <Text style={s.bulletDot}>•</Text>
              <View style={{ flex: 1 }}>
                <Text>{item.text}</Text>
                {item.source && <Text style={s.source}>{item.source}</Text>}
              </View>
            </View>
          ))}
        </View>
      );
    case "kpis":
      return (
        <View style={s.kpis} wrap={false}>
          {block.items.map((kpi) => (
            <View key={kpi.label} style={s.kpi}>
              <Text style={s.kpiLabel}>{kpi.label}</Text>
              <Text style={s.kpiValue}>{kpi.value}</Text>
              {kpi.hint && <Text style={s.kpiHint}>{kpi.hint}</Text>}
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View>
          {block.caption && <Text style={s.caption}>{block.caption}</Text>}
          <View style={s.table}>
            <View style={[s.tr, s.th]} fixed minPresenceAhead={40}>
              {block.columns.map((c) => (
                <Text
                  key={c.label}
                  style={[s.td, { width: `${c.width * 100}%`, textAlign: c.align ?? "left" }]}
                >
                  {c.label}
                </Text>
              ))}
            </View>
            {block.rows.map((row, r) => (
              <View key={r} style={s.tr} wrap={false}>
                {row.map((value, i) => (
                  <Text
                    key={i}
                    style={[
                      s.td,
                      {
                        width: `${block.columns[i].width * 100}%`,
                        textAlign: block.columns[i].align ?? "left",
                      },
                    ]}
                  >
                    {value}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      );
  }
}

export function ReportPdf({ outline }: { outline: ReportOutline }) {
  const s = styles();
  const brand = ["#083e28", "#1e842d", "#82b930", "#fab20a"];
  return (
    <Document title={outline.title} author="Ipê · Inteligência Térmica Urbana" language="pt-BR">
      <Page size="A4" style={s.cover}>
        <View style={s.brandBar}>
          {brand.map((color) => (
            <View key={color} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </View>
        <Wordmark width={90} />
        <Text style={{ fontSize: 8, color: C.accent, marginTop: 4, marginBottom: 56 }}>
          inteligência térmica urbana
        </Text>
        <Text style={s.eyebrow}>{outline.cover.eyebrow}</Text>
        <Text style={s.coverTitle}>{outline.cover.title}</Text>
        <Text style={s.program}>{outline.cover.program}</Text>
        <Text style={s.sponsor}>{outline.cover.sponsor}</Text>
        {outline.cover.facts.map((fact) => (
          <View key={fact.label} style={s.fact}>
            <Text style={s.factLabel}>{fact.label}</Text>
            <Text style={s.factValue}>{fact.value}</Text>
          </View>
        ))}
        <Text style={s.seal}>{outline.seal}</Text>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text>{outline.cover.program}</Text>
          <Text>{outline.title}</Text>
        </View>
        {outline.sections.map((section) => (
          <View key={section.id}>
            <Text style={s.h1} minPresenceAhead={60}>
              {section.title}
            </Text>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} s={s} />
            ))}
          </View>
        ))}
        <Text style={[s.seal, { marginTop: 16 }]}>{outline.seal}</Text>
        <View style={s.footer} fixed>
          <Text>{outline.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Gera o arquivo no navegador. */
export async function reportPdfBlob(outline: ReportOutline, fontBaseUrl?: string): Promise<Blob> {
  registerReportFonts(fontBaseUrl);
  return pdf(<ReportPdf outline={outline} />).toBlob();
}
