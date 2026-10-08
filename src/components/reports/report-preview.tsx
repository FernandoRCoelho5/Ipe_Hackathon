import { cn } from "@/lib/cn";
import type { OutlineBlock, ReportOutline } from "./report-outline";

/** Pré-visualização em HTML do mesmo roteiro que gera o PDF e o DOCX. */
export function ReportPreview({ outline }: { outline: ReportOutline }) {
  return (
    <article
      aria-label={outline.title}
      className="flex flex-col gap-8 rounded-card border border-line bg-surface p-6 shadow-card sm:p-10"
    >
      <header className="flex flex-col gap-3 border-b border-line pb-8">
        <span aria-hidden className="h-1.5 w-24 rounded-full brand-gradient" />
        <p className="text-xs font-medium tracking-[0.18em] text-fg-muted uppercase">
          {outline.cover.eyebrow}
        </p>
        <h2 className="text-2xl leading-tight font-bold tracking-tight text-fg sm:text-3xl">
          {outline.cover.title}
        </h2>
        <p className="text-base font-semibold text-accent">
          {outline.cover.program}
          <span className="block text-sm font-normal text-fg-muted">{outline.cover.sponsor}</span>
        </p>
        <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          {outline.cover.facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="font-medium text-fg">{fact.label}</dt>
              <dd className="text-fg-muted">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {outline.sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`rel-${section.id}`}
          className="flex flex-col gap-3"
        >
          <h3 id={`rel-${section.id}`} className="text-lg font-semibold text-fg">
            {section.title}
          </h3>
          {section.blocks.map((block, i) => (
            <PreviewBlock key={i} block={block} />
          ))}
        </section>
      ))}

      <footer className="flex flex-col gap-2 border-t border-line pt-6 text-xs text-fg-muted">
        <p className="rounded-control border-l-4 border-accent bg-accent-soft p-3 text-sm text-fg">
          {outline.seal}
        </p>
        <p>{outline.footer}</p>
      </footer>
    </article>
  );
}

function PreviewBlock({ block }: { block: OutlineBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p
          className={cn(
            "text-sm leading-relaxed",
            block.muted ? "text-fg-subtle" : "text-fg-muted",
          )}
        >
          {block.text}
        </p>
      );
    case "bullets":
      return (
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-fg-muted">
          {block.items.map((item) => (
            <li key={item.text} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-amarelo-ipe" />
              <span>
                {item.text}
                {item.source && (
                  <span className="block text-xs text-fg-subtle italic">{item.source}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      );
    case "kpis":
      return (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {block.items.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-1 rounded-control bg-accent-soft p-3">
              <dt className="text-xs text-fg-muted">{kpi.label}</dt>
              <dd className="text-lg font-bold text-fg tabular">{kpi.value}</dd>
              {kpi.hint && <dd className="text-xs text-fg-subtle">{kpi.hint}</dd>}
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            {block.caption && (
              <caption className="mb-2 text-left text-xs font-semibold text-fg-muted">
                {block.caption}
              </caption>
            )}
            <thead>
              <tr className="bg-primary text-primary-fg">
                {block.columns.map((c) => (
                  <th
                    key={c.label}
                    scope="col"
                    style={{ width: `${c.width * 100}%` }}
                    className={cn(
                      "px-2.5 py-2 text-xs font-semibold",
                      c.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((value, i) => (
                    <td
                      key={i}
                      className={cn(
                        "px-2.5 py-2 text-fg tabular",
                        block.columns[i].align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
