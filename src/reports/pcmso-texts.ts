// PCMSO boilerplate (phase C). Own wording, same purpose and normative basis as the
// reference: NR-7 (texto dado pela Portaria SEPRT n.º 6.734/2020), NR-1 and the
// eSocial S-2220 event. Arrays = one paragraph / bullet per item.

export const PCMSO_T = {
  revisoes:
    'Este quadro registra cada revisão do PCMSO e os itens alterados. Ele mantém o histórico do programa organizado para a gestão integrada de saúde e segurança e ajuda a acompanhar quais informações enviadas ao eSocial (evento S-2220) precisam ser atualizadas durante a vigência do documento.',
  apresentacao:
    'Este documento foi elaborado para atender à Norma Regulamentadora n.º 07 (NR-7), cuja redação vigente foi dada pela Portaria SEPRT n.º 6.734, de 9 de março de 2020. A norma, que integra o conjunto aprovado pela Portaria n.º 3.214, de 8 de junho de 1978, define as diretrizes e os requisitos do Programa de Controle Médico de Saúde Ocupacional (PCMSO), cujo objetivo é proteger e preservar a saúde dos empregados diante dos riscos ocupacionais identificados pela organização.',
  intro: [
    'O PCMSO tem por finalidade acompanhar a saúde dos empregados em função dos riscos ocupacionais a que estão expostos, tomando como base o inventário de riscos e o plano de ação do Programa de Gerenciamento de Riscos (PGR), conforme a NR-1 e a NR-7.',
    'O programa faz parte das ações da organização voltadas à saúde dos trabalhadores e deve estar articulado com as demais Normas Regulamentadoras, em especial com o PGR. Seu caráter é preventivo: busca rastrear e diagnosticar precocemente os agravos relacionados ao trabalho, inclusive os de natureza subclínica, e constatar a ocorrência de doenças ocupacionais ou de danos irreversíveis à saúde.',
  ],
  medico: (nome: string, crm: string): string[] => [
    `Por meio deste PCMSO, a organização designa ${nome}${crm ? `, ${crm},` : ''} como médico responsável pelo programa.`,
    'Se identificar inconsistências no inventário de riscos, o médico responsável deve reavaliá-las com os responsáveis pelo PGR (NR-7, item 7.5.1).',
    'Dentro de sua competência, o médico responsável pode atribuir a outros profissionais ou entidades capacitados, equipados e qualificados a realização dos exames previstos neste programa. Cabe à organização verificar se esses requisitos são atendidos.',
    'Em caso de substituição do médico responsável, a organização deve assegurar a transferência formal dos prontuários ao sucessor. Quando os exames forem realizados por empresa especializada em medicina do trabalho, os prontuários ficam sob a guarda da empresa contratada.',
  ],
  desenvolvimento: 'O PCMSO compreende obrigatoriamente os seguintes exames médicos:',
  tiposExame: ['Admissional;', 'Periódico;', 'De retorno ao trabalho;', 'De mudança de risco ocupacional;', 'Demissional.'],
  desenvolvimento2: [
    'Esses exames abrangem a avaliação clínica (anamnese ocupacional e exame físico e mental) e os exames complementares definidos nesta norma, nas demais NRs aplicáveis e neste programa.',
    'O exame clínico observa os momentos e as periodicidades descritos a seguir.',
  ],
  admissional: ['Deve ser realizado antes de o empregado assumir suas atividades.'],
  periodico: [
    'Deve ser realizado nos seguintes intervalos (NR-7, item 7.5.8):',
  ],
  periodicoItens: [
    'a) para empregados expostos a riscos ocupacionais identificados e classificados no PGR, e para portadores de doenças crônicas que aumentem a suscetibilidade a esses riscos: a cada ano, ou em intervalo menor a critério do médico responsável, ou conforme o Anexo IV da NR-7 no caso de condições hiperbáricas;',
    'b) para os demais empregados: a cada dois anos.',
  ],
  retorno: [
    'Deve ser realizado antes de o empregado reassumir suas funções após afastamento igual ou superior a 30 dias, motivado por doença ou acidente, de natureza ocupacional ou não. Nesse exame, o médico avalia também a necessidade de retorno gradual ao trabalho (NR-7, itens 7.5.9 e 7.5.10).',
  ],
  mudanca: [
    'Deve ser realizado obrigatoriamente antes da data da mudança, sempre que houver alteração do risco a que o empregado ficará exposto, para adequar o controle médico aos novos riscos (NR-7, item 7.5.12).',
  ],
  demissional: [
    'Deve ser realizado em até 10 dias contados do término do contrato. Pode ser dispensado quando o exame clínico ocupacional mais recente tiver sido realizado há menos de 135 dias, nas organizações de grau de risco 1 e 2, ou há menos de 90 dias, nas de grau de risco 3 e 4 (NR-7, item 7.5.11).',
  ],
  complementares: [
    'Os exames dos Quadros 1 e 2 do Anexo I da NR-7 são realizados a cada seis meses, podendo esse prazo ser antecipado ou postergado em até 45 dias, mediante justificativa técnica, a fim de coincidir com o exame periódico. Em atividades sazonais, a periodicidade pode ser anual, com realização durante o período da atividade (NR-7, itens 7.5.13 e 7.5.14).',
    'Os exames do Quadro 1 do Anexo I não são obrigatórios nos exames admissional, de retorno ao trabalho, de mudança de risco ocupacional e demissional.',
    'Durante o exame clínico, o empregado deve ser informado do motivo dos exames complementares solicitados e do significado de seus resultados.',
    'No exame admissional, a critério do médico responsável, podem ser aceitos exames complementares realizados nos 90 dias anteriores, salvo quando os Anexos da NR-7 estabelecerem outro prazo.',
    'Outros exames complementares podem ser solicitados pelo médico responsável, desde que relacionados aos riscos ocupacionais classificados no PGR e tecnicamente justificados neste PCMSO (NR-7, itens 7.5.15 a 7.5.18).',
  ],
  aso: [
    'Para cada exame clínico ocupacional, o médico emite o Atestado de Saúde Ocupacional (ASO), que deve ser comprovadamente disponibilizado ao empregado e entregue em meio físico quando ele o solicitar.',
  ],
  asoLead: 'O ASO contém, no mínimo:',
  asoItens: [
    'Razão social e CNPJ ou CAEPF da organização;',
    'Nome completo do empregado, número do CPF e função;',
    'Perigos ou fatores de risco identificados e classificados no PGR que exijam controle médico previsto no PCMSO, ou a indicação de sua inexistência;',
    'Exames ocupacionais clínicos e complementares realizados, com as respectivas datas;',
    'Conclusão de apto ou inapto para a função;',
    'Nome e número de registro profissional do médico responsável pelo PCMSO, se houver;',
    'Data, número de registro profissional e assinatura do médico que realizou o exame clínico.',
  ],
  aso2: [
    'Quando forem realizados exames complementares sem que tenha ocorrido exame clínico, a organização emite recibo de entrega do resultado ao empregado (NR-7, item 7.5.19).',
  ],
  registro: [
    'Os dados dos exames clínicos e complementares, as conclusões e as medidas aplicadas são registrados em prontuário médico individual, sob a responsabilidade do médico responsável pelo PCMSO.',
    'O prontuário é mantido por, no mínimo, 20 anos após o desligamento do empregado e, em caso de substituição do médico responsável, transferido ao seu sucessor. Admite-se o prontuário eletrônico, observadas as normas do Conselho Federal de Medicina.',
    'O médico responsável elabora anualmente o relatório analítico do programa, que contém, no mínimo (NR-7, item 7.6):',
  ],
  relatorioItens: [
    'a) o número de exames clínicos realizados;',
    'b) o número e o tipo de exames complementares realizados;',
    'c) a estatística de resultados anormais dos exames complementares, por tipo de exame e por unidade operacional, setor ou função;',
    'd) a incidência e a prevalência de doenças relacionadas ao trabalho, por unidade operacional, setor ou função;',
    'e) as informações sobre o número, o tipo de eventos e as doenças informadas nas CAT emitidas pela organização;',
    'f) a análise comparativa em relação ao relatório anterior e a discussão das variações nos resultados.',
  ],
  registro2: [
    'Na elaboração do relatório, o médico considera os dados dos prontuários recebidos de seu antecessor ou registra a ausência ou insuficiência desses registros.',
    'O relatório é apresentado e discutido com os responsáveis pela segurança e saúde no trabalho da organização, incluindo a CIPA, quando houver, para que as medidas de prevenção sejam incorporadas ao PGR.',
    'As organizações de grau de risco 1 e 2 com até 25 empregados, e as de grau de risco 3 e 4 com até 10 empregados, podem elaborar o relatório contendo apenas as informações das alíneas "a" e "b".',
  ],
  planejamento: 'O planejamento a seguir considera os riscos ocupacionais identificados e classificados no PGR do estabelecimento.',
  planejamentoSemGhe:
    'Como não há Grupos Homogêneos de Exposição (GHE) cadastrados, o planejamento é apresentado por função.',
  psicoNota:
    'Os fatores de risco psicossociais relacionados ao trabalho identificados no PGR constam da linha Ergonômico (NR-17, organização do trabalho).',
  final: [
    'O PCMSO é um programa dinâmico e deve ser reavaliado sempre que houver mudanças nos ambientes, processos ou na organização do trabalho, pois essas mudanças podem criar ou eliminar riscos e alterar os exames complementares necessários.',
    'O programa deve ser revisto periodicamente, em especial sempre que o PGR for revisado ou quando houver recomendação de autoridade competente.',
  ],
  respTecnica:
    'A produção técnica deste Programa de Controle Médico de Saúde Ocupacional (PCMSO), elaborado com base no PGR, é de responsabilidade do profissional competente indicado abaixo, sob supervisão da Futuro Facilite Treinamentos.',
  respImpl: (razao: string): [string, string, string] => [
    'A implementação e o desenvolvimento deste PCMSO cabem a ',
    razao,
    ', que deve disponibilizar os recursos necessários e atender às solicitações das autoridades competentes relativas ao cumprimento do programa.',
  ],
  esocial:
    'O Sistema de Escrituração Digital das Obrigações Fiscais, Previdenciárias e Trabalhistas (eSocial), instituído pelo Decreto n.º 8.373, de 11 de dezembro de 2014, exige que as informações de SST sigam a nomenclatura, a codificação e as classificações do Manual de Orientação do eSocial e dos leiautes vigentes. Os exames deste PCMSO são informados no evento S-2220 (Monitoramento da Saúde do Trabalhador).',
  procedimentos:
    'Os códigos dos exames médicos indicados neste programa constam da tabela n.º 27 do Anexo I dos leiautes do eSocial (Procedimentos Diagnósticos), disponível no portal do eSocial: ',
  esocialUrl: 'https://portal.esocial.gov.br',
};
