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

  data: {
    loadError: "Não foi possível carregar os dados.",
    retry: "Tentar novamente",
    updating: "Atualizando…",
    noMunicipality: "Selecione um município no cabeçalho para começar.",
  },

  map: {
    regionLabel: (municipality: string) => `Mapa de calor de ${municipality}`,
    loading: "Carregando o mapa…",
    webglError:
      "Este navegador não conseguiu iniciar o mapa (WebGL indisponível). Use a lista de quarteirões ao lado ou o ranking da tela de Prescrição.",
    layersLabel: "Camada",
    hourLabel: "Horário",
    hourValue: (hour: string) => `${hour} · horário local`,
    play: "Animar o dia (08h–18h)",
    pause: "Pausar animação",
    peakWindow: "Pico solar: 11h–15h",
    weather: (station: string, tMax: string) => `Dia de referência: ${station}, máxima de ${tMax}`,
    legendTitle: "Legenda",
    legendNoColorOnly: "Passe o cursor ou selecione um quarteirão para ver o valor exato.",
    tooltipHint: "Clique para ver o diagnóstico",
    alertMore: "Ver orientações à população",
    alertMeta: (maxTemp: string, until: string, source: string) =>
      `Máxima prevista de ${maxTemp} · até ${until} · ${source}`,
    overview: {
      title: "Resumo do município",
      blocks: "Quarteirões analisados",
      critical: "Críticos (IVTU)",
      peak: "UTCI de pico médio",
      lst: "Superfície média",
      distribution: "Distribuição do IVTU",
      hottest: "Quarteirões mais vulneráveis",
      hottestHint: "Selecione para localizar no mapa.",
      seeRanking: "Ver ranking completo",
    },
    panel: {
      label: "Diagnóstico do quarteirão",
      close: "Fechar diagnóstico",
      peakTitle: "Sensação térmica no pico",
      peakAt: (hour: string) => `às ${hour}`,
      atHour: (hour: string) => `Às ${hour}`,
      hourlyTitle: "UTCI ao longo do dia",
      hourlyDescription: "Sensação térmica do pedestre de hora em hora (08h–18h).",
      ivtuTitle: "Vulnerabilidade térmica (IVTU)",
      components: {
        thermal: "Estresse térmico",
        pedestrian: "Circulação de pedestres",
        social: "Vulnerabilidade social",
      },
      attributesTitle: "O que o satélite e o censo mostram",
      attributes: {
        lst: "Temperatura de superfície",
        canopy: "Cobertura arbórea",
        impervious: "Impermeabilização",
        pedestrians: "Pedestres no pico",
        elderly: "Idosos (65+)",
        drainage: "Risco de alagamento",
        sidewalk: "Largura da calçada",
        population: "Moradores",
      },
      pedestriansValue: (value: string) => `${value}/h`,
      recommendationTitle: "Intervenção recomendada",
      noRecommendation:
        "Nenhuma intervenção prioritária: o quarteirão já tem sombra e permeabilidade adequadas.",
      confidence: (value: string) => `Confiança ${value}`,
      more: (count: number) => `+${count} ${count === 1 ? "recomendação" : "recomendações"}`,
      openPrescription: "Ver prescrição completa",
      simulate: "Simular intervenção",
    },
  },

  prescription: {
    summaryLabel: "Quarteirões por nível de vulnerabilidade",
    filterByLevel: (level: string) => `Filtrar nível ${level}`,
    filters: {
      title: "Filtros",
      search: "Buscar",
      searchPlaceholder: "Código, rua ou bairro",
      neighborhood: "Bairro",
      zone: "Uso do solo",
      intervention: "Intervenção",
      executionLevel: "Prazo",
      all: "Todos",
      allFeminine: "Todas",
      clear: "Limpar filtros",
    },
    table: {
      caption: (municipality: string) =>
        `Ranking IVTU de ${municipality}: quarteirões e intervenção recomendada`,
      rank: "Posição",
      block: "Quarteirão",
      ivtu: "IVTU",
      utci: "UTCI pico",
      canopy: "Árvores",
      recommendation: "Recomendação",
      actions: "Ações",
      details: "Detalhes",
      detailsOf: (code: string) => `Ver prescrição do quarteirão ${code}`,
      sortBy: (column: string) => `Ordenar por ${column}`,
      empty: "Nenhum quarteirão encontrado com esses filtros.",
      results: (total: string) => `${total} quarteirões`,
      none: "Sem intervenção prioritária",
    },
    pagination: {
      label: "Paginação do ranking",
      previous: "Anterior",
      next: "Próxima",
      page: (page: number, total: number) => `Página ${page} de ${total}`,
    },
    detail: {
      eyebrow: (code: string, rank: string) => `${code} · ${rank}º no IVTU do município`,
      whyTitle: "Por que este quarteirão",
      recommendationsTitle: "Intervenções recomendadas",
      actions: "O que fazer",
      rationale: "Justificativa",
      sites: "Locais potenciais",
      species: "Espécies sugeridas",
      priority: (value: string) => `Prioridade ${value}`,
      checklistTitle: "Checklist de validação em campo",
      checklistDescription:
        "Toda indicação é um local potencial. Confirme em campo o que o satélite não vê.",
      checklistProgress: (done: number, total: number) => `${done} de ${total} itens verificados`,
      checklistNotes: "Observações da vistoria",
      checklistSave: "Salvar checklist",
      checklistSaved: "Checklist salvo.",
      checklistUpdated: (date: string) => `Atualizado em ${date}`,
      checklistSaving: "Salvando…",
      statuses: {
        pendente: "Pendente",
        conforme: "Conforme",
        "nao-conforme": "Não conforme",
        "nao-se-aplica": "Não se aplica",
      },
      openMap: "Ver no mapa",
      simulate: "Simular este quarteirão",
    },
  },

  simulator: {
    blockLabel: "Quarteirão",
    blockSearch: "Buscar quarteirão",
    blockSearchPlaceholder: "Código, rua ou bairro",
    blockSearchEmpty: "Nenhum quarteirão encontrado.",
    blockSummary: (ivtu: string, utci: string) => `IVTU ${ivtu} · UTCI de pico ${utci}`,
    changeBlock: "Trocar quarteirão",
    presetsLabel: "Cenários prontos",
    presets: {
      recommended: "Recomendação do Ipê",
      trees: "Só arborização",
      full: "Pacote completo",
      clear: "Zerar",
    },
    treesTitle: "Arborização",
    treesHint: (capacity: string) =>
      `O quarteirão comporta cerca de ${capacity} árvores em calçadas e solo livre (locais potenciais).`,
    treesUsed: (planted: string, capacity: string) => `${planted} de ${capacity} vagas`,
    speciesCount: (name: string) => `Quantidade de ${name}`,
    decrease: (name: string) => `Menos ${name}`,
    increase: (name: string) => `Mais ${name}`,
    speciesMeta: (size: string, crown: string, sidewalk: string) =>
      `${size} · copa de ${crown} · calçada ≥ ${sidewalk}`,
    unsuitable: "Calçada estreita para esta espécie",
    surfacesTitle: "Superfícies",
    permeable: "Pavimento permeável",
    permeableHint: "Parte do piso impermeável (exceto telhados) convertida em piso drenante.",
    coolRoof: "Pintura atérmica",
    coolRoofHint: "Parte dos telhados com tinta de alta refletância.",
    horizon: "Horizonte de avaliação",
    horizonValue: (years: number) => `${years} ${years === 1 ? "ano" : "anos"}`,
    horizonHint: "A copa cresce com os anos: o efeito das árvores aumenta com o horizonte.",
    resultTitle: "Resultado estimado",
    peakLabel: "UTCI no pico solar (11h–15h)",
    peakRange: (conservative: string, optimistic: string) =>
      `Faixa de incerteza: ${conservative} a ${optimistic}`,
    noIntervention: "Ajuste as intervenções à esquerda para ver o efeito.",
    chartTitle: "Sensação térmica ao longo do dia",
    chartDescription: "UTCI hora a hora, situação atual e com as intervenções.",
    series: { current: "Situação atual", simulated: "Com intervenção" },
    tableToggle: "Ver dados em tabela",
    hour: "Hora",
    delta: "Diferença",
    metrics: {
      surface: "Temperatura de superfície",
      evapotranspiration: "Evapotranspiração",
      runoff: "Escoamento da chuva",
      retained: (value: string) => `${value} m³/ano retidos`,
      canopy: "Cobertura arbórea",
      trees: "Árvores plantadas",
      permeableArea: "Piso permeável",
      coolRoofArea: "Telhado frio",
    },
    esgTitle: "Retorno ESG estimado",
    esg: {
      co2: (years: number) => `CO₂ sequestrado em ${years} anos`,
      co2Year: "Sequestro anual na maturidade",
      greenArea: "Área de copa",
      runoff: "Chuva retida por ano",
      survival: (value: string) => `Considera ${value} de sobrevivência das mudas.`,
      premises: "Premissas do cálculo",
    },
    warningsTitle: "Atenção",
    save: {
      title: "Salvar cenário",
      description: "Cenários salvos alimentam os relatórios para editais.",
      name: "Nome do cenário",
      namePlaceholder: "Ex.: Rua Tiradentes – arborização tática",
      submit: "Salvar cenário",
      saving: "Salvando…",
      saved: (name: string) => `Cenário “${name}” salvo.`,
      listTitle: "Cenários salvos",
      empty: "Nenhum cenário salvo neste município ainda.",
      load: "Carregar",
      loadAria: (name: string) => `Carregar o cenário ${name}`,
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
