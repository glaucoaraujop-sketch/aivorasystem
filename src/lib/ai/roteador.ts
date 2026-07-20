// Roteador de intenção (Fase 3 — orquestração).
//
// Uma chamada CURTA no Haiku classifica a mensagem do usuário em uma intenção,
// e o agente roda no modelo designado para ela (ver MODELO_POR_INTENCAO). As
// ferramentas do agente seguem SEMPRE completas — o roteador troca só o modelo,
// então um erro de classificação nunca deixa o agente sem uma ferramenta: no
// pior caso, uma pergunta roda num modelo levemente diferente, nunca sem dados.
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { MODELOS, MODELO_POR_INTENCAO, type Intencao } from '@/lib/ai/modelos'

const SISTEMA_ROTEADOR = `Você classifica a intenção de UMA mensagem enviada à AIVA, a inteligência de uma representação comercial de móveis. Responda somente pela ferramenta classificar.

Intenções:
- "conversa": saudação, agradecimento, papo, ou perguntas sobre a própria AIVA (o que você faz, quem é você) — NÃO precisa de dado do sistema.
- "consulta": precisa buscar, listar, conferir, CRIAR ou AGENDAR dados do sistema — pedidos, clientes, comissões, visitas, orçamentos, prazos, rankings simples, cadência de um cliente, criar pedido, agendar visitas. É o caso PADRÃO.
- "estrategia": análise pesada de negócio — comparativo ano-a-ano, concentração de carteira/risco, quem reativar, cross-sell, diagnóstico da carteira, "o que eu faço?", recomendações que cruzam vários ângulos.

Na dúvida entre consulta e estrategia, escolha "consulta". Só use "conversa" quando for CLARAMENTE papo sem necessidade de dado.`

const CLASSIFICADOR: Anthropic.Tool = {
  name: 'classificar',
  description: 'Registra a intenção da mensagem do usuário.',
  input_schema: {
    type: 'object',
    properties: {
      intencao: {
        type: 'string',
        enum: ['conversa', 'consulta', 'estrategia'],
        description: 'A intenção da mensagem.',
      },
    },
    required: ['intencao'],
  },
}

const INTENCOES: Intencao[] = ['conversa', 'consulta', 'estrategia']

export interface Rota {
  intencao: Intencao
  modelo: string
}

// Classifica a mensagem e devolve a rota (intenção + modelo). Qualquer falha cai
// no padrão SEGURO: 'consulta' (agente completo em Sonnet 5, todas as ferramentas).
export async function rotearMensagem(
  mensagem: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any,
): Promise<Rota> {
  const padrao: Rota = { intencao: 'consulta', modelo: MODELO_POR_INTENCAO.consulta }
  const texto = (mensagem || '').trim()
  if (!texto) return padrao

  try {
    const resp = await anthropic.messages.create({
      model: MODELOS.roteador,
      max_tokens: 64,
      system: SISTEMA_ROTEADOR,
      tools: [CLASSIFICADOR],
      tool_choice: { type: 'tool', name: 'classificar' },
      messages: [{ role: 'user', content: texto.slice(0, 2000) }],
    })
    const bloco = resp.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
    const intencao = (bloco?.input as { intencao?: string } | undefined)?.intencao
    if (intencao && INTENCOES.includes(intencao as Intencao)) {
      const it = intencao as Intencao
      logger?.info?.('ai.roteador', { intencao: it, modelo: MODELO_POR_INTENCAO[it] })
      return { intencao: it, modelo: MODELO_POR_INTENCAO[it] }
    }
    return padrao
  } catch (e) {
    logger?.warn?.('ai.roteador.erro', { erro: e instanceof Error ? e.message : String(e) })
    return padrao
  }
}
