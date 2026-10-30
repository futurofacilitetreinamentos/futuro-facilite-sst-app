// Dados de entrada dos documentos comerciais (proposta e contrato).
// A tela monta estes objetos a partir do banco; os geradores só formatam.
import type { ClausulaContrato, ConfigEmpresa, ItemProposta } from '../lib/types';

/** Cliente (CONTRATANTE) — vem do cadastro do condomínio. */
export interface ClienteComercial {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  cep: string;
  cidadeUf: string;
  sindicoNome: string;
  sindicoCpf: string;
  email: string;
  telefone: string;
}

export interface PropostaDocData {
  /** URL base dos arquivos estáticos (ex.: import.meta.env.BASE_URL + 'docs-assets/'), terminando em '/'. */
  assetsBase: string;
  empresa: ConfigEmpresa;
  cliente: ClienteComercial;
  numero: string;
  /** ISO yyyy-mm-dd */
  data: string;
  /** ISO yyyy-mm-dd */
  validade: string;
  colaboradores: number;
  itens: ItemProposta[];
  desconto: number;
  valorAvista: number;
  acrescimoPct: number;
  parcelas: number;
  valorPrazo: number;
  /** já resolvidas (configuração ou específicas da proposta) */
  condicoes: string[];
  observacoes: string;
}

export interface ContratoDocData {
  assetsBase: string;
  empresa: ConfigEmpresa;
  cliente: ClienteComercial;
  numero: string;
  /** ISO yyyy-mm-dd; vazio = deixa "____ de ________ de AAAA" para preencher na assinatura */
  dataAssinatura: string;
  vigenciaMeses: number;
  colaboradores: number;
  /** itens do objeto (Cláusula Primeira) */
  servicos: string[];
  valorTotal: number;
  parcelas: number;
  valorParcela: number;
  diaVencimento: number;
  /** cláusulas com marcadores {{...}} (configuração, cópia do contrato ou padrão) */
  clausulas: ClausulaContrato[];
}
