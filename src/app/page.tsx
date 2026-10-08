import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { AdoptionSection } from "@/components/landing/adoption-section";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { Hero } from "@/components/landing/hero";
import { HowSection } from "@/components/landing/how-section";
import { ImpactSection } from "@/components/landing/impact-section";
import { PilotSection } from "@/components/landing/pilot-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { siteConfig } from "@/lib/config/site";
import { messages } from "@/lib/i18n";
import { buildShowcase } from "@/server/services/showcase";

const hero = messages.landing.hero;

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.fullName} — ${hero.title}` },
  description: hero.lead,
  alternates: { canonical: "/" },
  // Objetos aninhados substituem os do layout: repete tipo, idioma e nome do site.
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.fullName,
    title: hero.title,
    description: hero.lead,
    url: "/",
  },
};

/** Recorte demonstrativo da landing: determinístico, cacheado e pré-renderizado. */
async function getShowcase() {
  "use cache";
  cacheLife("days");
  return buildShowcase();
}

/** Dados estruturados (schema.org) para buscadores. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.fullName,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  description: siteConfig.description,
  url: siteConfig.url,
  areaServed: ["Volta Redonda", "Barra Mansa", "Resende"].map((name) => ({
    "@type": "City",
    name,
  })),
};

/** Landing/pitch pública, na ordem do pitch de 4:30 min (ver docs/PITCH.md). */
export default async function Home() {
  const showcase = await getShowcase();
  return (
    <div className="flex min-h-dvh flex-col">
      <script
        type="application/ld+json"
        // Conteúdo estático do próprio código; "<" escapado por precaução.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <PublicHeader />
      <main id="conteudo" className="flex-1">
        <Hero showcase={showcase} />
        <ProblemSection showcase={showcase} />
        <SolutionSection />
        <ComparisonSection />
        <HowSection />
        <ImpactSection />
        <AdoptionSection />
        <PilotSection />
      </main>
      <PublicFooter />
    </div>
  );
}
