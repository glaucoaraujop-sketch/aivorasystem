import { NextRequest } from 'next/server'
import { anthropic } from '@/lib/anthropic'

const SYSTEM = `Você é AIRA (Artificial Intelligence for Representative Agents), a inteligência artificial estratégica da Aivora Tecnologia.

Você é assistente pessoal de um representante comercial de móveis. Seu papel:
- Ajudar a tomar decisões comerciais mais inteligentes
- Analisar dados do negócio quando fornecidos
- Sugerir abordagens para clientes, orçamentos e visitas
- Redigir mensagens e propostas comerciais
- Responder perguntas sobre estratégia de vendas no setor moveleiro

Tom: direto, prático, profissional mas acessível. Respostas concisas, com listas quando útil.
Idioma: sempre português brasileiro.
NÃO invente dados — se não tiver informação, diga que precisa de mais contexto.`

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json()

  const systemWithContext = context
    ? `${SYSTEM}\n\nCONTEXTO DO NEGÓCIO:\n${context}`
    : SYSTEM

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemWithContext,
          messages,
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
}
