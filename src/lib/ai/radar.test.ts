import { describe, it, expect } from 'vitest'
import { priorizarRadar, formatarMensagemRadar, percentAlemDoRitmo, rotuloSegmento, type CadenceRow } from './radar'

const rows: CadenceRow[] = [
  // Em dia — não entra
  { client_name: 'Loja A', faturamento_total: 5000, cadencia_media_dias: 30, dias_desde_ultimo: 20, atraso_relativo: 0.7, segmento: 'em_dia', fabricas: ['Fine Decor'] },
  // Esfriando, faturamento alto — prioridade máxima
  { client_name: 'Sylvia Design', company_name: 'Sylvia Design', faturamento_total: 20000, cadencia_media_dias: 40, dias_desde_ultimo: 56, atraso_relativo: 1.4, segmento: 'esfriando', fabricas: ['Fine Decor'] },
  // Em risco, faturamento menor
  { client_name: 'Loja C', faturamento_total: 3000, cadencia_media_dias: 30, dias_desde_ultimo: 75, atraso_relativo: 2.5, segmento: 'em_risco', fabricas: ['Rafana'] },
  // Novo — sem cadência, não entra
  { client_name: 'Loja D', faturamento_total: 1000, cadencia_media_dias: null, dias_desde_ultimo: 10, atraso_relativo: null, segmento: 'novo', fabricas: [] },
]

describe('priorizarRadar', () => {
  it('mantém só atraso_relativo >= 1,3 e ordena por faturamento × atraso', () => {
    const r = priorizarRadar(rows)
    expect(r.map(x => x.cliente)).toEqual(['Sylvia Design', 'Loja C'])
    // Sylvia: 20000*1.4=28000 > Loja C: 3000*2.5=7500
    expect(r[0].cliente).toBe('Sylvia Design')
  })

  it('respeita o minAtraso customizado', () => {
    const r = priorizarRadar(rows, { minAtraso: 2.0 })
    expect(r.map(x => x.cliente)).toEqual(['Loja C'])
  })

  it('filtra por fábrica', () => {
    const r = priorizarRadar(rows, { fabrica: 'rafana' })
    expect(r.map(x => x.cliente)).toEqual(['Loja C'])
  })

  it('filtra por segmento', () => {
    const r = priorizarRadar(rows, { segmentos: ['esfriando'] })
    expect(r.map(x => x.cliente)).toEqual(['Sylvia Design'])
  })

  it('ignora clientes novos / sem atraso calculável', () => {
    const r = priorizarRadar(rows)
    expect(r.map(x => x.cliente)).not.toContain('Loja D')
  })
})

describe('percentAlemDoRitmo', () => {
  it('1,4 => 40%', () => expect(percentAlemDoRitmo(1.4)).toBe(40))
  it('null => 0', () => expect(percentAlemDoRitmo(null)).toBe(0))
})

describe('formatarMensagemRadar', () => {
  it('monta a mensagem priorizada com fábrica e %', () => {
    const msg = formatarMensagemRadar(priorizarRadar(rows), { nome: 'Alex' })
    expect(msg).toContain('Bom dia, Alex')
    expect(msg).toContain('Sylvia Design (Fine Decor) — 40% além do ritmo')
  })
  it('carteira em dia quando não há ninguém', () => {
    expect(formatarMensagemRadar([], { nome: 'Alex' })).toContain('Carteira em dia')
  })
  it('limita a quantidade exibida', () => {
    const muitos: CadenceRow[] = Array.from({ length: 8 }, (_, i) => ({
      client_name: `C${i}`, faturamento_total: 1000 * (8 - i), cadencia_media_dias: 30,
      dias_desde_ultimo: 60, atraso_relativo: 2, segmento: 'em_risco', fabricas: [],
    }))
    const msg = formatarMensagemRadar(priorizarRadar(muitos), { max: 5 })
    expect(msg).toContain('e mais 3')
  })
})

describe('rotuloSegmento', () => {
  it('traduz as chaves', () => {
    expect(rotuloSegmento('em_risco')).toBe('Em risco')
    expect(rotuloSegmento('esfriando')).toBe('Esfriando')
  })
})
