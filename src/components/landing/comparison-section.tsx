import { Check, CircleDashed, Minus } from "lucide-react";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/i18n";
import { LandingSection } from "./section";

const t = messages.landing.comparison;
const IPE_INDEX = t.tools.length - 1;

function Value({ kind, note }: { kind: string; note: string }) {
  if (kind === "text") return <span className="text-sm text-fg">{note}</span>;
  const config =
    kind === "yes"
      ? { icon: Check, label: t.yes, className: "bg-accent text-accent-fg" }
      : kind === "partial"
        ? { icon: CircleDashed, label: t.partial, className: "bg-warning-soft text-warning-fg" }
        : { icon: Minus, label: t.no, className: "bg-surface-muted text-fg-subtle" };
  const Icon = config.icon;
  return (
    <span className="flex flex-col items-center gap-1 text-center">
      <span className={cn("grid size-7 place-items-center rounded-full", config.className)}>
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="text-xs font-medium text-fg">{config.label}</span>
      {note && <span className="text-[11px] leading-snug text-fg-muted">{note}</span>}
    </span>
  );
}

/** 03 · Diferenciais: tabela comparativa (ícone + texto; a cor nunca é o único sinal). */
export function ComparisonSection() {
  return (
    <LandingSection id="diferenciais" eyebrow={t.eyebrow} title={t.title}>
      <ScrollRegion
        label={t.caption}
        className="reveal rounded-card border border-line bg-surface shadow-card"
      >
        <table className="w-full min-w-[56rem] border-collapse text-left">
          <caption className="sr-only">{t.caption}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-56 px-5 py-4 text-sm font-semibold text-fg-muted">
                {t.criterion}
              </th>
              {t.tools.map((tool, i) =>
                i === IPE_INDEX ? (
                  <th
                    key={tool}
                    scope="col"
                    className="border-t-4 border-amarelo-ipe bg-accent-soft px-4 py-4 text-center"
                  >
                    <span className="text-xl font-bold tracking-tight text-fg">{tool}</span>
                  </th>
                ) : (
                  <th
                    key={tool}
                    scope="col"
                    className="px-4 py-4 text-center text-sm font-semibold text-fg"
                  >
                    {tool}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {t.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-5 py-4 text-sm font-semibold text-fg">
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td
                    key={t.tools[i]}
                    className={cn(
                      "px-4 py-4 text-center align-middle",
                      i === IPE_INDEX && "bg-accent-soft",
                    )}
                  >
                    <Value kind={value.kind} note={value.note} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      <p className="-mt-4 text-xs text-fg-subtle">{t.footnote}</p>
    </LandingSection>
  );
}
