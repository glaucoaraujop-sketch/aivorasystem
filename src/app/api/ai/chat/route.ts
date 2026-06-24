import { NextRequest } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

// Análises podem encadear várias consultas — dá folga de tempo
export const maxDuration = 120

const SYSTEM = `Você é AIVA (Artificial Intelligence for Representative Agents), a inteligência estratégica da Aivora Tecnologia, assistente interna do sistema Rep-Móveis (gestão comercial de móveis).

Você tem ACESSO COMPLETO aos dados internos do sistema através de ferramentas de consulta. Use-as sempre que a pergunta envolver dados reais — pedidos, clientes, comissões, visitas, orçamentos ou fornecedores.

Ferramentas disponíveis:
- consultar_pedidos, consultar_clientes, consultar_comissoes, consultar_visitas, consultar_orcamentos: listas detalhadas com filtros
- ranking_clientes: ranking dos clientes que mais compram (por quantidade de pedidos ou por faturamento) — já considera TODOS os pedidos
- resumo_financeiro: totais consolidados (comissões a receber, pagas, faturamento, pedidos em aberto) — já considera TODOS os registros

Regras:
- NUNCA invente números. Sempre busque os dados reais com as ferramentas antes de responder.
- Para rankings e totais use ranking_clientes / resumo_financeiro (que agregam tudo). Para detalhes use as ferramentas consultar_*.
- Pode chamar várias ferramentas em sequência para cruzar informações e responder perguntas complexas.
- Quando o usuário pedir uma "programação de visitas", analise os clientes (prioridade, último pedido, cidade) e monte uma proposta de agenda organizada — explique o critério usado.
- Responda em português do Brasil, claro e objetivo, usando listas e tabelas quando ajudar.
- Valores monetários sempre em reais (R$), formatados (ex: R$ 1.486,10).
- Se uma consulta não retornar dados, diga isso com transparência.`

// ─────────────────────────── Ferramentas (somente leitura) ───────────────────────────

const STATUS_PEDIDO = ['pendente', 'confirmado', 'em_producao', 'pronto', 'entregue', 'cancelado']
const STATUS_COMISSAO = ['prevista', 'aprovada', 'paga', 'cancelada']
const STATUS_VISITA = ['agendada', 'realizada', 'cancelada', 'reagendada']
const STATUS_ORCAMENTO = ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado']

const tools: Anthropic.Tool[] = [
  {
    name: 'consultar_pedidos',
    description: 'Lista pedidos com filtros opcionais. Retorna número, status, valores, comissão, datas, cliente e fornecedor.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUS_PEDIDO, description: 'Filtrar por status do pedido' },
        desde: { type: 'string', description: 'Data inicial (YYYY-MM-DD) sobre a criação do pedido' },
        ate: { type: 'string', description: 'Data final (YYYY-MM-DD) sobre a criação do pedido' },
        limite: { type: 'integer', description: 'Máximo de registros (padrão 100, máx 500)' },
      },
    },
  },
  {
    name: 'consultar_clientes',
    description: 'Lista clientes com filtros opcionais (busca por nome/empresa, cidade, estado, ativo).',
    input_schema: {
      type: 'object',
      properties: {
        busca: { type: 'string', description: 'Texto para buscar no nome ou empresa' },
        cidade: { type: 'string' },
        estado: { type: 'string', description: 'UF (ex: SP)' },
        ativo: { type: 'boolean' },
        limite: { type: 'integer', description: 'Máximo de registros (padrão 200, máx 1000)' },
      },
    },
  },
  {
    name: 'consultar_comissoes',
    description: 'Lista comissões com valor, percentual, status, vencimento, pedido e cliente.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUS_COMISSAO, description: 'Filtrar por status da comissão' },
        limite: { type: 'integer', description: 'Máximo de registros (padrão 200, máx 1000)' },
      },
    },
  },
  {
    name: 'consultar_visitas',
    description: 'Lista visitas com data, status, objetivo, resultado e cliente.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUS_VISITA },
        limite: { type: 'integer', description: 'Máximo de registros (padrão 200, máx 1000)' },
      },
    },
  },
  {
    name: 'consultar_orcamentos',
    description: 'Lista orçamentos com número, status, total, validade e cliente.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUS_ORCAMENTO },
        limite: { type: 'integer', description: 'Máximo de registros (padrão 200, máx 1000)' },
      },
    },
  },
  {
    name: 'ranking_clientes',
    description: 'Ranking dos clientes que mais compram, considerando TODOS os pedidos (exceto cancelados). Critério por quantidade de pedidos ou por faturamento.',
    input_schema: {
      type: 'object',
      properties: {
        por: { type: 'string', enum: ['pedidos', 'faturamento'], description: 'Critério do ranking (padrão: pedidos)' },
        limite: { type: 'integer', description: 'Quantos clientes retornar (padrão 10, máx 50)' },
      },
    },
  },
  {
    name: 'resumo_financeiro',
    description: 'Totais consolidados de TODO o sistema: comissões a receber/previstas/aprovadas/pagas, faturamento total e nº de pedidos em aberto.',
    input_schema: { type: 'object', properties: {} },
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Input = Record<string, any>

function lim(v: unknown, def: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

async function executarFerramenta(sb: SB, nome: string, input: Input): Promise<string> {
  try {
    switch (nome) {
      case 'consultar_pedidos': {
        let q = sb.from('orders')
          .select('number,status,total,subtotal,discount_pct,commission_value,commission_pct,delivery_date,created_at,finalidade,clients(name,company_name),suppliers(name)')
          .order('created_at', { ascending: false })
        if (input.status) q = q.eq('status', input.status)
        if (input.desde) q = q.gte('created_at', input.desde)
        if (input.ate) q = q.lte('created_at', input.ate)
        const { data, error } = await q.limit(lim(input.limite, 100, 500))
        if (error) return `Erro: ${error.message}`
        return JSON.stringify({ total_registros: data.length, pedidos: data })
      }
      case 'consultar_clientes': {
        let q = sb.from('clients')
          .select('id,name,company_name,type,city,state,priority,active,last_order_at,whatsapp,phone')
          .order('last_order_at', { ascending: false, nullsFirst: false })
        if (input.busca) q = q.or(`name.ilike.%${input.busca}%,company_name.ilike.%${input.busca}%`)
        if (input.cidade) q = q.ilike('city', `%${input.cidade}%`)
        if (input.estado) q = q.eq('state', input.estado)
        if (typeof input.ativo === 'boolean') q = q.eq('active', input.ativo)
        const { data, error } = await q.limit(lim(input.limite, 200, 1000))
        if (error) return `Erro: ${error.message}`
        return JSON.stringify({ total_registros: data.length, clientes: data })
      }
      case 'consultar_comissoes': {
        let q = sb.from('commissions')
          .select('value,pct,status,due_date,paid_at,orders(number,total,clients(name,company_name))')
          .order('due_date', { ascending: true })
        if (input.status) q = q.eq('status', input.status)
        const { data, error } = await q.limit(lim(input.limite, 200, 1000))
        if (error) return `Erro: ${error.message}`
        return JSON.stringify({ total_registros: data.length, comissoes: data })
      }
      case 'consultar_visitas': {
        let q = sb.from('visits')
          .select('scheduled_at,completed_at,status,objective,result,next_action,clients(name,company_name,city,state)')
          .order('scheduled_at', { ascending: true })
        if (input.status) q = q.eq('status', input.status)
        const { data, error } = await q.limit(lim(input.limite, 200, 1000))
        if (error) return `Erro: ${error.message}`
        return JSON.stringify({ total_registros: data.length, visitas: data })
      }
      case 'consultar_orcamentos': {
        let q = sb.from('quotes')
          .select('number,status,total,valid_until,created_at,clients(name,company_name)')
          .order('created_at', { ascending: false })
        if (input.status) q = q.eq('status', input.status)
        const { data, error } = await q.limit(lim(input.limite, 200, 1000))
        if (error) return `Erro: ${error.message}`
        return JSON.stringify({ total_registros: data.length, orcamentos: data })
      }
      case 'ranking_clientes': {
        const { data, error } = await sb.from('orders')
          .select('total,status,clients(name,company_name)')
          .limit(5000)
        if (error) return `Erro: ${error.message}`
        const map = new Map<string, { cliente: string; pedidos: number; faturamento: number }>()
        for (const o of data ?? []) {
          if (o.status === 'cancelado') continue
          const nome = o.clients?.company_name || o.clients?.name || 'Sem cliente'
          const cur = map.get(nome) ?? { cliente: nome, pedidos: 0, faturamento: 0 }
          cur.pedidos += 1
          cur.faturamento += Number(o.total || 0)
          map.set(nome, cur)
        }
        const por = input.por === 'faturamento' ? 'faturamento' : 'pedidos'
        const ranking = [...map.values()]
          .sort((a, b) => (b[por] as number) - (a[por] as number))
          .slice(0, lim(input.limite, 10, 50))
        return JSON.stringify({ criterio: por, total_clientes: map.size, ranking })
      }
      case 'resumo_financeiro': {
        const [com, ord] = await Promise.all([
          sb.from('commissions').select('value,status').limit(10000),
          sb.from('orders').select('total,status').limit(10000),
        ])
        if (com.error) return `Erro: ${com.error.message}`
        if (ord.error) return `Erro: ${ord.error.message}`
        let previstas = 0, aprovadas = 0, pagas = 0
        for (const c of com.data ?? []) {
          const v = Number(c.value || 0)
          if (c.status === 'prevista') previstas += v
          else if (c.status === 'aprovada') aprovadas += v
          else if (c.status === 'paga') pagas += v
        }
        let faturamento = 0, pedidosEmAberto = 0, pedidosTotal = 0
        for (const o of ord.data ?? []) {
          if (o.status === 'cancelado') continue
          pedidosTotal += 1
          faturamento += Number(o.total || 0)
          if (!['entregue', 'cancelado'].includes(o.status)) pedidosEmAberto += 1
        }
        return JSON.stringify({
          comissoes_a_receber: previstas + aprovadas,
          comissoes_previstas: previstas,
          comissoes_aprovadas: aprovadas,
          comissoes_pagas: pagas,
          faturamento_total: faturamento,
          pedidos_total: pedidosTotal,
          pedidos_em_aberto: pedidosEmAberto,
        })
      }
      default:
        return `Ferramenta desconhecida: ${nome}`
    }
  } catch (e) {
    return `Erro ao executar ${nome}: ${e instanceof Error ? e.message : 'desconhecido'}`
  }
}

// ─────────────────────────── Handler ───────────────────────────

const MAX_LOOPS = 8

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json()
  const sb = await createClient()

  const system = context ? `${SYSTEM}\n\nCONTEXTO ADICIONAL:\n${context}` : SYSTEM

  // Sanitiza: a conversa precisa começar com 'user' (remove saudação inicial da AIVA)
  const conv: Anthropic.MessageParam[] = Array.isArray(messages)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? messages.map((m: any) => ({ role: m.role, content: m.content }))
    : []
  while (conv.length && conv[0].role === 'assistant') conv.shift()

  let finalText = ''
  try {
    for (let i = 0; i < MAX_LOOPS; i++) {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system,
        tools,
        messages: conv,
      })

      if (resp.stop_reason === 'tool_use') {
        conv.push({ role: 'assistant', content: resp.content })
        const results: Anthropic.ToolResultBlockParam[] = []
        for (const block of resp.content) {
          if (block.type === 'tool_use') {
            const out = await executarFerramenta(sb, block.name, (block.input ?? {}) as Input)
            results.push({ type: 'tool_result', tool_use_id: block.id, content: out })
          }
        }
        conv.push({ role: 'user', content: results })
        continue
      }

      finalText = resp.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
      break
    }
  } catch (e) {
    console.error('[ai/chat]', e)
    finalText = 'Tive um problema ao consultar os dados. Tente novamente em instantes.'
  }

  if (!finalText) finalText = 'Não consegui concluir a análise. Tente reformular a pergunta.'

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(finalText))
      controller.close()
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
