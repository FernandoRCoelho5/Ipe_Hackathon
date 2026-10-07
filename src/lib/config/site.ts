import { messages } from "@/lib/i18n";

export const siteConfig = {
  name: messages.brand.name,
  fullName: messages.brand.fullName,
  description:
    "Plataforma WebGIS de suporte à decisão que mapeia ilhas de calor em escala de rua, estima a sensação térmica do pedestre (UTCI) e prescreve arborização e pavimento permeável.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt_BR",
  themeColor: { light: "#f9f9f3", dark: "#061b13" },
} as const;
