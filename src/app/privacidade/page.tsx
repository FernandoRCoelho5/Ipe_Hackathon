import { Database, EyeOff, Mail, MapPin, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { Card, CardContent } from "@/components/ui/card";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.legal.privacyTitle,
  description: messages.legal.privacySummary,
};

const principles = [
  {
    icon: EyeOff,
    title: "Sem dados pessoais",
    body: "Não coletamos nome, telefone, foto de pessoas, documento ou endereço residencial. O número de WhatsApp de quem envia um relato é convertido em um identificador anônimo irreversível e descartado.",
  },
  {
    icon: MapPin,
    title: "Só o necessário",
    body: "Cada relato cidadão guarda apenas texto, coordenadas do ponto relatado e categoria. Esses dados servem para alertas e para calibrar o modelo de sensação térmica.",
  },
  {
    icon: Database,
    title: "Dados abertos e públicos",
    body: "O diagnóstico usa fontes públicas: imagens Landsat 8/9 e Sentinel-2, estações do INMET, OpenStreetMap e indicadores socioeconômicos agregados do IBGE e do Ipea.",
  },
  {
    icon: ShieldCheck,
    title: "Decisão humana",
    body: "As recomendações são pré-diagnósticos para subsidiar a análise do profissional responsável. A decisão final permanece com o servidor público ou com o responsável técnico da empresa.",
  },
  {
    icon: Mail,
    title: "Pedido de piloto",
    body: "Único formulário com dado pessoal: nome e e-mail institucional de quem pede um piloto, enviados com consentimento explícito e usados só para responder ao pedido. Na demonstração, ficam apenas na memória do servidor.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6"
      >
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-fg-muted uppercase">
            LGPD · Lei nº 13.709/2018
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-fg">
            {messages.legal.privacyTitle}
          </h1>
          <p className="text-base leading-relaxed text-fg-muted">{messages.legal.privacySummary}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {principles.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-fg-muted">
          Esta versão da plataforma opera com dados demonstrativos. No piloto, a política completa
          será publicada junto com o encarregado de dados (DPO) do contratante.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
