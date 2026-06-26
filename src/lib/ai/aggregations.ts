// Agregações puras usadas pelas ferramentas da AIVA. Separadas da rota para
// permitir testes de regressão (Vitest) sem depender do banco.

export interface OrderRow {
  total: number | null
  status: string
  clients?: { name?: string | null; company_name?: string | null } | null
}

export interface CommissionRow {
  value: number | null
  status: string
}

// Ranking de clientes por quantidade de pedidos ou faturamento.
// Ignora pedidos cancelados.
export function rankClientes(rows: OrderRow[], por: 'pedidos' | 'faturamento', limite: number) {
  const map = new Map<string, { cliente: string; pedidos: number; faturamento: number }>()
  for (const o of rows) {
    if (o.status === 'cancelado') continue
    const nome = o.clients?.company_name || o.clients?.name || 'Sem cliente'
    const cur = map.get(nome) ?? { cliente: nome, pedidos: 0, faturamento: 0 }
    cur.pedidos += 1
    cur.faturamento += Number(o.total || 0)
    map.set(nome, cur)
  }
  const criterio: 'pedidos' | 'faturamento' = por === 'faturamento' ? 'faturamento' : 'pedidos'
  const ranking = [...map.values()]
    .sort((a, b) => b[criterio] - a[criterio])
    .slice(0, limite)
  return { criterio, total_clientes: map.size, ranking }
}

// Totais financeiros consolidados (comissões e pedidos).
export function resumoFinanceiro(commissions: CommissionRow[], orders: OrderRow[]) {
  let previstas = 0, aprovadas = 0, pagas = 0
  for (const c of commissions) {
    const v = Number(c.value || 0)
    if (c.status === 'prevista') previstas += v
    else if (c.status === 'aprovada') aprovadas += v
    else if (c.status === 'paga') pagas += v
  }
  let faturamento = 0, pedidosEmAberto = 0, pedidosTotal = 0
  for (const o of orders) {
    if (o.status === 'cancelado') continue
    pedidosTotal += 1
    faturamento += Number(o.total || 0)
    if (!['entregue', 'cancelado'].includes(o.status)) pedidosEmAberto += 1
  }
  return {
    comissoes_a_receber: previstas + aprovadas,
    comissoes_previstas: previstas,
    comissoes_aprovadas: aprovadas,
    comissoes_pagas: pagas,
    faturamento_total: faturamento,
    pedidos_total: pedidosTotal,
    pedidos_em_aberto: pedidosEmAberto,
  }
}
