import { IvtuBadge } from "@/components/data/badges";
import { Meter } from "@/components/ui/meter";
import { DEFAULT_IVTU_CONFIG, type IvtuResult } from "@/domain/ivtu/ivtu";
import { formatPercent } from "@/lib/format";
import { messages } from "@/lib/i18n";

const COMPONENTS = ["thermal", "social", "pedestrian"] as const;

/** IVTU com os três componentes (0–1) e o peso de cada um no índice. */
export function IvtuBreakdown({ ivtu }: { ivtu: IvtuResult }) {
  const labels = messages.map.panel.components;
  const weights = DEFAULT_IVTU_CONFIG.weights;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold tracking-tight text-fg tabular">
          {Math.round(ivtu.score)}
        </span>
        <span className="text-sm text-fg-muted">/ 100</span>
        <IvtuBadge level={ivtu.level} showScore={false} className="ml-auto" />
      </div>
      {COMPONENTS.map((key) => (
        <Meter
          key={key}
          value={ivtu.components[key]}
          label={`${labels[key]} · peso ${formatPercent(weights[key])}`}
          valueText={formatPercent(ivtu.components[key])}
          color="var(--chart-current)"
        />
      ))}
    </div>
  );
}
