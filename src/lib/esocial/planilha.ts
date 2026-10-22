// Planilha para a contabilidade: uma linha por agente nocivo (S-2240) e uma por
// exame (S-2220), em CSV (separador ";", UTF-8 com BOM, abre direto no Excel) ou .xlsx.
import { IDE_OC_LABEL, TP_AVAL_LABEL, UTILIZ_LABEL, unMedLabel } from './s2240'
import type { EventoS2240 } from './s2240'
import { IND_RESULT_LABEL } from './s2220'
import type { EventoS2220 } from './s2220'
import { ONDE_LABEL, temErro } from './validacao'
import type { Problema } from './validacao'
import { fmtCpf, fmtData } from './util'
import { esc } from './xml'
import { zip } from './zip'

export type Linha = (string | number)[]
export interface Aba { nome: string; linhas: Linha[] }

const situacao = (p: Problema[]) => (temErro(p) ? 'Com pendências (XML não gerado)' : p.length ? 'OK, com avisos' : 'OK')
const pendencias = (p: Problema[]) => p.map((x) => `${x.nivel === 'erro' ? 'ERRO' : 'Aviso'}: ${x.msg} [corrigir em ${ONDE_LABEL[x.onde]}]`).join(' | ')

export function abaS2240(evs: EventoS2240[]): Aba {
  const linhas: Linha[] = [[
    'Trabalhador', 'CPF', 'Matrícula', 'Categoria', 'Função', 'Setor (dscSetor)', 'GHE', 'Início da condição', 'Atividades (dscAtivDes)',
    'Código agente (Tabela 24)', 'Agente (Tabela 24)', 'Descrição (dscAgNoc)', 'Avaliação', 'Intensidade/concentração', 'Limite de tolerância',
    'Unidade', 'Técnica de medição', 'Utiliza EPC', 'EPC eficaz', 'Utiliza EPI', 'EPI eficaz', 'CA dos EPIs',
    'Responsável registros ambientais', 'CPF responsável', 'Conselho', 'Nº conselho', 'UF conselho', 'Id do evento', 'Arquivo XML',
    'Situação', 'Pendências',
  ]]
  for (const e of evs) {
    const t = e.trabalhador
    for (const a of e.agentes) {
      linhas.push([
        t.nome, fmtCpf(t.cpf), t.matricula, t.categoria, e.funcao?.nome ?? '', e.setor, e.ghes.join(', '), fmtData(e.dtIniCondicao), e.atividades,
        a.codAgNoc, a.descricaoTabela, a.dscAgNoc, TP_AVAL_LABEL[a.tpAval], a.intConc.replace('.', ','), a.limTol.replace('.', ','),
        unMedLabel(a.unMed), a.tecMedicao, UTILIZ_LABEL[a.utilizEPC], a.eficEpc, UTILIZ_LABEL[a.utilizEPI], a.eficEpi, a.cas.join(', '),
        e.resp?.nome ?? '', e.resp ? fmtCpf(e.resp.cpf) : '', IDE_OC_LABEL[e.resp?.ideOC ?? ''] || e.resp?.dscOC || '', e.resp?.nrOC ?? '',
        e.resp?.ufOC ?? '', e.xml ? e.id : '', e.xml ? e.arquivo : '', situacao(e.problemas), pendencias(e.problemas),
      ])
    }
  }
  return { nome: 'S-2240', linhas }
}

export function abaS2220(evs: EventoS2220[]): Aba {
  const linhas: Linha[] = [[
    'Trabalhador', 'CPF', 'Matrícula', 'Função', 'Data do ASO', 'Tipo de exame', 'Código tipo (tpExameOcup)', 'Resultado do ASO',
    'Data do exame', 'Código procedimento (Tabela 27)', 'Exame', 'Ordem', 'Resultado do exame', 'Médico emitente', 'CRM', 'UF CRM',
    'Coordenador PCMSO', 'CRM coordenador', 'UF coordenador', 'Id do evento', 'Arquivo XML', 'Situação', 'Pendências',
  ]]
  for (const e of evs) {
    const t = e.trabalhador
    const exames = e.exames.length ? e.exames : [null]
    for (const x of exames) {
      linhas.push([
        t.nome, fmtCpf(t.cpf), t.matricula, e.funcao?.nome ?? '', fmtData(e.dtAso), e.tipoLabel, e.tpExameOcup, e.resAso === '2' ? 'Inapto' : 'Apto',
        x ? fmtData(x.dtExm) : '', x?.procRealizado ?? '', x?.nome ?? '', x?.ordExame === '1' ? 'Inicial' : x?.ordExame === '2' ? 'Sequencial' : '',
        IND_RESULT_LABEL[x?.indResult ?? ''], e.medico.nome, e.medico.crm, e.medico.uf, e.resp?.nome ?? '', e.resp?.crm ?? '', e.resp?.uf ?? '',
        e.xml ? e.id : '', e.xml ? e.arquivo : '', situacao(e.problemas), pendencias(e.problemas),
      ])
    }
  }
  return { nome: 'S-2220', linhas }
}

export function csv(aba: Aba): string {
  const cel = (v: string | number) => {
    const s = String(v ?? '')
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + aba.linhas.map((l) => l.map(cel).join(';')).join('\r\n') + '\r\n'
}

function coluna(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** .xlsx (Office Open XML) com texto inline, cabeçalho em negrito e congelado. */
export function xlsx(abas: Aba[]): Uint8Array {
  // eslint-disable-next-line no-control-regex -- remove caracteres de controle, proibidos no XML
  const x = (s: string) => esc(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  const sheets = abas.map((aba) => {
    const rows = aba.linhas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => {
      const ref = `${coluna(c)}${r + 1}`
      const st = r === 0 ? ' s="1"' : ''
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(String(v ?? ''))}</t></is></c>`
    }).join('')}</row>`).join('')
    const cols = aba.linhas[0]?.map((_, c) => `<col min="${c + 1}" max="${c + 1}" width="${c === 0 ? 34 : 20}" customWidth="1"/>`).join('') ?? ''
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      (cols ? `<cols>${cols}</cols>` : '') + `<sheetData>${rows}</sheetData></worksheet>`
  })
  const files = [
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        abas.map((a, i) => `<sheet name="${x(a.nome.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '</styleSheet>',
    },
    ...sheets.map((data, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data })),
  ]
  return zip(files)
}
