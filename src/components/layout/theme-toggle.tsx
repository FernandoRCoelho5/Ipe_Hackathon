"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import { nextThemePreference, type ThemePreference } from "@/lib/theme";
import { useTheme } from "@/lib/use-theme";

const icons: Record<ThemePreference, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const next = nextThemePreference(preference);
  const Icon = icons[preference];
  const label = messages.theme.switchTo(messages.theme[next].toLowerCase());

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setPreference(next)}
      aria-label={label}
      title={`${messages.theme.label}: ${messages.theme[preference]}`}
    >
      <Icon aria-hidden />
    </Button>
  );
}
