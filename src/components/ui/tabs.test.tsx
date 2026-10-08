import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TabPanel, Tabs } from "./tabs";

function Harness() {
  const [value, setValue] = useState<"a" | "b" | "c">("a");
  return (
    <>
      <Tabs
        idPrefix="t"
        label="Seções"
        value={value}
        onChange={setValue}
        tabs={[
          { id: "a", label: "Relatos" },
          { id: "b", label: "Sensores" },
          { id: "c", label: "Mapa" },
        ]}
      />
      <TabPanel idPrefix="t" id={value}>
        painel {value}
      </TabPanel>
    </>
  );
}

describe("<Tabs />", () => {
  it("liga aba e painel por ARIA e mantém só a aba ativa no tab order", () => {
    render(<Harness />);
    const active = screen.getByRole("tab", { name: "Relatos" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Sensores" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Relatos");
  });

  it("navega com setas, Home e End (circular)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "Relatos" }));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Mapa" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("painel c");
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Relatos" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}{End}");
    expect(screen.getByRole("tab", { name: "Mapa" })).toHaveFocus();
  });
});
