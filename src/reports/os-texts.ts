// Textos-padrão da Ordem de Serviço de Segurança e Saúde no Trabalho
// (NR-1, item 1.4.1, alínea c; CLT arts. 157 e 158). Redação própria.

export const OS_TXT = {
  titulo: 'Ordem de Serviço de Segurança e Saúde no Trabalho',
  base: 'NR-1, item 1.4.1, alínea “c” · CLT, art. 157, inciso II',

  objetivo:
    'Esta Ordem de Serviço informa ao trabalhador os riscos ocupacionais a que está exposto no exercício de suas atividades, as medidas de prevenção adotadas pela organização, os equipamentos de proteção individual de uso obrigatório, os procedimentos a seguir em caso de acidente ou emergência e as obrigações e proibições relativas à segurança e saúde no trabalho. As informações foram extraídas do Programa de Gerenciamento de Riscos (PGR) vigente e devem ser cumpridas como determinação do empregador.',

  riscosIntro:
    'Riscos ocupacionais e perigos identificados no inventário do PGR para a função e o Grupo Homogêneo de Exposição (GHE) correspondente:',

  semRiscos:
    'Não há riscos ocupacionais cadastrados no inventário do PGR para esta função. Caso o trabalhador identifique alguma situação de risco não descrita nesta Ordem de Serviço, deve comunicá-la imediatamente ao superior hierárquico ou à administração do condomínio.',

  psicossocial:
    'Os fatores de risco psicossociais relacionados ao trabalho são avaliados de forma coletiva e confidencial por meio do Diagnóstico de Riscos Psicossociais (DRPS), e as medidas correspondentes integram o plano de ação do PGR.',

  prevencaoGeral: [
    'Treinamento e orientação sobre os riscos da função e sobre esta Ordem de Serviço.',
    'Fornecimento gratuito de EPI adequado ao risco, com Certificado de Aprovação (CA) válido, e registro de entrega.',
    'Exames médicos ocupacionais conforme o PCMSO.',
    'Inspeções periódicas dos locais de trabalho e manutenção das instalações e equipamentos.',
  ],

  semAcoes: 'Não há medidas adicionais recomendadas no plano de ação do PGR para os riscos desta função.',

  epiIntro:
    'O uso dos equipamentos abaixo é obrigatório durante a execução das atividades em que houver exposição ao risco correspondente. Os EPIs são fornecidos gratuitamente pela organização, em perfeito estado de conservação e funcionamento.',

  semEpi:
    'Não há EPI de uso obrigatório definido no PGR para esta função. Caso venha a ser fornecido algum equipamento, seu uso passa a ser obrigatório nos termos desta Ordem de Serviço e da NR-6.',

  epiDeveres: [
    'Usar o EPI apenas para a finalidade a que se destina.',
    'Responsabilizar-se pela limpeza, guarda e conservação do equipamento.',
    'Comunicar ao empregador qualquer dano, extravio ou alteração que o torne impróprio para uso, solicitando a substituição.',
    'Cumprir as determinações do empregador sobre o uso adequado e assinar o registro de entrega.',
  ],

  emergencia: [
    'Interromper a atividade e, se possível, eliminar ou isolar a fonte de perigo sem se expor a novos riscos.',
    'Comunicar imediatamente o ocorrido ao superior hierárquico, ao zelador ou à administração do condomínio, mesmo que a lesão pareça leve.',
    'Acionar o socorro especializado quando necessário: SAMU 192, Corpo de Bombeiros 193, Polícia Militar 190.',
    'Prestar os primeiros socorros somente se estiver capacitado; não remover a vítima, salvo em caso de perigo iminente (fogo, desabamento, choque elétrico).',
    'Em caso de incêndio, acionar o alarme, utilizar o extintor adequado apenas se treinado e abandonar o local pelas rotas de fuga, sem utilizar elevadores.',
    'Preservar o local e as condições do acidente para a investigação das causas, salvo para socorrer a vítima.',
    'A organização emitirá a Comunicação de Acidente de Trabalho (CAT) até o primeiro dia útil seguinte ao da ocorrência e, em caso de morte, de imediato (Lei 8.213/1991, art. 22).',
    'Quase-acidentes e incidentes sem lesão também devem ser comunicados, para que as causas sejam analisadas e corrigidas.',
  ],

  obrigacoes: [
    'Cumprir as disposições legais e regulamentares sobre segurança e saúde no trabalho, inclusive esta Ordem de Serviço.',
    'Usar o EPI fornecido pelo empregador e zelar pela sua conservação.',
    'Submeter-se aos exames médicos previstos no PCMSO (admissional, periódico, de retorno ao trabalho, de mudança de risco e demissional).',
    'Participar dos treinamentos e orientações de segurança promovidos pela organização.',
    'Colaborar com a organização na aplicação das Normas Regulamentadoras.',
    'Comunicar ao superior hierárquico qualquer condição insegura, defeito em equipamento, acidente ou incidente.',
    'Manter o local de trabalho limpo e organizado e respeitar a sinalização de segurança.',
  ],

  proibicoes: [
    'Executar atividades para as quais não tenha sido treinado ou autorizado.',
    'Deixar de usar, emprestar, alterar ou danificar o EPI ou os dispositivos de proteção coletiva.',
    'Operar máquinas, equipamentos ou instalações elétricas sem autorização, ou remover suas proteções.',
    'Misturar produtos químicos ou utilizá-los fora das embalagens originais e rotuladas.',
    'Trabalhar sob efeito de bebida alcoólica ou de substâncias que comprometam a atenção.',
    'Improvisar acessos, escadas ou apoios para trabalho em altura.',
  ],

  atoFaltoso:
    'A recusa injustificada do trabalhador em cumprir esta Ordem de Serviço, em usar o EPI fornecido ou em submeter-se aos exames médicos constitui ato faltoso (NR-1, item 1.4.2.1; CLT, art. 158, parágrafo único), sujeito às sanções disciplinares previstas na legislação.',

  recusa:
    'O trabalhador pode interromper suas atividades sempre que constatar situação de trabalho que, a seu ver, envolva risco grave e iminente para a sua vida ou saúde ou de terceiros, informando imediatamente o superior hierárquico (NR-1, item 1.4.3). Comprovada a situação, não será exigido o retorno à atividade enquanto não forem adotadas as medidas corretivas. O exercício desse direito, de boa-fé, não acarreta qualquer punição.',

  ciencia:
    'Declaro que recebi uma via desta Ordem de Serviço, que li e compreendi as informações sobre os riscos da minha função, as medidas de prevenção e as minhas obrigações, e que me comprometo a cumpri-las. Estou ciente de que o descumprimento injustificado constitui ato faltoso.',

  vigencia:
    'Esta Ordem de Serviço vigora a partir da data de ciência e deve ser revisada sempre que houver alteração da função, das atividades, dos riscos ou das medidas de prevenção, ou revisão do PGR.',
};
