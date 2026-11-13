// Textos padrão dos documentos comerciais (proposta e contrato), a partir dos
// modelos da empresa (Proposta Villa Borghese 2026 e Contrato Acqua 2026).
//
// CONVENÇÃO DO TEXTO DAS CLÁUSULAS (ClausulaContrato.texto) — usada pelo gerador (comercial-doc.ts):
//   • cada linha é um parágrafo (linhas vazias são ignoradas);
//   • linha começando com "- "  → item de lista com marcador (•);
//   • linha começando com "# "  → item de lista numerado em romanos (I –, II –, III – …);
//   • linha começando com "§" ou "Parágrafo único/primeiro/segundo…" → parágrafo do artigo,
//     com o rótulo ("§1º", "Parágrafo Primeiro.") em negrito;
//   • **texto** → negrito;
//   • {{marcador}} → substituído pelos dados (lista em MARCADORES_CONTRATO); marcador
//     desconhecido aparece como [[marcador]] para ser notado; dado vazio sai como "________";
//   • a linha que contém só {{servicos}} vira a lista numerada dos serviços do objeto.
// TÍTULO (ClausulaContrato.titulo):
//   • "DO OBJETO" → numerado automaticamente: "CLÁUSULA PRIMEIRA – DO OBJETO" (sem buracos);
//   • título que já começa com "CLÁUSULA" é usado como está (sem numeração automática);
//   • título vazio → bloco sem título e sem número (ex.: a qualificação das partes, no início).
import type { ClausulaContrato } from '../lib/types';

/** Condições gerais padrão da proposta ({{validade}} = data de validade dd/mm/aaaa). */
export const CONDICOES_PROPOSTA_PADRAO: string[] = [
  'Proposta válida até {{validade}};',
  'Os exames serão realizados conforme os requisitos da NR-7;',
  'O agendamento ocorrerá conforme disponibilidade do contratante e da equipe médica;',
  'Não estão inclusas despesas de deslocamento, quando aplicáveis.',
];

/** Marcadores aceitos nas condições gerais da proposta. */
export const MARCADORES_PROPOSTA: { marcador: string; descricao: string }[] = [
  { marcador: '{{validade}}', descricao: 'Data de validade da proposta (dd/mm/aaaa)' },
];

/** Textos fixos da proposta comercial ({{empresa}} = nome fantasia da contratada). */
export const PROPOSTA_TEXTOS = {
  titulo: 'PROPOSTA COMERCIAL',
  subtitulo: 'SEGURANÇA E SAÚDE NO TRABALHO – SST',
  solucaoTitulo: 'SOLUÇÃO COMPLETA EM SST',
  solucao: [
    'A {{empresa}} oferece assessoria especializada em Segurança e Saúde no Trabalho, auxiliando sua entidade no cumprimento das obrigações legais, previdenciárias e do eSocial.',
    'Todos os serviços serão executados por profissionais habilitados, garantindo conformidade com as Normas Regulamentadoras e maior segurança para a instituição e seus colaboradores.',
  ],
  servicosTitulo: 'SERVIÇOS INCLUSOS',
  resumoTitulo: 'RESUMO DA PROPOSTA',
  /** Nota em itálico abaixo dos valores (**texto** = negrito). */
  notaExames:
    'Caso sejam identificadas **necessidades específicas** durante a **avaliação médica ocupacional** ou em razão dos riscos levantados nos programas de SST, poderão ser solicitados **exames complementares adicionais**, mediante prévia comunicação ao contratante.',
  condicoesTitulo: 'CONDIÇÕES GERAIS',
  observacoesTitulo: 'OBSERVAÇÕES',
};

/** Título do contrato e fecho (o fecho recebe cidade e data no gerador). */
export const CONTRATO_TEXTOS = {
  titulo: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPECIALIZADOS EM SEGURANÇA E SAÚDE NO TRABALHO – SST',
  fecho: 'E, por estarem justas e contratadas, firmam o presente contrato.',
};

/** Qualificação das partes (primeiro bloco do contrato, sem título). */
export const QUALIFICACAO_CONTRATO_PADRAO =
  'Pelo presente instrumento, de um lado, **{{contratada.razao_social}}**, pessoa jurídica de direito privado, inscrita no CNPJ nº {{contratada.cnpj}}, com sede na {{contratada.endereco}}, CEP {{contratada.cep}}, neste ato representada por sua representante legal, {{contratada.representante}}, doravante denominada **CONTRATADA**; e, de outro lado, o **{{contratante.razao_social}}**, inscrito no CNPJ nº {{contratante.cnpj}}, com sede na {{contratante.endereco}}, CEP {{contratante.cep}}, neste ato representado por seu Síndico, {{contratante.sindico}}, doravante denominado **CONTRATANTE**, têm entre si justo e contratado o presente Contrato de Prestação de Serviços especializados em Segurança e Saúde no Trabalho – SST, que será regido pelas cláusulas e condições abaixo.';

/** Cláusulas padrão do contrato (com marcadores {{...}}); a primeira, sem título, é a qualificação das partes. */
export const CLAUSULAS_CONTRATO_PADRAO: ClausulaContrato[] = [
  { titulo: '', texto: QUALIFICACAO_CONTRATO_PADRAO },
  {
    titulo: 'DO OBJETO',
    texto: `Constitui objeto do presente contrato a **prestação continuada de serviços especializados em Segurança e Saúde no Trabalho (SST)**, visando ao atendimento das obrigações legais da CONTRATANTE perante a legislação trabalhista, previdenciária e de segurança do trabalho.
Os serviços compreendem:
{{servicos}}
§1º Este contrato contempla até **{{colaboradores}} colaboradores ativos**. Havendo aumento desse quantitativo, inclusão de novas atividades de risco ou alterações relevantes na estrutura operacional da CONTRATANTE, poderá haver revisão dos valores mediante termo aditivo.
§2º Não estão compreendidos neste contrato, salvo contratação específica:
- exames admissionais;
- exames demissionais;
- exames de retorno ao trabalho;
- exames de mudança de função;
- exames complementares;
- perícias judiciais ou administrativas;
- assistências técnicas em processos judiciais;
- visitas técnicas não previstas.`,
  },
  {
    titulo: 'DA EXECUÇÃO DOS SERVIÇOS',
    texto: `A CONTRATADA executará os serviços observando a legislação vigente, as Normas Regulamentadoras aplicáveis e as boas práticas técnicas.
Os documentos técnicos serão emitidos por profissionais legalmente habilitados, sempre que exigido pela legislação.
O prazo para elaboração dos documentos será de até **30 (trinta) dias úteis**, contados do recebimento de todas as informações e documentos necessários.
Caso haja pendências ou atraso no envio das informações pela CONTRATANTE, os prazos ficarão automaticamente suspensos até sua regularização.`,
  },
  {
    titulo: 'DAS OBRIGAÇÕES DA CONTRATADA',
    texto: `Constituem obrigações da CONTRATADA:
# Executar os serviços contratados com diligência e observância da legislação;
# Elaborar os documentos técnicos previstos neste contrato;
# Realizar os envios obrigatórios ao eSocial, desde que receba tempestivamente as informações necessárias;
# Emitir e encaminhar à CONTRATANTE os comprovantes, recibos ou protocolos relativos aos eventos transmitidos ao eSocial;
# Manter confidencialidade sobre todas as informações recebidas;
# Disponibilizar esclarecimentos técnicos referentes aos documentos emitidos;
# Cumprir os prazos previstos neste contrato e no cronograma de execução dos serviços;
# Apresentar profissionais devidamente habilitados, capacitados e regularmente inscritos nos respectivos conselhos profissionais, quando aplicável;
# Manter atualizados, durante toda a vigência contratual, os documentos e programas sob sua responsabilidade, observadas as alterações legais, operacionais e ambientais previamente comunicadas pela CONTRATANTE;
# Prestar suporte e esclarecimentos técnicos relacionados aos serviços executados e aos documentos emitidos durante toda a vigência do contrato.`,
  },
  {
    titulo: 'DAS OBRIGAÇÕES DA CONTRATANTE',
    texto: `Constituem obrigações da CONTRATANTE:
# Fornecer informações completas, corretas e atualizadas;
# Disponibilizar toda documentação necessária;
# Comunicar imediatamente admissões, demissões, afastamentos, alterações de função, alterações no ambiente de trabalho e quaisquer mudanças que possam impactar os documentos de SST;
# Convocar seus empregados para comparecimento aos exames ocupacionais nas datas previamente agendadas;
# Efetuar os pagamentos na forma contratada;
# Responsabilizar-se pelas consequências decorrentes da omissão, inexatidão ou atraso das informações fornecidas.`,
  },
  {
    titulo: 'DA INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO',
    texto: `O presente contrato não gera vínculo empregatício entre o CONTRATANTE e os empregados, médicos, técnicos, colaboradores, prepostos ou subcontratados da CONTRATADA, cabendo exclusivamente a esta a responsabilidade pelo pagamento de salários, encargos trabalhistas, previdenciários, fiscais, fundiários e demais obrigações decorrentes da execução dos serviços.
Parágrafo único. A CONTRATADA responderá integralmente por eventuais reclamações, condenações, despesas, encargos, honorários ou prejuízos decorrentes de vínculo ou obrigação relacionada à sua equipe, obrigando-se a ressarcir o CONTRATANTE pelos valores que este venha a suportar.`,
  },
  {
    titulo: 'DOS EXAMES COMPLEMENTARES',
    texto:
      'Quando houver indicação médica para realização de exames complementares, estes dependerão de autorização prévia da CONTRATANTE e serão cobrados separadamente.',
  },
  {
    titulo: 'DO VALOR E DA FORMA DE PAGAMENTO',
    texto: `O valor total deste contrato é de **{{valor_total_extenso}}**.
O pagamento será realizado {{forma_pagamento}}.
O atraso no pagamento acarretará:
- multa moratória de 2%;
- juros de mora de 1% ao mês, calculados proporcionalmente;
- atualização monetária pelo IPCA ou índice oficial que venha a substituí-lo.
A inadimplência superior a 30 (trinta) dias autoriza a suspensão da prestação dos serviços.
Persistindo a inadimplência por período superior a 60 (sessenta) dias, poderá a CONTRATADA rescindir o contrato, sem prejuízo da cobrança dos valores devidos.`,
  },
  {
    titulo: 'DA VIGÊNCIA',
    texto: `O presente contrato terá vigência de **{{vigencia_extenso}} meses**, contados da data de sua assinatura.
Parágrafo Primeiro. A prorrogação da vigência dependerá de manifestação expressa das partes e será formalizada mediante termo aditivo, não havendo renovação automática.
Parágrafo Segundo. Eventual reajuste somente poderá ser aplicado após o período mínimo de 12 (doze) meses pelo IPCA, e deverá constar expressamente do respectivo termo aditivo.`,
  },
  {
    titulo: 'DA RESCISÃO',
    texto: `O contrato poderá ser rescindido:
# por acordo entre as partes;
# por descumprimento contratual;
# mediante comunicação escrita com antecedência mínima de 60 (sessenta) dias.
Caso a rescisão seja solicitada pela CONTRATANTE após a elaboração dos documentos técnicos previstos neste contrato, permanecerão devidos os valores correspondentes aos serviços efetivamente executados, observada a proporcionalidade entre as obrigações cumpridas e o valor contratado.
As parcelas vencidas permanecerão integralmente exigíveis.`,
  },
  {
    titulo: 'DAS RESPONSABILIDADES',
    texto: `A CONTRATADA responderá exclusivamente pelos serviços de sua responsabilidade técnica.
Não responderá por multas, autuações ou prejuízos decorrentes de:
# informações incorretas ou omitidas pela CONTRATANTE;
# atraso na entrega de documentos necessários;
# ausência dos empregados aos exames agendados;
# descumprimento das orientações técnicas emitidas;
# alterações promovidas pela CONTRATANTE sem comunicação prévia.`,
  },
  {
    titulo: 'DAS PENALIDADES',
    texto: `O atraso injustificado na entrega de documentos, relatórios, laudos, programas ou protocolos sujeitará a **CONTRATADA** à multa moratória de **0,5% (meio por cento) por dia de atraso**, calculada sobre o valor da parcela mensal correspondente, limitada a **10% (dez por cento)**.
Parágrafo Primeiro. O inadimplemento parcial, a execução defeituosa ou o descumprimento de qualquer obrigação contratual sujeitará a CONTRATADA à multa de **10% (dez por cento)** sobre o valor da obrigação inadimplida.
Parágrafo Segundo. O inadimplemento total, o abandono ou a paralisação injustificada dos serviços sujeitará a CONTRATADA à multa de **15% (quinze por cento)** sobre o valor total do contrato, facultando ao CONTRATANTE a rescisão imediata.`,
  },
  {
    titulo: 'DOS MATERIAIS DE APOIO, PREVENÇÃO E CONFORMIDADE COM A NR-1',
    texto: `Como parte da prestação continuada dos serviços objeto deste contrato, a CONTRATADA disponibilizará à CONTRATANTE, durante toda a vigência contratual, materiais técnicos e informativos destinados ao apoio das ações de Segurança e Saúde no Trabalho, especialmente aquelas relacionadas à promoção da saúde ocupacional e ao atendimento das disposições da Norma Regulamentadora nº 1 (NR-1) e demais normas aplicáveis.
Os materiais poderão compreender, entre outros:
# Cartilhas educativas e materiais orientativos destinados aos colaboradores;
# Artes digitais e campanhas de conscientização relacionadas à saúde, segurança e qualidade de vida no trabalho, incluindo, exemplificativamente, campanhas como Setembro Amarelo, Abril Verde, Janeiro Branco, Outubro Rosa, Novembro Azul e outras iniciativas de prevenção e promoção da saúde;
# Comunicados, informativos e conteúdos educativos voltados à prevenção de acidentes, doenças ocupacionais, riscos psicossociais, assédio moral, assédio sexual, violência no ambiente de trabalho e demais temas correlatos;
# Disponibilização de canal eletrônico para recebimento de denúncias, relatos ou manifestações relacionadas a situações que possam representar riscos psicossociais, assédio, violência, discriminação ou outras ocorrências no ambiente de trabalho, observados os princípios da confidencialidade, da boa-fé e da proteção de dados pessoais.
§1º Os materiais disponibilizados possuem caráter preventivo, educativo e orientativo, não substituindo treinamentos obrigatórios previstos em lei ou avaliação técnica específica quando exigida pela legislação.
§2º O canal de denúncias disponibilizado pela CONTRATADA constitui ferramenta de apoio à gestão da CONTRATANTE, cabendo exclusivamente a esta a apuração dos fatos, a adoção das medidas disciplinares, administrativas ou legais cabíveis e o cumprimento das obrigações decorrentes da legislação trabalhista.
§3º A CONTRATADA compromete-se a preservar a confidencialidade das informações recebidas por meio do canal de denúncias, observadas as disposições da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), ressalvadas as hipóteses de obrigação legal ou determinação de autoridade competente.
§4º A disponibilização dos materiais e do canal de denúncias integra os serviços de gestão continuada de SST prestados pela CONTRATADA, não gerando cobrança adicional durante a vigência deste contrato, salvo se houver solicitação de serviços extraordinários não previstos neste instrumento.`,
  },
  {
    titulo: 'DAS ALTERAÇÕES LEGISLATIVAS',
    texto:
      'Caso ocorram alterações na legislação que impliquem novos programas, documentos, laudos ou obrigações não previstos neste contrato, as partes negociarão eventual adequação técnica e financeira mediante termo aditivo.',
  },
  {
    titulo: 'DA CONFIDENCIALIDADE E DA LGPD',
    texto: `As partes comprometem-se a manter sigilo sobre todas as informações obtidas em razão deste contrato.
Os dados pessoais eventualmente tratados serão utilizados exclusivamente para sua execução, observando a Lei nº 13.709/2018 (LGPD).`,
  },
  {
    titulo: 'DA PROPRIEDADE DOS DOCUMENTOS',
    texto:
      'Os documentos elaborados pela CONTRATADA destinam-se exclusivamente ao cumprimento das obrigações legais da CONTRATANTE, sendo vedada sua utilização por terceiros ou para finalidades diversas sem autorização da CONTRATADA, ressalvadas as hipóteses de exigência legal.',
  },
  {
    titulo: 'DO CASO FORTUITO E FORÇA MAIOR',
    texto:
      'Nenhuma das partes responderá pelo atraso ou impossibilidade de cumprimento das obrigações decorrentes de caso fortuito ou força maior, na forma dos artigos 393 e seguintes do Código Civil.',
  },
  {
    titulo: 'DA TOLERÂNCIA',
    texto:
      'A eventual tolerância de qualquer das partes quanto ao descumprimento de cláusulas deste contrato não importará renúncia de direitos nem alteração das condições pactuadas.',
  },
  {
    titulo: 'DAS COMUNICAÇÕES',
    texto:
      'As comunicações entre as partes poderão ser realizadas por e-mail, aplicativo de mensagens ou outro meio eletrônico habitualmente utilizado, produzindo os mesmos efeitos das comunicações escritas, desde que seja possível comprovar seu envio.',
  },
  {
    titulo: 'DA ASSINATURA ELETRÔNICA',
    texto:
      'As partes reconhecem a validade das assinaturas eletrônicas apostas neste contrato, produzindo todos os efeitos legais, nos termos da legislação vigente.',
  },
  {
    titulo: 'DO FORO',
    texto:
      'Fica eleito o foro da {{foro}} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.',
  },
];

/** Marcadores aceitos nas cláusulas, com a descrição para a tela de edição. */
export const MARCADORES_CONTRATO: { marcador: string; descricao: string }[] = [
  { marcador: '{{contratada.razao_social}}', descricao: 'Razão social da contratada (configuração da empresa)' },
  { marcador: '{{contratada.nome_fantasia}}', descricao: 'Nome fantasia da contratada' },
  { marcador: '{{contratada.cnpj}}', descricao: 'CNPJ da contratada' },
  { marcador: '{{contratada.endereco}}', descricao: 'Endereço da contratada (com cidade/UF, se não constar no endereço)' },
  { marcador: '{{contratada.cep}}', descricao: 'CEP da contratada' },
  { marcador: '{{contratada.representante}}', descricao: 'Representante legal da contratada: nome, RG nº e CPF nº' },
  { marcador: '{{contratante.razao_social}}', descricao: 'Razão social do condomínio (contratante)' },
  { marcador: '{{contratante.cnpj}}', descricao: 'CNPJ do condomínio' },
  { marcador: '{{contratante.endereco}}', descricao: 'Endereço do condomínio (com cidade/UF, se não constar no endereço)' },
  { marcador: '{{contratante.cep}}', descricao: 'CEP do condomínio' },
  { marcador: '{{contratante.sindico}}', descricao: 'Síndico: nome e CPF nº' },
  { marcador: '{{servicos}}', descricao: 'Serviços do objeto — sozinho na linha vira lista numerada (I –, II – …); no meio do texto, separados por “;”' },
  { marcador: '{{colaboradores}}', descricao: 'Quantidade de colaboradores (ex.: 16)' },
  { marcador: '{{colaboradores_extenso}}', descricao: 'Colaboradores com extenso (ex.: 16 (dezesseis))' },
  { marcador: '{{valor_total}}', descricao: 'Valor total do contrato (ex.: R$ 2.850,00)' },
  { marcador: '{{valor_total_extenso}}', descricao: 'Valor total com extenso (ex.: R$ 2.850,00 (dois mil oitocentos e cinquenta reais))' },
  { marcador: '{{parcelas}}', descricao: 'Número de parcelas (ex.: 12)' },
  { marcador: '{{parcelas_extenso}}', descricao: 'Parcelas com extenso (ex.: 12 (doze))' },
  { marcador: '{{valor_parcela}}', descricao: 'Valor de cada parcela (ex.: R$ 237,50)' },
  { marcador: '{{parcelas_restantes}}', descricao: 'Parcelas após a primeira, com extenso (ex.: 11 (onze))' },
  { marcador: '{{dia_vencimento}}', descricao: 'Dia do vencimento mensal (ex.: 10)' },
  {
    marcador: '{{forma_pagamento}}',
    descricao:
      'Forma de pagamento completa: “em parcela única de R$ …, na assinatura deste contrato” ou “em 12 (doze) parcelas mensais de R$ 237,50, sendo a primeira na assinatura deste contrato e as demais em 11 (onze) parcelas mensais consecutivas, com vencimento todo dia 10 de cada mês”',
  },
  { marcador: '{{vigencia_meses}}', descricao: 'Vigência em meses (ex.: 12)' },
  { marcador: '{{vigencia_extenso}}', descricao: 'Vigência com extenso (ex.: 12 (doze))' },
  { marcador: '{{foro}}', descricao: 'Foro (ex.: Circunscrição Judiciária de Brasília/DF)' },
  { marcador: '{{cidade}}', descricao: 'Cidade/UF da contratada (linha da data)' },
  { marcador: '{{data_assinatura}}', descricao: 'Data da assinatura por extenso (ex.: 26 de outubro de 2026) ou espaço para preencher' },
  { marcador: '{{numero}}', descricao: 'Número do contrato' },
];
