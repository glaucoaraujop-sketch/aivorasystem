import { withObservability } from '@/lib/observability/api'
import { anthropic } from '@/lib/anthropic'
import { MODELOS } from '@/lib/ai/modelos'

function buildPrompt(body: {
  kpis: {
    faturamentoMes: number
    faturamentoMesAnterior: number
    pedidosAbertos: number
    comissoesAReceber: number
    clientesAtivos: number
    orcamentosEnviados: number
    totalLojas: number
  }
  vendasMes: Array<{ mes: string; faturamento: number; comissao: number }>
  topClientes: Array<{ client_name: string; company_name: string | null; total_orders: number; total_revenue: number }>
  pipeline: Array<{ status: string; count: number; total_value: number }>
  proximasComissoes: Array<{ client_name: string; value: number; due_date: string; status: string }>
}) {
  const { kpis, vendasMes, topClientes, pipeline, proximasComissoes } = body
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const varPct = kpis.faturamentoMesAnterior > 0
    ? ((kpis.faturamentoMes - kpis.faturamentoMesAnterior) / kpis.faturamentoMesAnterior * 100).toFixed(1)
    : null

  const vendasStr = vendasMes.map(v =>
    `${v.mes}: faturamento ${fmt(v.faturamento)}, comissão ${fmt(v.comissao)}`
  ).join('\n')

  const topStr = topClientes.map((c, i) =>
    `${i + 1}. ${c.client_name}${c.company_name ? ` (${c.company_name})` : ''} — ${fmt(c.total_revenue)} em ${c.total_orders} pedido(s)`
  ).join('\n')

  const pipeStr = pipeline.map(p =>
    `${p.status}: ${p.count} orçamento(s), ${fmt(p.total_value)}`
  ).join('\n')

  const hoje = new Date().toISOString().split('T')[0]
  const comStr = proximasComissoes.map(c =>
    `${c.client_name}: ${fmt(c.value)} — vence ${c.due_date}${c.due_date < hoje ? ' ⚠️ VENCIDA' : ''}`
  ).join('\n')

  return `Você é um analista de vendas especializado em representação comercial de móveis.
Analise os dados abaixo e gere insights acionáveis para o representante comercial.

== KPIs DO MÊS ATUAL ==
Faturamento: ${fmt(kpis.faturamentoMes)}${varPct ? ` (${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs mês anterior)` : ''}
Mês anterior: ${fmt(kpis.faturamentoMesAnterior)}
Comissões a receber: ${fmt(kpis.comissoesAReceber)}
Pedidos em aberto: ${kpis.pedidosAbertos}
Clientes ativos: ${kpis.clientesAtivos}
Total de pontos de venda (lojas): ${kpis.totalLojas}
Orçamentos aguardando resposta: ${kpis.orcamentosEnviados}

== FATURAMENTO ÚLTIMOS 6 MESES ==
${vendasStr || 'Sem dados suficientes.'}

== TOP 5 CLIENTES ==
${topStr || 'Sem dados.'}

== PIPELINE DE ORÇAMENTOS ==
${pipeStr || 'Sem orçamentos.'}

== PRÓXIMAS COMISSÕES ==
${comStr || 'Nenhuma comissão próxima.'}

Gere de 5 a 7 insights práticos e acionáveis. Para cada insight use este formato:

[EMOJI] **Título do insight**
Análise: [O que os dados mostram]
Ação: [O que o representante deve fazer agora]

Use estes emojis para classificar:
🟢 = oportunidade de crescimento
🟡 = ponto de atenção
🔴 = alerta urgente
💡 = insight estratégico
💰 = impacto financeiro direto

Priorize os insights mais impactantes. Seja específico com os números. Em português brasileiro.`
}

export const POST = withObservability('ai/insights', async (req) => {
  const body = await req.json()

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: MODELOS.analise,
          max_tokens: 1500,
          messages: [{ role: 'user', content: buildPrompt(body) }],
        })
        for await (const event of aiStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
})
