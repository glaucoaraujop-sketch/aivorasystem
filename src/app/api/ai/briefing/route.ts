import { withObservability } from '@/lib/observability/api'
import { anthropic } from '@/lib/anthropic'
import { MODELOS } from '@/lib/ai/modelos'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function buildPrompt(body: {
  visita: {
    scheduled_at: string
    objective?: string | null
    notes?: string | null
    result?: string | null
    next_action?: string | null
  }
  cliente: {
    name: string
    company_name?: string | null
    city?: string | null
    state?: string | null
    whatsapp?: string | null
    last_order_at?: string | null
  }
  pedidosRecentes?: Array<{ number: string | null; total: number; status: string; created_at: string }> | null
  ultimasVisitas?: Array<{ scheduled_at: string; result: string | null; next_action: string | null }> | null
}) {
  const { visita, cliente, pedidosRecentes, ultimasVisitas } = body

  const pedidosStr = pedidosRecentes?.length
    ? pedidosRecentes.map(p =>
        `- Pedido ${p.number ?? 'S/N'} | ${new Date(p.created_at).toLocaleDateString('pt-BR')} | Status: ${p.status} | R$ ${p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join('\n')
    : 'Nenhum pedido recente.'

  const visitasStr = ultimasVisitas?.length
    ? ultimasVisitas.map(v =>
        `- ${new Date(v.scheduled_at).toLocaleDateString('pt-BR')}: ${v.result ?? 'sem resultado registrado'}${v.next_action ? ` → próxima ação: ${v.next_action}` : ''}`
      ).join('\n')
    : 'Nenhuma visita anterior registrada.'

  return `Você é um copiloto de vendas para representantes comerciais de móveis.
Gere um briefing prático e objetivo para a visita abaixo.

== VISITA ==
Data/hora: ${formatDate(visita.scheduled_at)}
Objetivo: ${visita.objective ?? 'Não informado'}
Observações: ${visita.notes ?? 'Nenhuma'}

== CLIENTE ==
Nome: ${cliente.name}${cliente.company_name ? ` (${cliente.company_name})` : ''}
Localização: ${[cliente.city, cliente.state].filter(Boolean).join('/') || 'Não informada'}
WhatsApp: ${cliente.whatsapp ?? 'Não informado'}
Último pedido: ${cliente.last_order_at ? new Date(cliente.last_order_at).toLocaleDateString('pt-BR') : 'Nunca comprou'}

== PEDIDOS RECENTES ==
${pedidosStr}

== HISTÓRICO DE VISITAS ==
${visitasStr}

Gere o briefing em 4 seções, em português brasileiro:

**Perfil do Cliente**
[2-3 frases contextualizando quem é esse cliente e o relacionamento atual]

**Contexto Comercial**
[O que está acontecendo com esse cliente: pedidos, orçamentos, follow-ups pendentes]

**Sugestão de Abordagem**
[O que fazer nesta visita: produtos para apresentar, assuntos a tratar, oportunidades]

**Pontos de Atenção**
[Alertas importantes: cliente sem compra há muito tempo, pendências, etc. Se não houver, omita esta seção]

Seja direto e prático. Máximo 280 palavras. Use bullets quando for listar itens.`
}

export const POST = withObservability('ai/briefing', async (req) => {
  const body = await req.json()

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: MODELOS.analise,
          max_tokens: 1024,
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
