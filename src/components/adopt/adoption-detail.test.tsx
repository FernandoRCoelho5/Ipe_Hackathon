import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MaintenanceTask } from "@/domain/adoption/schema";
import { effectiveTaskStatus } from "./adoption-detail";
import { NdviTrendBadge } from "./ndvi-trend";

const task = (status: MaintenanceTask["status"], dueDate: string): MaintenanceTask => ({
  id: "t1",
  type: "irrigacao",
  dueDate,
  status,
  predicted: false,
  reason: "Rega quinzenal",
});

describe("zeladoria", () => {
  it("pendente com prazo vencido conta como atrasada", () => {
    expect(effectiveTaskStatus(task("pendente", "2026-10-06"), "2026-10-07")).toBe("atrasada");
    expect(effectiveTaskStatus(task("pendente", "2026-10-07"), "2026-10-07")).toBe("pendente");
    expect(effectiveTaskStatus(task("concluida", "2026-09-01"), "2026-10-07")).toBe("concluida");
  });
});

describe("<NdviTrendBadge />", () => {
  it("descreve a tendência em texto, não só por cor", () => {
    const { rerender } = render(<NdviTrendBadge trend={0.018} />);
    expect(screen.getByText(/Mais verde/)).toHaveTextContent("+0,018");
    rerender(<NdviTrendBadge trend={-0.02} />);
    expect(screen.getByText(/Perdendo verde/)).toBeInTheDocument();
    rerender(<NdviTrendBadge trend={0.001} />);
    expect(screen.getByText("Estável")).toBeInTheDocument();
  });
});
