// Boilerplate of the PGR (own wording; same purpose and normative basis as the
// reference model — NR-01 GRO/PGR item 1.5, NR-06, NR-07, NR-09, NR-15, NR-17,
// Portaria SEPRT 6.730/2020, Portaria 25/1994, NT 146/2015).
// Plain text: the builder escapes everything. Strings that need inline bold are
// split in parts ({ b } = bold, { i } = italic) and rendered by rich() in pgr-doc.

export type RichPart = string | { b: string } | { i: string };

export const NR01_GATILHOS: readonly string[] = [
  'após a implementação das medidas de prevenção, para avaliação dos riscos residuais;',
  'após inovações e modificações nas tecnologias, ambientes, processos, condições, procedimentos e organização do trabalho que impliquem novos riscos ou modifiquem os existentes;',
  'quando identificadas inadequações, insuficiências ou ineficácias das medidas de prevenção;',
  'na ocorrência de acidentes ou doenças relacionadas ao trabalho;',
  'quando houver mudança nos requisitos legais aplicáveis.',
];

export const PGR_TXT = {
  revisoes:
    'Este quadro registra cada revisão do programa, com número, data e itens alterados, permitindo rastrear a evolução do documento e manter atualizadas as informações de segurança e saúde no trabalho durante toda a sua vigência.',

  apresentacao:
    'Este Programa de Gerenciamento de Riscos (PGR) foi elaborado para atender à Norma Regulamentadora nº 01 (NR-01), com a redação aprovada pela Portaria SEPRT nº 6.730, de 9 de março de 2020. A norma estabelece as diretrizes do Gerenciamento de Riscos Ocupacionais (GRO) e determina que toda organização que admita trabalhadores como empregados implemente o PGR em seus estabelecimentos.',

  intro: [
    'O Gerenciamento de Riscos Ocupacionais (GRO) é o processo contínuo pelo qual a organização antecipa, reconhece, avalia e controla os riscos presentes no trabalho, buscando a melhoria permanente das condições de segurança e saúde. O seu principal instrumento é o Programa de Gerenciamento de Riscos (PGR).',
    'O PGR reúne as diretrizes e as ações adotadas para identificar perigos, avaliar e monitorar os riscos ocupacionais e implementar as medidas de prevenção correspondentes. O programa deve contemplar, ou estar integrado a, os demais planos, programas e ações de segurança e saúde do estabelecimento e as exigências das outras Normas Regulamentadoras.',
    'O programa tem fundamento no capítulo 1.5 da Norma Regulamentadora nº 01, com a redação dada pela Portaria SEPRT nº 6.730, de 9 de março de 2020.',
  ],

  base: [
    'Este documento-base descreve a estrutura do programa: a estratégia e a metodologia de ação, as formas de registro, manutenção e divulgação dos dados, a periodicidade e a forma de avaliação do seu desenvolvimento e as metas a serem alcançadas.',
    'O programa, suas revisões e complementações devem ser apresentados e discutidos com a Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA) ou, quando esta não for exigida, com o representante designado nos termos da NR-05.',
    'O documento-base e suas atualizações devem permanecer à disposição dos trabalhadores interessados, de seus representantes e da Inspeção do Trabalho.',
  ],

  pcmso:
    'O inventário de riscos deste PGR é a base do controle médico ocupacional. As informações sobre as exposições dos trabalhadores devem estar articuladas com as demais Normas Regulamentadoras e, em especial, com o Programa de Controle Médico de Saúde Ocupacional (PCMSO) previsto na NR-07, que define os exames clínicos e complementares de cada função.',

  estrutura: 'Conforme a NR-01, este documento-base contempla os seguintes elementos estruturais do programa:',
  estruturaItens: ['Inventário de riscos ocupacionais;', 'Planejamento continuado;', 'Plano de ação;', 'Registro e manutenção dos dados.'],

  planejamento:
    'A avaliação de riscos é um processo contínuo. O inventário e o plano de ação devem ser revistos no máximo a cada dois anos ou antes, sempre que ocorrer uma das situações abaixo (NR-01, item 1.5.4.4.6):',
  planejamentoFim:
    'Para as organizações que possuam certificação em sistema de gestão de segurança e saúde no trabalho, o intervalo máximo de revisão pode ser de até 3 (três) anos.',

  planoAcoes: [
    'A partir do inventário de riscos, cada medida de prevenção a ser introduzida, aprimorada ou mantida é registrada no plano de ação, com cronograma, responsáveis e formas de acompanhamento e de aferição dos resultados, de modo a verificar se as ações produzem os benefícios esperados.',
    'A execução das ações previstas é de responsabilidade da organização, que deve observar os prazos, as metas e as prioridades estabelecidos.',
    'Quando duas ou mais organizações desenvolverem atividades simultaneamente no mesmo local de trabalho, devem executar ações integradas para aplicar as medidas de prevenção, de forma a proteger todos os trabalhadores expostos aos riscos ocupacionais.',
    'Na contratação de prestadores de serviço, o PGR da contratante pode incluir as medidas de prevenção aplicáveis às contratadas que atuem em suas dependências ou em local previamente definido em contrato, ou fazer referência aos programas dessas empresas.',
  ],

  estrategia:
    'A estratégia de ação busca soluções efetivas para o controle dos riscos nos ambientes de trabalho. As avaliações podem ser qualitativas ou quantitativas, conforme as Normas Regulamentadoras, e se apoiam nas informações levantadas no estabelecimento, nas reuniões de planejamento e nos resultados das avaliações realizadas. As medidas de prevenção obedecem à seguinte ordem de prioridade (NR-01, item 1.4.1, alínea "g"):',
  estrategiaItens: [
    'eliminação dos fatores de risco;',
    'minimização e controle dos fatores de risco, com a adoção de medidas de proteção coletiva;',
    'minimização e controle dos fatores de risco, com a adoção de medidas administrativas ou de organização do trabalho;',
    'adoção de medidas de proteção individual.',
  ],

  registro: [
    'A organização deve manter o inventário de riscos e o histórico de suas atualizações como registro técnico e administrativo, de forma a permitir a rastreabilidade das avaliações realizadas, das medidas adotadas e das decisões tomadas.',
    'Os registros do PGR devem ser preservados por, no mínimo, 20 (vinte) anos (NR-01, item 1.5.7.3.3.1) e ficar disponíveis aos trabalhadores interessados, aos seus representantes e à Inspeção do Trabalho. Os riscos e as medidas de prevenção são divulgados aos trabalhadores por meio de treinamentos, ordens de serviço, integração e reuniões de segurança.',
  ],

  desenvolvimento: [
    'O desenvolvimento do PGR inicia-se pelo levantamento preliminar de perigos, realizado antes do início do funcionamento do estabelecimento ou de novas instalações, e pela identificação dos perigos e avaliação dos riscos das atividades já existentes (NR-01, item 1.5.4).',
    'Quando não for possível evitar ou eliminar o risco, a organização deve proceder à sua identificação e avaliação, considerando os agentes e perigos descritos a seguir, e definir as medidas de prevenção correspondentes.',
  ],

  agentesIntro:
    'A identificação dos agentes considera as fontes ou circunstâncias presentes nos ambientes, as atividades desenvolvidas e as possíveis lesões ou agravos à saúde. Para fins deste programa, os agentes são classificados da seguinte forma:',
  agentes: [
    ['Agentes Físicos:', 'formas de energia a que os trabalhadores possam estar expostos, como ruído, vibrações, pressões anormais, temperaturas extremas, radiações ionizantes e não ionizantes, infrassom e ultrassom. A umidade também é considerada neste grupo, conforme a classificação da Portaria nº 25/1994.'],
    ['Agentes Químicos:', 'substâncias, compostos ou produtos que possam penetrar no organismo pela via respiratória, na forma de poeiras, fumos, névoas, neblinas, gases ou vapores, ou que possam ser absorvidos pela pele ou por ingestão, como os produtos de limpeza e saneantes.'],
    ['Agentes Biológicos:', 'microrganismos como bactérias, fungos, vírus, protozoários e parasitas, além de materiais de origem orgânica, capazes de provocar doenças ou agravos à saúde.'],
  ] as const,
  agentesOutros:
    'Além dos agentes ambientais tratados na NR-09, este programa avalia os fatores ergonômicos e os riscos de acidentes, conforme a classificação adotada pela Portaria nº 25/1994:',
  ergonomico: [
    'Risco Ergonômico:',
    'fatores que interferem nas características psicofisiológicas do trabalhador, causando desconforto ou afetando a sua saúde, tratados na NR-17. São exemplos:',
  ] as const,
  ergonomicoItens: [
    'postura inadequada;',
    'ritmo de trabalho excessivo;',
    'levantamento e transporte manual de cargas;',
    'exigência rígida de produtividade;',
    'trabalho em turnos e noturno;',
    'jornadas de trabalho prolongadas;',
    'esforço físico intenso;',
    'monotonia e repetitividade;',
    'outras situações causadoras de estresse físico ou psíquico.',
  ],
  acidente: ['Risco de Acidente:', 'condições do ambiente ou do processo de trabalho capazes de afetar a integridade física do trabalhador. São exemplos:'] as const,
  acidenteItens: [
    'arranjo físico inadequado;',
    'armazenamento inadequado;',
    'iluminação deficiente;',
    'máquinas e equipamentos sem proteção;',
    'ferramentas inadequadas ou defeituosas;',
    'animais peçonhentos;',
    'probabilidade de incêndio ou explosão;',
    'eletricidade;',
    'outras situações que possam contribuir para a ocorrência de acidentes.',
  ],

  perigos:
    'Perigo é a fonte, situação ou ato com potencial de causar lesão ou agravo à saúde das pessoas, danos ao meio ambiente ou ao patrimônio. Enquanto o risco expressa a combinação entre a probabilidade e a gravidade do dano, o perigo é o próprio fator causador. Neste PGR, os perigos são registrados em bloco próprio do inventário de cada GHE (letra P).',

  visita: [
    'A visita técnica é a etapa em que os riscos são identificados no próprio local, por observação direta dos ambientes, das atividades e dos processos de trabalho.',
    'A avaliação é qualitativa e conta com a participação dos trabalhadores e das chefias, cujas informações sobre a rotina, a duração das tarefas e os incidentes ocorridos complementam a observação técnica. O reconhecimento dos riscos segue as etapas previstas na NR-09:',
  ],
  visitaItens: [
    'Identificação dos perigos e riscos e de seus agentes causadores;',
    'Identificação das funções e dos trabalhadores expostos;',
    'Fonte geradora ou circunstâncias da exposição;',
    'Possíveis danos à saúde relacionados aos riscos identificados;',
    'Medidas de controle existentes e medidas propostas.',
  ],

  qualit1: [
    'A avaliação qualitativa baseia-se no reconhecimento e na antecipação dos riscos ocupacionais, sem o uso de instrumentos de medição, e considera a ',
    { b: 'SEVERIDADE' },
    ' do dano possível e a ',
    { b: 'FREQUÊNCIA' },
    ' da exposição aos fatores de risco. Os riscos registrados no item 7 deste documento foram classificados por meio da matriz descrita a seguir.',
  ] as RichPart[],
  qualit2: ['A graduação do risco, considerando o ', { b: 'TIPO DE EXPOSIÇÃO - TE' }, ', é obtida pela equação abaixo:'] as RichPart[],
  onde: ['GR - Graduação do Risco;', 'S - Severidade (Potencial de Dano);', 'F - Frequência (Tempo de Exposição).'],
  qualitPd: ['O ', { b: 'Potencial de Dano - PD' }, ' é definido conforme a tabela abaixo.'] as RichPart[],
  pd: [
    ['Baixo', ['O agente ou a condição de trabalho não representa risco potencial de dano à saúde nas condições usuais descritas na literatura, podendo causar apenas desconforto.']],
    [
      'Médio',
      [
        'O agente representa risco moderado à saúde, sem efeitos agudos nas condições usuais, mas não há controle técnico da exposição;',
        'O agente pode causar efeitos agudos, porém as práticas operacionais ou as condições do ambiente indicam controle técnico da exposição;',
        'O agente é irritante, cáustico ou corrosivo para olhos, mucosas e pele, porém a exposição está tecnicamente controlada;',
        'O agente pode ser absorvido pela pele, porém a exposição está tecnicamente controlada.',
      ],
    ],
    [
      'Alto',
      [
        'Há exposição a agente capaz de causar efeitos agudos e as práticas operacionais ou as condições do ambiente indicam aparente descontrole da exposição;',
        'O agente é irritante, cáustico, corrosivo ou carcinogênico e o controle da exposição é aparentemente insuficiente;',
        'O agente pode ser absorvido pela pele (notação “pele”) e há indícios de descontrole da exposição;',
        'Existe possibilidade de deficiência de oxigênio;',
        'Há queixas específicas ou indicadores biológicos de exposição acima dos limites, segundo informações do controle médico.',
      ],
    ],
    [
      'Crítico',
      [
        'Há exposição sem controle a agentes carcinogênicos;',
        'Há situação aparente de risco grave e iminente, ou o agente tem efeitos agudos e a exposição está descontrolada;',
        'Há queixas específicas e frequentes, com indicadores biológicos de exposição acima dos limites;',
        'Há exposição cutânea severa a substâncias com notação “pele”;',
        'Há risco aparente de deficiência de oxigênio.',
      ],
    ],
  ] as [string, string[]][],
  qualitTe: ['O ', { b: 'Tempo de Exposição – TE' }, ' ao agente é definido conforme a tabela a seguir.'] as RichPart[],
  te: [
    ['Eventual', 'Exposição inferior a 30 (trinta) minutos da jornada de trabalho.'],
    ['Intermitente', 'Exposição diária entre 30 (trinta) minutos e 6 (seis) horas da jornada de trabalho.'],
    ['Permanente', 'Exposição diária superior a 6 (seis) horas da jornada de trabalho.'],
  ] as [string, string][],
  qualitGr: ['A ', { b: 'Graduação de Risco – GR' }, ' resulta do cruzamento entre a severidade e a frequência, conforme o Quadro 1.'] as RichPart[],
  qualitAcoes: 'As ações corretivas e preventivas são definidas em função da Graduação de Risco identificada, conforme a tabela abaixo.',
  acoes: [
    ['T', 'Tolerável', 'Não é necessária a adoção de novas medidas.'],
    ['M', 'Moderado', 'Reavaliar os meios de controle e, quando necessário, adotar medidas complementares.'],
    ['S', 'Substancial', 'Implantar novas medidas de controle ou corrigir as falhas das medidas existentes.'],
    ['IT', 'Intolerável', 'Implantar novas medidas de controle, algumas delas de caráter imediato.'],
  ] as [string, string, string][],
  qualitFim:
    'Concluída a avaliação, os riscos são classificados nos termos do subitem 1.5.4.4.2 da NR-01, para determinar a necessidade de adoção de medidas de prevenção e para a elaboração do plano de ação.',

  ghe: [
    'Grupo Homogêneo de Exposição (GHE) é o conjunto de trabalhadores que experimentam exposição semelhante, de forma que a avaliação da exposição de qualquer um deles seja representativa da exposição dos demais integrantes do grupo.',
    'Com base na visita técnica e no cadastro do estabelecimento, foram definidos os seguintes grupos homogêneos de exposição:',
  ],
  indicadorPadrao: 'Não foram relatadas situações indicativas de prejuízo à saúde dos empregados relacionadas a este fator.',

  controles: 'Devem ser adotadas medidas de prevenção para eliminar, reduzir ou controlar os riscos sempre que (NR-01, item 1.5.5.1.1):',
  controlesItens: [
    ['as exigências previstas nas Normas Regulamentadoras e nos dispositivos legais determinarem;'],
    ['a classificação dos riscos ocupacionais assim determinar, conforme o item 6.2 deste documento;'],
    ['houver evidências de associação, por meio do controle médico da saúde, entre as lesões e os agravos à saúde dos trabalhadores e os riscos identificados;'],
    [
      'os resultados das avaliações quantitativas da exposição dos trabalhadores excederem os limites de tolerância da NR-15 ou, na sua ausência, os valores limite de exposição ocupacional adotados pela ACGIH - ',
      { i: 'American Conference of Governmental Industrial Hygienists' },
      ', ou valores mais rigorosos estabelecidos em negociação coletiva.',
    ],
  ] as RichPart[][],
  controlesHierarquia:
    'Quando comprovada a inviabilidade técnica da adoção de medidas de proteção coletiva, ou quando estas não forem suficientes, estiverem em fase de estudo, planejamento ou implantação, ou ainda em caráter complementar ou emergencial, devem ser adotadas outras medidas, obedecida a seguinte hierarquia (NR-01, item 1.5.5.1.2):',
  controlesHierarquiaItens: ['medidas administrativas ou de organização do trabalho;', 'utilização de Equipamento de Proteção Individual – EPI.'],
  controlesEpi:
    'A NR-06 exige que o fornecimento de EPI ao trabalhador seja registrado em livros, fichas ou sistema eletrônico. Para esse registro, este programa disponibiliza o modelo de ficha de controle de EPI do Apêndice A.',

  epiVigenciaNota: '* Vigência do Certificado de Aprovação. O prazo de validade do próprio EPI pode ser diferente, conforme a Nota Técnica nº 146/2015 – MTE.',
  epiCa:
    'O Certificado de Aprovação (CA) é emitido pelo órgão nacional competente em matéria de segurança e saúde no trabalho e atesta que o EPI foi ensaiado e atende aos requisitos técnicos aplicáveis. O equipamento somente pode ser comercializado ou utilizado com a indicação do CA, que deve estar marcada no próprio EPI (NR-06, itens 6.2 e 6.9.3).',
  epiValidade:
    'Antes da aquisição, a validade do CA deve ser consultada no sistema oficial do Ministério do Trabalho e Emprego; não deve ser adquirido EPI com certificado vencido. O equipamento comprado durante a vigência do CA pode ser utilizado até o fim de sua vida útil, desde que mantenha as condições de proteção, conforme a Nota Técnica nº 146/2015.',

  plano: [
    'O plano de ação estabelece as prioridades e as ações destinadas a promover a segurança e a saúde dos trabalhadores, por meio das medidas de prevenção e de controle recomendadas com base nas normas vigentes e na literatura técnica.',
    'Ao final da vigência do PGR, as ações devem ser avaliadas para verificar a sua execução e orientar a adoção de medidas complementares que se façam necessárias.',
    'Para cada medida de prevenção devem ser definidos o cronograma e as formas de acompanhamento e de aferição dos resultados.',
    'As prioridades foram atribuídas de acordo com o inventário de riscos e perigos, segundo os parâmetros abaixo:',
  ],
  prioridades: [
    ['A', 'Crítico/ Emergencial', ['A implantação das medidas de controle é inadiável e indispensável para a continuidade das atividades;', 'Há risco grave e iminente para os trabalhadores ou para o meio ambiente caso não sejam adotadas medidas imediatas.']],
    ['B', 'Primária', ['As medidas atendem a requisitos legais com repercussão na segurança e na saúde dos trabalhadores, na produção e nas finanças da organização;', 'As avaliações quantitativas indicam valores acima dos limites de tolerância.']],
    ['C', 'Secundária', ['As medidas atendem a requisitos legais com repercussão na segurança e na saúde dos trabalhadores;', 'As avaliações quantitativas indicam valores acima do nível de ação e abaixo dos limites de tolerância.']],
    ['D', 'Terciária', ['As medidas contribuem para a melhoria das condições de segurança e saúde dos trabalhadores, com potencial impacto positivo na produção.']],
  ] as [string, string, string[]][],
  prioridadeRegra:
    'Quando a prioridade não é informada no inventário, ela é atribuída pela Graduação de Risco do item avaliado: Intolerável → A; Substancial → B; Moderado → C; Tolerável → D. Para as não conformidades da inspeção, considera-se o risco atribuído ao item: Crítico → A; Alto → B; Médio → C; Baixo → D.',
  reanaliseNota: 'Conforme o item 1.5.4.4.6 da NR-01, a avaliação de riscos (reanálise do PGR) é um processo contínuo e deve ser revista a cada dois anos ou quando ocorrer qualquer das situações a seguir:',

  finais: [
    'Os trabalhadores podem apresentar propostas e receber informações e orientações que contribuam para a proteção de sua segurança e saúde no trabalho.',
    'A organização deve informar aos trabalhadores os riscos ocupacionais existentes nos locais de trabalho, as medidas de prevenção adotadas e os meios para eliminar ou reduzir esses riscos, bem como os resultados das avaliações ambientais e dos exames médicos que lhes digam respeito.',
    'Quando várias organizações atuarem simultaneamente no mesmo local de trabalho, as ações de prevenção devem ser integradas, de modo a proteger todos os trabalhadores expostos.',
    'A percepção dos trabalhadores sobre os riscos de suas atividades deve ser considerada no planejamento e na revisão das medidas de prevenção.',
    'Diante de situação de trabalho que, a seu ver, represente risco grave e iminente para a sua vida ou saúde ou a de terceiros, o trabalhador pode interromper as suas atividades, comunicando imediatamente o fato ao superior hierárquico, que deve diligenciar as medidas cabíveis.',
  ],

  referencias: [
    'BRASIL. Ministério do Trabalho e Emprego. NR 01 – Disposições Gerais e Gerenciamento de Riscos Ocupacionais. Redação dada pela Portaria SEPRT nº 6.730, de 9 de março de 2020.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 04 – Serviços Especializados em Segurança e em Medicina do Trabalho. Redação dada pela Portaria MTP nº 2.318, de 3 de agosto de 2022.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 05 – Comissão Interna de Prevenção de Acidentes e de Assédio. Redação dada pela Portaria MTP nº 422, de 7 de outubro de 2021.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 06 – Equipamentos de Proteção Individual – EPI. Redação dada pela Portaria MTP nº 2.175, de 28 de julho de 2022.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 07 – Programa de Controle Médico de Saúde Ocupacional – PCMSO. Redação dada pela Portaria SEPRT nº 6.734, de 9 de março de 2020.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 09 – Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos. Redação dada pela Portaria SEPRT nº 6.735, de 9 de março de 2020.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 15 – Atividades e Operações Insalubres. Portaria MTb nº 3.214, de 8 de junho de 1978, e alterações posteriores.',
    'BRASIL. Ministério do Trabalho e Emprego. NR 17 – Ergonomia. Redação dada pela Portaria MTP nº 423, de 7 de outubro de 2021.',
    'BRASIL. Ministério do Trabalho. Portaria SSST nº 25, de 29 de dezembro de 1994 (classificação dos riscos ambientais e mapa de riscos).',
    'BRASIL. Ministério do Trabalho e Emprego. Nota Técnica nº 146/2015 – validade do Certificado de Aprovação de EPI.',
  ],

  responsabilidade:
    'A produção técnica deste Programa de Gerenciamento de Riscos (PGR), elaborado a partir dos dados levantados em visita(s) técnica(s) e no cadastro da organização, é de responsabilidade do profissional abaixo identificado, sob supervisão da Futuro Facilite Treinamentos.',

  drpsIntroCom:
    'Os fatores de risco psicossociais relacionados ao trabalho integram o gerenciamento de riscos ocupacionais (NR-01). Foram avaliados por meio do Diagnóstico de Riscos Psicossociais (DRPS), aplicado de forma confidencial (50 questões, 13 tópicos). Os resultados entram neste PGR apenas de forma coletiva, sem identificação nominal dos trabalhadores.',
  drpsIntroSem:
    'Os fatores de risco psicossociais relacionados ao trabalho integram o gerenciamento de riscos ocupacionais (NR-01) e devem ser identificados, avaliados e informados neste PGR. O Diagnóstico de Riscos Psicossociais (DRPS) ainda não foi aplicado neste estabelecimento; este item permanece aberto até a coleta das respostas dos trabalhadores.',
  drpsInventario:
    'Os fatores psicossociais registrados no cadastro de riscos não constam das tabelas de inventário dos GHE (item 7.1); são apresentados abaixo e tratados no plano de ação (item 10).',
  drpsMedidas:
    'Os fatores em gravidade alta devem ser tratados no plano de ação deste PGR, com medidas organizacionais e relacionais, como canal de denúncia, suporte da liderança, clareza de papéis, dimensionamento de equipe, comunicação e reconhecimento, sem exposição nominal dos trabalhadores. O DRPS deve ser reaplicado após as intervenções ou quando houver mudança relevante na organização do trabalho.',
  drpsConfidencial: 'As respostas individuais não constam deste documento; o PGR informa apenas o resultado coletivo, por tópico.',
};
