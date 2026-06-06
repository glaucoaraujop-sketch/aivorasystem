import { NextRequest } from 'next/server'
import { anthropic } from '@/lib/anthropic'

function buildPrompt(body: {
  cliente: { name: string; company_name?: string | null; type: string; city?: string | null; state?: string | null; last_order_at?: string | null }
  ultimosPedidos: Array<{ produtos: string[]; total: number; data: string }>
  contexto?: string
}) {
  const { cliente, ultimosPedidos, contexto } = body

  const semPedidos = ultimosPedidos.length === 0
  const pedidosStr = semPedidos
    ? 'Nenhum pedido registrado ainda.'
    : ultimosPedidos.map((p, i) =>
        `Pedido ${i + 1} (${p.data}): ${p.produtos.join(', ')} — R$ ${p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join('\n')

  const ultimaCompra = cliente.last_order_at
    ? `${Math.floor((Date.now() - new Date(cliente.last_order_at).getTime()) / 86400000)} dias atrás`
    : 'nunca comprou'

  return `Você é AIVA, assistente estratégica de um representante comercial de móveis.
Analise o histórico do cliente abaixo e gere sugestões de produtos/abordagens para a próxima visita ou orçamento.

CLIENTE:
- Nome: ${cliente.name}${cliente.company_name ? ` (${cliente.company_name})` : ''}
- Tipo: ${cliente.type === 'loja' ? 'Lojista (ponto de venda)' : 'Outros'}
- Localização: ${[cliente.city, cliente.state].filter(Boolean).join('/') || 'não informada'}
- Última compra: ${ultimaCompra}

HISTÓRICO DE COMPRAS:
${pedidosStr}

${contexto ? `CONTEXTO ADICIONAL: ${contexto}` : ''}

Com base nesse perfil, gere uma análise com 3 seções:

**O que esse cliente compra**
[Padrão de compra identificado — frequência, tipos de produto, volume]

**Oportunidades para a próxima visita**
[3-5 sugestões concretas de produtos, linhas ou abordagens — seja específico sobre segmento de móveis]

**Abordagem recomendada**
[Tom, argumentos de venda e o que NÃO fazer com esse perfil]

Em português brasileiro. Máximo 300 palavras.`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: buildPrompt(body) }],
        })
        for await (const event of aiStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta')
            controller.enqueue(encoder.encode(event.delta.text))
        }
      } finally { controller.close() }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
