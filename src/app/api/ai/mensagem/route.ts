import { withObservability } from '@/lib/observability/api'
import { anthropic } from '@/lib/anthropic'
import { MODELOS } from '@/lib/ai/modelos'
import { guardaIA } from '@/lib/security/guardaIA'

type TipoMensagem =
  | 'follow_up_visita'
  | 'follow_up_orcamento'
  | 'atualizacao_pedido'
  | 'reengajamento'
  | 'pos_visita'

const TIPO_INSTRUCAO: Record<TipoMensagem, string> = {
  follow_up_visita:   'Follow-up pós-visita: agradeça a visita, reforce os próximos passos combinados e mantenha o relacionamento aquecido.',
  follow_up_orcamento:'Follow-up de orçamento enviado sem resposta: lembre o orçamento de forma natural, desperte interesse e faça uma pergunta aberta para iniciar conversa.',
  atualizacao_pedido: 'Atualização de pedido: informe o status atual do pedido de forma clara e profissional, tranquilizando o cliente.',
  reengajamento:      'Reengajamento de cliente inativo: retome o contato de forma natural após período sem compras, sem parecer forçado ou vendedor demais.',
  pos_visita:         'Mensagem pós-visita com proposta de próximos passos: sintetize o que foi conversado e indique a ação seguinte.',
}

function buildPrompt(body: {
  tipo: TipoMensagem
  clienteName: string
  contexto: string
  nomeRepresentante?: string
}) {
  const { tipo, clienteName, contexto, nomeRepresentante } = body
  const instrucao = TIPO_INSTRUCAO[tipo] ?? 'Gere uma mensagem profissional e cordial.'

  return `Gere uma mensagem de WhatsApp profissional e natural em português brasileiro.

TIPO DE MENSAGEM: ${instrucao}

CLIENTE: ${clienteName}
REPRESENTANTE: ${nomeRepresentante ?? 'o representante'}
CONTEXTO ADICIONAL: ${contexto}

Regras:
- Tom: profissional mas descontraído, como uma conversa real entre parceiros comerciais
- Tamanho: curto (máximo 4 parágrafos pequenos)
- NÃO use "prezado", "venho por meio desta" ou linguagem formal demais
- NÃO use mais de 2 emojis no total
- Termine sempre com uma pergunta ou chamada para ação clara
- NÃO inclua saudações de e-mail (sem "Att,", sem "Cordialmente")
- Escreva de forma direta, como se estivesse digitando no celular

Retorne APENAS o texto da mensagem, pronto para copiar e colar no WhatsApp.`
}

export const POST = withObservability('ai/mensagem', async (req) => {
  const g = await guardaIA(req, 'ai/mensagem')
  if (!g.ok) return g.resposta
  const body = await req.json()

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: MODELOS.redacao,
          max_tokens: 512,
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
