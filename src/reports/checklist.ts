// Inspection checklist definition (v8-src/inspecao/js/app.js SECTIONS):
// 7 sections, 39 items, keyed item_0 … item_38 in this order.

export interface ChecklistSection {
  titulo: string;
  itens: readonly string[];
}

export const CHECKLIST: readonly ChecklistSection[] = [
  {
    titulo: "Documentação de SST",
    itens: [
      "PGR disponível e atualizado",
      "PCMSO disponível e atualizado",
      "LTCAT disponível ou tecnicamente avaliado",
      "ASOs admissionais, periódicos e demissionais organizados",
      "Fichas de entrega de EPI assinadas",
      "Treinamentos obrigatórios registrados",
      "Eventos de SST enviados ao eSocial",
    ],
  },
  {
    titulo: "EPIs e uniformes",
    itens: [
      "EPIs adequados às atividades executadas",
      "EPIs possuem CA válido",
      "Empregados receberam orientação de uso e conservação",
      "Há controle de substituição e higienização dos EPIs",
    ],
  },
  {
    titulo: "Instalações e áreas comuns",
    itens: [
      "Portaria possui condições ergonômicas adequadas",
      "Garagem possui iluminação e sinalização adequadas",
      "Escadas e rampas possuem corrimãos e piso seguro",
      "Casa de máquinas possui acesso controlado",
      "Área da piscina está sinalizada e protegida",
      "Depósito está organizado e sem obstruções",
      "Área de resíduos possui condições de higiene e acesso seguro",
    ],
  },
  {
    titulo: "Eletricidade e incêndio",
    itens: [
      "Quadros elétricos estão fechados, identificados e sem partes expostas",
      "Não há fios desencapados ou instalações improvisadas",
      "Extintores estão sinalizados, acessíveis e dentro da validade",
      "Rotas e saídas de emergência estão desobstruídas",
      "Iluminação de emergência está funcionando",
    ],
  },
  {
    titulo: "Produtos químicos e limpeza",
    itens: [
      "Produtos químicos estão identificados",
      "Produtos possuem FISPQ/SDS disponível quando aplicável",
      "Armazenamento de produtos é ventilado e seguro",
      "Não há mistura ou reaproveitamento inadequado de embalagens",
      "Trabalhadores utilizam luvas e proteção adequada",
    ],
  },
  {
    titulo: "Máquinas, ferramentas e trabalho em altura",
    itens: [
      "Escadas portáteis estão íntegras e adequadas",
      "Ferramentas manuais estão conservadas",
      "Atividades em altura são planejadas e executadas por trabalhador capacitado",
      "Máquinas e equipamentos possuem proteção e manutenção",
      "Serviços elétricos são realizados por profissional autorizado",
    ],
  },
  {
    titulo: "Riscos ocupacionais",
    itens: [
      "Riscos físicos foram identificados",
      "Riscos químicos foram identificados",
      "Riscos biológicos foram identificados",
      "Riscos ergonômicos foram identificados",
      "Riscos de acidentes foram identificados",
      "Há medidas de prevenção compatíveis com os riscos encontrados",
    ],
  },
];

export interface ChecklistItemDef {
  /** `item_N` — the key used in LegacyInspection.checklist. */
  key: string;
  index: number;
  titulo: string;
  /** Section title. */
  secao: string;
}

/** Flat ordered list item_0 … item_38 with titles and section. */
export function checklistItems(): ChecklistItemDef[] {
  const out: ChecklistItemDef[] = [];
  CHECKLIST.forEach((s) => s.itens.forEach((titulo) => out.push({ key: 'item_' + out.length, index: out.length, titulo, secao: s.titulo })));
  return out;
}

export const CHECKLIST_SIZE = CHECKLIST.reduce((a, s) => a + s.itens.length, 0);
