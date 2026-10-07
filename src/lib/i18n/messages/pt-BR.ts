/**
 * Dicionário pt-BR — fonte única dos textos da interface.
 * Novos idiomas devem implementar o tipo `Messages` (ver ../index.ts).
 */
export const ptBR = {
  brand: {
    name: "Ipê",
    fullName: "Ipê · Inteligência Térmica Urbana",
    tagline: "inteligência térmica urbana",
    logoLabel: "Ipê – Inteligência Térmica Urbana",
  },

  common: {
    skipToContent: "Pular para o conteúdo",
    close: "Fechar",
    openMenu: "Abrir menu de navegação",
    closeMenu: "Fechar menu de navegação",
    backToStart: "Voltar ao início",
    tryAgain: "Tentar novamente",
    loading: "Carregando…",
    expandSidebar: "Expandir navegação",
    collapseSidebar: "Recolher navegação",
  },

  legal: {
    seal: "Pré-diagnóstico automatizado para subsidiar a análise do profissional responsável.",
    potentialSites:
      "O sistema indica apenas locais potenciais; toda indicação exige validação em campo.",
    estimates: "Estimativas a validar no piloto.",
    privacyTitle: "Privacidade e LGPD",
    privacySummary:
      "O Ipê não armazena dados pessoais. Relatos cidadãos guardam apenas texto, coordenadas e categoria, com identificadores anônimos.",
  },

  demoData: {
    badge: "Dados demonstrativos",
    title: "Ambiente de demonstração",
    description:
      "Os dados exibidos são sintéticos e determinísticos, gerados para ilustrar o funcionamento da plataforma em Volta Redonda, Barra Mansa e Resende. No piloto, eles serão substituídos pelo pipeline real (Landsat/Sentinel, INMET e OpenStreetMap).",
  },

  theme: {
    label: "Tema",
    light: "Claro",
    dark: "Escuro",
    system: "Automático",
    switchTo: (next: string) => `Mudar tema para ${next}`,
  },

  municipality: {
    label: "Município",
    selectLabel: "Selecionar município",
    population: (value: string) => `${value} habitantes (Censo 2022)`,
  },

  nav: {
    primaryLabel: "Navegação principal",
    groups: {
      diagnosis: "Diagnóstico e ação",
      funding: "Captação e engajamento",
    },
    items: {
      map: {
        label: "Mapa de calor",
        description: "Ilhas de calor, sensação térmica e vulnerabilidade por quarteirão.",
      },
      prescription: {
        label: "Prescrição",
        description: "Ranking IVTU e intervenção recomendada por quarteirão.",
      },
      simulator: {
        label: "Simulador",
        description: "Cenários what-if de arborização, pavimento permeável e pintura atérmica.",
      },
      reports: {
        label: "Relatórios",
        description: "Justificativa técnica para Fundo Clima, FECAM, Ambiente Resiliente RJ e ESG.",
      },
      citizen: {
        label: "Ciência cidadã",
        description: "Relatos anônimos e rede de sensores IoT para calibração.",
      },
      adopt: {
        label: "Adote uma Ilha Verde",
        description: "Parcerias, NDVI e zeladoria preditiva das áreas adotadas.",
      },
    },
  },

  screens: {
    map: { eyebrow: "01 · Diagnóstico", title: "Mapa de calor urbano" },
    prescription: { eyebrow: "02 · Prescrição", title: "Ranking IVTU e prescrição" },
    simulator: { eyebrow: "03 · Simulação", title: "Simulador what-if" },
    reports: { eyebrow: "04 · Captação", title: "Relatórios para editais" },
    citizen: { eyebrow: "05 · Engajamento", title: "Ciência cidadã e sensores IoT" },
    adopt: { eyebrow: "06 · Continuidade", title: "Adote uma Ilha Verde" },
    inProgress: {
      title: "Tela em implementação",
      description:
        "Esta tela faz parte do plano de entrega e será disponibilizada nas próximas fases.",
    },
  },

  landing: {
    eyebrow: "Plataforma de inteligência territorial",
    title: "Saiba em qual rua o calor é pior — e o que fazer em cada quarteirão.",
    lead: "O Ipê traduz dados de satélite, clima e mapas urbanos em diagnóstico de rua, prescrição de infraestrutura verde e relatórios prontos para captar recursos.",
    ctaDemo: "Ver demonstração",
    regionNote: "Piloto no Sul Fluminense: Volta Redonda, Barra Mansa e Resende.",
  },

  errors: {
    notFoundTitle: "Página não encontrada",
    notFoundDescription: "O endereço pode ter mudado ou a página não existe mais.",
    genericTitle: "Algo não saiu como esperado",
    genericDescription:
      "Não foi possível carregar esta tela. Tente novamente; se o problema persistir, recarregue a página.",
  },
} as const;
