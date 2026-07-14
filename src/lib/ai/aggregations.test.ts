import { describe, it, expect } from 'vitest'
import { rankClientes, resumoFinanceiro, type OrderRow, type CommissionRow } from './aggregations'

const pedidos: OrderRow[] = [
  { total: 1000, status: 'processado', clients: { company_name: 'Loja A' } },
  { total: 500, status: 'faturado', clients: { company_name: 'Loja A' } },
  { total: 2000, status: 'processado', clients: { company_name: 'Loja B' } },
  { total: 9999, status: 'cancelado', clients: { company_name: 'Loja B' } }, // ignorado
  { total: 300, status: 'em_producao', clients: { name: 'Cliente C' } },
]

describe('rankClientes', () => {
  it('rankeia por quantidade de pedidos (ignora cancelados)', () => {
    const r = rankClientes(pedidos, 'pedidos', 10)
    expect(r.criterio).toBe('pedidos')
    expect(r.total_clientes).toBe(3)
    expect(r.ranking[0]).toMatchObject({ cliente: 'Loja A', pedidos: 2 })
  })
  it('rankeia por faturamento', () => {
    const r = rankClientes(pedidos, 'faturamento', 10)
    expect(r.ranking[0]).toMatchObject({ cliente: 'Loja B', faturamento: 2000 })
  })
  it('respeita o limite', () => {
    expect(rankClientes(pedidos, 'pedidos', 1).ranking).toHaveLength(1)
  })
  it('usa company_name, caindo para name quando ausente', () => {
    const r = rankClientes(pedidos, 'pedidos', 10)
    expect(r.ranking.map(x => x.cliente)).toContain('Cliente C')
  })
})

describe('resumoFinanceiro', () => {
  const comissoes: CommissionRow[] = [
    { value: 100, status: 'prevista' },
    { value: 200, status: 'aprovada' },
    { value: 50, status: 'paga' },
    { value: 999, status: 'cancelada' }, // não entra em a_receber
  ]
  it('soma comissões a receber (prevista + aprovada)', () => {
    const r = resumoFinanceiro(comissoes, pedidos)
    expect(r.comissoes_a_receber).toBe(300)
    expect(r.comissoes_pagas).toBe(50)
  })
  it('faturamento ignora cancelados e conta pedidos em aberto', () => {
    const r = resumoFinanceiro(comissoes, pedidos)
    // 1000 + 500 + 2000 + 300 = 3800 (cancelado de 9999 fora)
    expect(r.faturamento_total).toBe(3800)
    expect(r.pedidos_total).toBe(4)
    // em aberto = não faturado e não cancelado → processado, processado, em_producao = 3
    expect(r.pedidos_em_aberto).toBe(3)
  })
})
