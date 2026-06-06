import { NextRequest } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import type Anthropic from '@anthropic-ai/sdk'

async function buildContent(body: {
  descricao?: string | null
  notas?: string | null
  imageUrl?: string | null
  produto?: string | null
  fornecedor?: string | null
  cliente?: string | null
}): Promise<Anthropic.MessageParam['content']> {
  const { descricao, notas, imageUrl, produto, fornecedor, cliente } = body

  const textoPart = `Você é AIVA, assistente técnica de um representante comercial de móveis.
Analise esta solicitação de assistência técnica e forneça um diagnóstico estruturado.

SOLICITAÇÃO:
- Cliente: ${cliente ?? 'não informado'}
- Produto: ${produto ?? 'não especificado'}
- Fornecedor/Fábrica: ${fornecedor ?? 'não informado'}
- Descrição do defeito: ${descricao ?? 'não descrito'}
${notas ? `- Observações internas: ${notas}` : ''}
${imageUrl ? '- [Foto do produto danificado anexada acima]' : ''}

Gere uma análise técnica com estas seções:

**Diagnóstico Provável**
[O que provavelmente causou esse defeito — material, transporte, montagem, uso incorreto, etc.]

**Solução Recomendada**
[Como resolver: troca, reparo, crédito, visita técnica — com argumentos para o fornecedor]

**Como Acionar o Fornecedor**
[Qual contato acionar (assistência, supervisor, logística?), o que documentar, prazo típico de resposta]

**Prevenção**
[Como evitar recorrência desse tipo de problema]

Em português brasileiro, direto e técnico. Máximo 350 palavras.`

  if (imageUrl) {
    try {
      const res = await fetch(imageUrl)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        const ct  = res.headers.get('content-type') ?? 'image/jpeg'
        return [
          { type: 'image', source: { type: 'base64', media_type: ct as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: b64 } },
          { type: 'text', text: textoPart },
        ]
      }
    } catch { /* fall through to text-only */ }
  }

  return textoPart
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const content = await buildContent(body)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content }],
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
