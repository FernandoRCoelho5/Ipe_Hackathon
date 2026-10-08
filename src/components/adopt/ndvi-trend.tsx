import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatSigned } from "@/lib/format";
import { messages } from "@/lib/i18n";

/** Variação de NDVI abaixo disso (por 30 dias) é tratada como estável. */
const FLAT = 0.005;

/** Tendência de NDVI com ícone e texto (não depende só da cor). */
export function NdviTrendBadge({ trend }: { trend: number }) {
  const t = messages.adopt;
  const value = formatSigned(trend, 3);
  if (trend > FLAT) {
    return (
      <Badge tone="accent" title={t.ndviTrend}>
        <TrendingUp aria-hidden />
        {t.ndviUp(value)}
      </Badge>
    );
  }
  if (trend < -FLAT) {
    return (
      <Badge tone="danger" title={t.ndviTrend}>
        <TrendingDown aria-hidden />
        {t.ndviDown(value)}
      </Badge>
    );
  }
  return (
    <Badge title={t.ndviTrend}>
      <Minus aria-hidden />
      {t.ndviFlat}
    </Badge>
  );
}
