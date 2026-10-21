// LTCAT boilerplate (own wording; same purpose and normative basis as the
// reference laudo). Plain text unless the name ends in Html (trusted, constant).

export const LTCAT_T = {
  revisoes:
    'O controle de revisões registra cada alteração deste laudo, com a data e os itens modificados. Ele mantém o histórico necessário à gestão integrada de segurança, saúde e meio ambiente e orienta o acompanhamento das informações de SST enviadas ao eSocial que mudarem durante a vigência do laudo.',
  revisaoBase: 'Documento-Base e Anexos',
  apresentacao:
    'Este Laudo Técnico das Condições Ambientais do Trabalho (LTCAT) foi elaborado em atendimento à Lei nº 9.732/1998, que fixou o LTCAT como prova das condições especiais de trabalho perante a Previdência Social, e às Normas Regulamentadoras nº 15 e nº 16 do Ministério do Trabalho e Emprego, que definem os critérios de insalubridade e de periculosidade. Seu objetivo é emitir parecer técnico sobre o direito dos trabalhadores aos adicionais de insalubridade e de periculosidade e à aposentadoria especial.',
  intro: [
    'Com a Lei nº 9.732/1998, a comprovação da exposição a agentes nocivos para fins de aposentadoria especial passou a depender de laudo técnico das condições ambientais do trabalho, expedido por médico do trabalho ou engenheiro de segurança do trabalho. Cabe ao empregador demonstrar as condições insalubres ou perigosas existentes e as medidas de proteção adotadas.',
    'O LTCAT integra o processo contínuo de reconhecimento, avaliação e controle dos riscos ambientais do estabelecimento. Suas conclusões fundamentam o Perfil Profissiográfico Previdenciário (PPP), hoje informado ao INSS por meio do evento S-2240 do eSocial.',
    'Nos termos do art. 68 do Decreto nº 3.048/1999, a empresa que deixar de manter o laudo atualizado, ou que emitir documento de comprovação em desacordo com ele, fica sujeita às penalidades previstas na legislação.',
  ],
  objetivos: [
    'Preservar a saúde e a integridade física dos trabalhadores;',
    'Avaliar as atividades e os locais de trabalho à luz das Normas Regulamentadoras nº 15 e nº 16 e de seus anexos;',
    'Identificar as funções que fazem jus aos adicionais de insalubridade ou de periculosidade e à aposentadoria especial.',
  ],
  ambientais: [
    'Riscos ambientais são os agentes físicos, químicos e biológicos presentes no local de trabalho que, por sua natureza, concentração ou intensidade e pelo tempo de exposição, podem causar danos à saúde do trabalhador (NR-09 e Portaria nº 3.214/1978).',
    'A identificação desses agentes segue a metodologia de reconhecimento, avaliação e controle. Para este laudo, consideram-se:',
  ],
  ambientaisBullets: [
    ['Agentes Físicos:', 'formas de energia a que o trabalhador pode estar exposto, como ruído, vibrações, pressões anormais, temperaturas extremas, radiações ionizantes e não ionizantes, infrassom, ultrassom e umidade.'],
    ['Agentes Químicos:', 'substâncias, compostos ou produtos que podem penetrar no organismo pelas vias respiratória, cutânea ou digestiva, na forma de poeiras, fumos, névoas, neblinas, gases ou vapores.'],
    ['Agentes Biológicos:', 'microrganismos como bactérias, fungos, bacilos, parasitas, protozoários e vírus.'],
  ] as [string, string][],
  tecnica: [
    'A avaliação seguiu os critérios das Normas Regulamentadoras nº 15 e nº 16 (Portaria nº 3.214/1978), da Instrução Normativa PRES/INSS nº 128/2022 e da Portaria DIRBEN/INSS nº 991/2022, e as Normas de Higiene Ocupacional (NHO) da FUNDACENTRO.',
    'Os resultados foram obtidos por análise qualitativa e, quando disponível, quantitativa, conforme descrito a seguir:',
  ],
  qualitativaHtml: [
    'A análise qualitativa reconhece e antecipa os riscos ocupacionais pela percepção do avaliador, sem instrumentos de medição, considerando a <b>SEVERIDADE</b> do dano possível e a <b>FREQUÊNCIA</b> da exposição. Os agentes descritos no item 6 deste laudo foram avaliados por essa matriz.',
    'A graduação do risco, apresentada na coluna <b>TIPO DE EXPOSIÇÃO</b> das tabelas de análise, resulta da relação:',
  ],
  formula: ['GR – Graduação do Risco', 'S – Severidade (Potencial de Dano)', 'F – Frequência (Tempo de Exposição)'],
  pdIntroHtml: 'O <b>Potencial de Dano – PD</b> é classificado conforme a tabela abaixo.',
  teIntroHtml: 'O <b>Tempo de Exposição – TE</b> é classificado conforme a tabela abaixo.',
  grIntroHtml: 'A <b>Graduação de Risco – GR</b> resulta da combinação dos dois critérios, conforme o Quadro 1.',
  acoesIntro: 'As ações corretivas e preventivas são definidas pela graduação de risco obtida, conforme a tabela abaixo.',
  quantitativa:
    'Os agentes com avaliação quantitativa foram medidos com instrumentos e metodologias reconhecidas (NHO da FUNDACENTRO e anexos da NR-15). Os resultados são comparados aos limites de tolerância da NR-15 e, para fins previdenciários, aos critérios do Anexo IV do Decreto nº 3.048/1999.',
  insalubridade1: 'O trabalho em condições insalubres assegura ao empregado um adicional calculado sobre o salário mínimo da região, de:',
  insalubridadeBullets: ['40% (quarenta por cento), no grau máximo;', '20% (vinte por cento), no grau médio;', '10% (dez por cento), no grau mínimo.'],
  insalubridade2: 'Se houver mais de um fator insalubre, considera-se apenas o de grau mais elevado para fins de adicional, vedada a acumulação.',
  insalubridade3: 'O pagamento do adicional cessa com a eliminação ou a neutralização da insalubridade, que pode ocorrer:',
  insalubridadeBullets2: ['pela adoção de medidas de ordem geral que mantenham o ambiente de trabalho dentro dos limites de tolerância;', 'pelo uso de equipamento de proteção individual adequado ao risco e à exposição.'],
  insalubridade4: 'Os adicionais de insalubridade e de periculosidade não se acumulam; o empregado recebe aquele que lhe for mais favorável.',
  periculosidade1: 'São consideradas atividades ou operações perigosas as relacionadas nos anexos da Norma Regulamentadora nº 16:',
  periculosidadeBullets: [
    ['Anexo 1', 'Atividades e operações perigosas com explosivos;'],
    ['Anexo 2', 'Atividades e operações perigosas com inflamáveis;'],
    ['Anexo 3', 'Atividades e operações perigosas com exposição a roubos ou outras espécies de violência física nas atividades profissionais de segurança pessoal ou patrimonial;'],
    ['Anexo 4', 'Atividades e operações perigosas com energia elétrica;'],
    ['Anexo 5', 'Atividades perigosas em motocicleta;'],
    ['Anexo (*)', 'Atividades e operações perigosas com radiações ionizantes ou substâncias radioativas.'],
  ] as [string, string][],
  periculosidade2: 'O trabalho em condições de periculosidade assegura ao empregado um adicional de:',
  periculosidadeBullets2: ['30% (trinta por cento) sobre o salário, sem os acréscimos resultantes de gratificações, prêmios ou participações nos lucros da empresa.'],
  periculosidade3: 'O empregado pode optar pelo adicional de insalubridade que porventura lhe seja devido, sendo vedada a percepção cumulativa dos dois adicionais.',
  aposentadoria1:
    'O INSS exige a avaliação das condições ambientais de todo estabelecimento com empregados expostos a agentes físicos, químicos ou biológicos, ou à associação desses agentes, prejudiciais à saúde ou à integridade física. A constatação registrada neste item destina-se exclusivamente a definir o direito, ou não, à aposentadoria especial.',
  aposentadoria2:
    'Segundo o art. 58 da Lei nº 8.213/1991, a relação dos agentes nocivos considerados para a aposentadoria especial é definida pelo Poder Executivo, hoje no Anexo IV do Decreto nº 3.048/1999. A comprovação da exposição é feita pela empresa com base neste laudo, expedido por médico do trabalho ou engenheiro de segurança do trabalho, que deve informar a existência de tecnologia de proteção coletiva ou individual capaz de diminuir a intensidade do agente a limites de tolerância.',
  aposentadoria3:
    'O PPP, elaborado a partir deste laudo, é transmitido ao INSS pelo evento S-2240 (Condições Ambientais do Trabalho – Agentes Nocivos) do eSocial. A análise do direito observa a Lei nº 8.213/1991 (arts. 57 e 58), o Decreto nº 3.048/1999, a Instrução Normativa PRES/INSS nº 128/2022 e a Portaria DIRBEN/INSS nº 991/2022.',
  constatacoes1: 'Esta etapa apresenta as constatações da visita técnica realizada no estabelecimento.',
  constatacoes2Html:
    'A abordagem dos riscos é feita por <b>GRUPO HOMOGÊNEO DE EXPOSIÇÃO – GHE</b>: conjunto de trabalhadores com exposições semelhantes, de modo que a avaliação de parte do grupo represente as condições de todos os seus integrantes.',
  constatacoes3: 'Após a visita técnica, foram definidos os seguintes Grupos Homogêneos de Exposição:',
  resp1:
    'O conteúdo técnico deste Laudo Técnico das Condições Ambientais do Trabalho (LTCAT), elaborado a partir dos dados levantados na(s) visita(s) técnica(s), é de responsabilidade do profissional legalmente habilitado abaixo identificado, sob supervisão da Futuro Facilite Treinamentos.',
  resp2Pre: 'A implementação e o acompanhamento deste LTCAT são de responsabilidade de ',
  resp2Pos: ', estabelecimento objeto deste laudo, que deve prover os recursos necessários e atender às solicitações das autoridades competentes quanto ao seu cumprimento.',
  anexo1:
    'O Sistema de Escrituração Digital das Obrigações Fiscais, Previdenciárias e Trabalhistas (eSocial), instituído pelo Decreto nº 8.373/2014, exige que as informações de segurança e saúde no trabalho sigam a nomenclatura, a codificação e as classificações do Manual de Orientação do eSocial e de seus leiautes, nas versões vigentes.',
  anexo11:
    'Os agentes nocivos e as atividades que podem ensejar aposentadoria especial constam da Tabela 24 do Anexo I dos leiautes do eSocial (Agentes Nocivos e Atividades – Aposentadoria Especial), disponível em https://portal.esocial.gov.br. Os códigos utilizados neste laudo são:',
  anexo12:
    'O financiamento da aposentadoria especial e a redução do tempo de contribuição constam da Tabela 02 do Anexo I dos leiautes do eSocial (Financiamento da Aposentadoria Especial e Redução do Tempo de Contribuição), disponível em https://portal.esocial.gov.br:',
  fotos: 'Registro fotográfico das condições observadas na visita técnica que fundamenta este laudo.',
};

/** Potencial de dano (severidade) criteria. */
export const PD_CRITERIOS: [string, string[]][] = [
  ['Baixo', ['O agente ou as condições de trabalho não representam risco potencial de dano à saúde nas condições usuais, ou podem causar apenas desconforto, sem caracterizar risco.']],
  [
    'Médio',
    [
      'O agente representa risco moderado à saúde nas condições usuais, sem efeitos agudos, mas não há controle técnico da exposição;',
      'O agente pode causar efeitos agudos, mas as práticas operacionais ou as condições ambientais indicam controle técnico da exposição;',
      'O agente é irritante, cáustico ou corrosivo para olhos, mucosas e pele, mas a exposição está tecnicamente controlada;',
      'O agente pode ser absorvido pela pele, mas a exposição está tecnicamente controlada.',
    ],
  ],
  [
    'Alto',
    [
      'O agente pode causar efeitos agudos e as práticas operacionais ou as condições ambientais sugerem falta de controle;',
      'O agente é irritante, cáustico, corrosivo ou carcinogênico e o controle técnico da exposição é insuficiente;',
      'O agente tem notação "pele" e não há controle técnico da exposição cutânea;',
      'Há possibilidade de deficiência de oxigênio no ambiente;',
      'Há queixas específicas dos trabalhadores ou indicadores biológicos acima dos limites.',
    ],
  ],
  [
    'Crítico',
    [
      'Há exposição a agente carcinogênico sem controle técnico;',
      'Há situação de risco grave e iminente;',
      'Há queixas frequentes associadas a indicadores biológicos acima dos limites;',
      'Há exposição cutânea intensa a substâncias com notação "pele";',
      'Há deficiência aparente de oxigênio no ambiente.',
    ],
  ],
];

export const TE_CRITERIOS: [string, string][] = [
  ['Eventual', 'Exposição inferior a 30 minutos por jornada de trabalho.'],
  ['Intermitente', 'Exposição diária, entre 30 minutos e 6 horas por jornada.'],
  ['Permanente', 'Exposição diária, superior a 6 horas por jornada.'],
];

export const GR_ACOES: [string, string, string][] = [
  ['T', 'Tolerável', 'Não é necessária a adoção de novas medidas.'],
  ['M', 'Moderado', 'Reavaliar os meios de controle e, quando necessário, adotar medidas complementares.'],
  ['S', 'Substancial', 'Implantar novas medidas de controle ou corrigir as falhas das medidas existentes.'],
  ['IT', 'Intolerável', 'Implantar novas medidas de controle, com ação de caráter imediato.'],
];

/** NR-15 annexes: [nº, description, percentual] ('' = revoked). */
export const NR15_ANEXOS: [string, string, string][] = [
  ['1', 'Ruído contínuo ou intermitente acima dos limites de tolerância do Quadro do Anexo 1.', '20%'],
  ['2', 'Ruído de impacto acima dos limites de tolerância do Anexo 2.', '20%'],
  ['3', 'Exposição ao calor acima dos limites de tolerância (IBUTG) do Anexo 3.', '20%'],
  ['4', '(Revogado pela Portaria MTPS nº 3.751, de 23 de novembro de 1990.)', ''],
  ['5', 'Radiações ionizantes acima dos limites de tolerância.', '40%'],
  ['6', 'Trabalho sob condições hiperbáricas (ar comprimido e submerso).', '40%'],
  ['7', 'Radiações não ionizantes consideradas insalubres em inspeção no local de trabalho.', '20%'],
  ['8', 'Vibrações acima dos limites de tolerância do Anexo 8.', '20%'],
  ['9', 'Frio considerado insalubre em inspeção no local de trabalho.', '20%'],
  ['10', 'Umidade considerada insalubre em inspeção no local de trabalho.', '20%'],
  ['11', 'Agentes químicos acima dos limites de tolerância do Quadro 1 do Anexo 11.', '10%, 20% e 40%'],
  ['12', 'Poeiras minerais acima dos limites de tolerância do Anexo 12.', '40%'],
  ['13', 'Agentes químicos caracterizados por inspeção no local de trabalho (avaliação qualitativa).', '10%, 20% e 40%'],
  ['14', 'Agentes biológicos, por avaliação qualitativa.', '20% e 40%'],
];

/** eSocial Tabela 02 — Financiamento da Aposentadoria Especial e Redução do Tempo de Contribuição. */
export const ESOCIAL_T02: [string, string][] = [
  ['1', 'Não ensejador de aposentadoria especial'],
  ['2', 'FAE15_12% – aposentadoria especial aos 15 anos de contribuição (alíquota adicional de 12%)'],
  ['3', 'FAE20_09% – aposentadoria especial aos 20 anos de contribuição (alíquota adicional de 9%)'],
  ['4', 'FAE25_06% – aposentadoria especial aos 25 anos de contribuição (alíquota adicional de 6%)'],
];

export const ESOCIAL_AUSENCIA_DESC = 'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto nº 3.048/1999';
