import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { SkipLink } from "@/components/layout/skip-link";
import { siteConfig } from "@/lib/config/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.fullName}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.fullName,
  keywords: [
    "ilhas de calor",
    "sensação térmica",
    "UTCI",
    "infraestrutura verde",
    "arborização urbana",
    "pavimento permeável",
    "WebGIS",
    "Sul Fluminense",
  ],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.fullName,
    title: siteConfig.fullName,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.fullName,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteConfig.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: siteConfig.themeColor.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica o tema antes da primeira pintura (ver src/lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
