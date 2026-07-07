import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { withObservability, timed } from '@/lib/observability/api'
import { serializeError } from '@/lib/observability/logger'
import { cached } from '@/lib/observability/cache'
import { rankClientes, resumoFinanceiro } from '@/lib/ai/aggregations'
import { montarAgendaSemana } from '@/lib/planner/agendaServer'

// Análises podem encadear várias consultas — dá folga de tempo
export const maxDuration = 120

const SYSTEM = `Você é AIVA (Artificial Intelligence for Representative Agents), a inteligência estratégica da Aivora Tecnologia, assistente interna do sistema Rep-Móveis (gestão comercial de móveis).

Você tem ACESSO COMPLETO aos dados internos do sistema através de ferramentas de consulta. Use-as sempre que a pergunta envolver dados reais — pedidos, clientes, comissões, visitas, orçamentos ou fornecedores.

Ferramentas disponíveis:
- consultar_pedidos: lista pedidos COM os itens (order_items) e as observações (notes) COMPLETAS. Aceita filtro por cliente (nome). Use para ver tudo o que um cliente comprou.
- detalhe_pedido: detalhe integral de um pedido pelo número (itens + observações completas).
- buscar_pedido: localiza pedido por QUALQUER identificador (número, ordem de compra, nº da fábrica), inclusive quando está dentro das observações.
- prazo_entrega_fornecedor: prazo de entrega (dias) de uma fábrica e cálculo da previsão de entrega (data do pedido + prazo).
- consultar_clientes, consultar_comissoes, consultar_visitas, consultar_orcamentos: listas com filtros
- ranking_clientes: ranking dos clientes que mais compram (por quantidade de pedidos ou por faturamento) — já considera TODOS os pedidos
- resumo_financeiro: totais consolidados (comissões a receber, pagas, faturamento, pedidos em aberto) — já considera TODOS os registros
- resumo_clientes: total de clientes (lojas) e total de PDVs JÁ SOMADOS pelo sistema, com a lista de clientes que têm mais de 1 PDV. Use para "quantos PDVs/lojas temos".
- planejar_agenda_semanal: AIVA Planner — monta (SIMULA) a agenda/cronograma de visitas da semana aplicando as Business Rules (capacidade em PDVs, níveis de prioridade, janelas e score), com justificativa de cada escolha e as datas reais da próxima semana. Não grava nada.
- agendar_visitas_semana: AÇÃO DE ESCRITA — registra de fato as visitas da próxima semana na aba Visitas. Só use após confirmação explícita do usuário.

Regras:
- NUNCA invente números. Sempre busque os dados reais com as ferramentas antes de responder.
- Para TOTAIS e somatórios (quantos PDVs, quantas lojas, total de comissões, faturamento), use SEMPRE o número já calculado pela ferramenta de resumo correspondente (resumo_clientes, resumo_financeiro, ranking_clientes). NUNCA some item por item de cabeça — isso causa erros de conta. Se mostrar o detalhamento, o total exibido deve ser exatamente o que a ferramenta retornou.
- Para rankings e totais use ranking_clientes / resumo_financeiro (que agregam tudo). Para detalhes use as ferramentas consultar_*.
- Pode chamar várias ferramentas em sequência para cruzar informações e responder perguntas complexas.
- LEIA TUDO: os itens de um pedido podem estar em DOIS lugares — no campo "order_items" (estruturado) E/OU dentro do texto de "notes" (pedidos importados listam os itens no bloco "--- Itens importados ---", uma linha por item com código, descrição, quantidade e valor). Ao contar ou listar itens (ex: "os 3 itens mais comprados pelo cliente X"), leia AMBOS, linha por linha, normalize o nome do produto e some as quantidades por produto entre todos os pedidos do cliente.
- Para perguntas sobre um cliente específico, chame consultar_pedidos com o filtro "cliente" (o nome dito pelo representante). Se precisar do nome exato, use consultar_clientes antes.
- As observações (notes) podem conter dados úteis além dos itens (nº da fábrica, ordem de compra, showroom, condições). Considere-as ao responder.
- FORMATO "PEDIDO DE VENDA" (padrão das fábricas): o pedido carrega campos próprios além do básico — number (nº do Pedido de Venda), purchase_order (Ordem de Compra), ped_consultor (Pedido do Consultor), data_emissao (Emissão), prazo_dias (Prazos), situacao_financeira (ex.: BOLETO GERADO), tabela, e o bloco de frete (frete_tipo, frete_valor, frete_pct, frete_embutido). Cada item tem familia (ex.: FAMILIA A). O cliente traz codigo, cpf_cnpj, inscricao_estadual, endereço/bairro/cidade/UF/CEP. Use esses campos ao descrever ou conferir um pedido nesse formato.
- Para localizar um pedido por um número que pode estar nas observações (ex: ordem de compra "01047000006/00"), use buscar_pedido — ele procura também dentro do texto das notes.
- PREVISÃO DE ENTREGA: identifique o pedido (buscar_pedido), veja o fornecedor e a data de criação (created_at = quando o pedido foi implementado no sistema), e chame prazo_entrega_fornecedor passando o fornecedor e data_pedido=created_at. A ferramenta devolve a data final calculada. Ex.: Cyrne entrega em 60 dias → previsão = data de implementação + 60 dias. Se o pedido já tiver delivery_date preenchido, cite-o também e explique a diferença. Sempre explique a conta (data de implementação + X dias do fornecedor).
- PLANEJAMENTO DE VISITAS: para planejar/montar a agenda ou cronograma de visitas da semana, use SEMPRE a ferramenta planejar_agenda_semanal — ela já aplica as Business Rules da empresa (capacidade em PDVs, níveis de prioridade, janelas ideais/tolerância e pesos de score). NÃO invente regras, prazos ou critérios: use exatamente o que o motor retornou. Ao apresentar, mostre: a agenda por dia (com as datas reais da próxima semana), a capacidade usada/livre, os clientes em risco, quem ficou de fora por falta de capacidade e a JUSTIFICATIVA de cada cliente escolhido.
- SALVAR/AGENDAR A AGENDA: planejar_agenda_semanal apenas SIMULA — não grava nada. Para efetivar (criar as visitas na aba Visitas), use agendar_visitas_semana, mas SOMENTE depois que o usuário confirmar explicitamente ("pode agendar", "salve", "confirma"). Nunca grave sem essa confirmação. Fluxo correto: 1) mostrar o plano; 2) perguntar se pode agendar; 3) só então chamar agendar_visitas_semana. Depois de agendar, confirme quantas visitas foram criadas e em quais dias.
- PONTOS DE VENDA (PDV): o motor usa o PDV como peso operacional — um cliente com 3 PDVs ocupa 3 da capacidade e o motor distribui os PDVs entre os dias. Ao listar, identifique as lojas/PDVs quando útil (ex.: "Rossuti — 3 PDV").
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
    description: 'Lista pedidos COM os itens (order_items) e as observações (notes) completas. Filtros opcionais por status, cliente (nome) e datas. Use para ver tudo o que um cliente comprou.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUS_PEDIDO, description: 'Filtrar por status do pedido' },
        cliente: { type: 'string', description: 'Nome ou empresa do cliente para filtrar os pedidos' },
        cliente_id: { type: 'string', description: 'ID (UUID) do cliente para filtrar' },
        desde: { type: 'string', description: 'Data inicial (YYYY-MM-DD) sobre a criação do pedido' },
        ate: { type: 'string', description: 'Data final (YYYY-MM-DD) sobre a criação do pedido' },
        limite: { type: 'integer', description: 'Máximo de registros (padrão 50, máx 200)' },
      },
    },
  },
  {
    name: 'detalhe_pedido',
    description: 'Detalhe integral de um pedido pelo número: itens, valores e observações (notes) completas.',
    input_schema: {
      type: 'object',
      properties: {
        numero: { type: 'string', description: 'Número do pedido (ex: 44374)' },
      },
      required: ['numero'],
    },
  },
  {
    name: 'buscar_pedido',
    description: 'Localiza pedido(s) por QUALQUER identificador (número do pedido, ordem de compra, nº da fábrica) — inclusive quando o identificador está dentro das observações (notes). Retorna o detalhe integral.',
    input_schema: {
      type: 'object',
      properties: {
        termo: { type: 'string', description: 'Número/identificador a procurar (ex: 01047000006/00)' },
      },
      required: ['termo'],
    },
  },
  {
    name: 'prazo_entrega_fornecedor',
    description: 'Retorna o prazo de entrega (em dias) de uma fábrica/fornecedor. Se informar a data do pedido, calcula a previsão de entrega (data do pedido + prazo).',
    input_schema: {
      type: 'object',
      properties: {
        fornecedor: { type: 'string', description: 'Nome da fábrica/fornecedor (ex: Cyrne)' },
        data_pedido: { type: 'string', description: 'Data de criação/implementação do pedido (YYYY-MM-DD) para calcular a previsão' },
      },
      required: ['fornecedor'],
    },
  },
  {
    name: 'consultar_clientes',
    description: 'Lista clientes com filtros opcionais (busca por nome/empresa, cidade, estado, ativo). Retorna também total_pdv (quantos pontos de venda/lojas o cliente tem) e o detalhamento por CNPJ.',
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
  {
    name: 'resumo_clientes',
    description: 'Totais JÁ CALCULADOS de clientes/PDVs: nº de clientes (lojas), total de PDVs (soma do PDV de cada cliente) e a lista de clientes com mais de 1 PDV. Use para responder "quantos PDVs/lojas temos" sem somar manualmente.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'planejar_agenda_semanal',
    description: 'AIVA Planner: monta a agenda/cronograma de visitas da próxima semana aplicando as Business Rules (dias úteis, capacidade por dia em PDVs, níveis de prioridade com janelas ideais/tolerância e pesos de score). Retorna a agenda por dia (com as datas reais da próxima semana), capacidade usada/livre, clientes em risco, quem ficou de fora por capacidade e a JUSTIFICATIVA de cada escolha. NÃO grava nada — apenas simula/propõe. Use para "planejar a semana", "montar cronograma/agenda de visitas".',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'agendar_visitas_semana',
    description: 'AÇÃO DE ESCRITA: registra de fato, na aba Visitas, as visitas da próxima semana geradas pelo AIVA Planner (status "agendada", nas datas reais de cada dia). Só chame DEPOIS que o usuário confirmar explicitamente que quer salvar/agendar (ex.: "pode agendar", "salve a agenda", "confirma"). Nunca chame por conta própria — sempre mostre o plano primeiro com planejar_agenda_semanal e peça confirmação. Retorna quantas visitas foram criadas e o resumo por dia.',
    input_schema: { type: 'object', properties: {} },
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Input = Record<string, any>

// Seleção completa de um pedido: cabeçalho + cliente + fornecedor + itens + observações.
// Inclui notes (texto) porque pedidos importados listam os itens dentro das observações.
const PEDIDO_SELECT =
  'number,status,total,subtotal,discount_pct,commission_value,commission_pct,payment_terms,delivery_date,created_at,finalidade,notes,purchase_order,data_emissao,prazo_dias,situacao_financeira,tabela,ped_consultor,frete_tipo,frete_valor,frete_pct,frete_embutido,clients(codigo,name,company_name,razao_social,cpf_cnpj,inscricao_estadual,address,bairro,city,state,cep,phone,whatsapp),suppliers(name,lead_time_days),order_items(quantity,unit_price,discount_pct,total,notes,familia,products(code,name,unit))'

// Prazos de entrega conhecidos por fábrica (fallback quando o cadastro do
// fornecedor não tiver lead_time_days). A fonte primária é o cadastro do
// fornecedor (aba Fornecedores); estes valores são apenas rede de segurança.
const PRAZO_FABRICA_DIAS: { termos: string[]; dias: number }[] = [
  { termos: ['cyrne'], dias: 60 },
  { termos: ['feroni', 'feital', 'gasparoni'], dias: 45 },
  { termos: ['rafana'], dias: 35 },
  { termos: ['fine decor', 'fine'], dias: 45 },
]

function lim(v: unknown, def: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

async function executarFerramenta(sb: SB, nome: string, input: Input): Promise<string> {
  try {
    switch (nome) {
      case 'consultar_pedidos': {
        // Resolve cliente por nome → ids (filtro direto em client_id)
        let clienteIds: string[] = []
        if (input.cliente) {
          const { data: cs } = await sb.from('clients')
            .select('id')
            .or(`name.ilike.%${input.cliente}%,company_name.ilike.%${input.cliente}%`)
            .limit(50)
          clienteIds = (cs ?? []).map((c: { id: string }) => c.id)
          if (clienteIds.length === 0) {
            return JSON.stringify({ total_registros: 0, pedidos: [], aviso: `Nenhum cliente encontrado para "${input.cliente}"` })
          }
        }
        let q = sb.from('orders')
          .select(PEDIDO_SELECT)
          .order('created_at', { ascending: false })
        if (input.status) q = q.eq('status', input.status)
        if (input.cliente_id) q = q.eq('client_id', input.cliente_id)
        if (clienteIds.length > 0) q = q.in('client_id', clienteIds)
        if (input.desde) q = q.gte('created_at', input.desde)
        if (input.ate) q = q.lte('created_at', input.ate)
        const { data, error } = await q.limit(lim(input.limite, 50, 200))
        if (error) return `Erro: ${error.message}`
        return JSON.stringify({ total_registros: data.length, pedidos: data })
      }
      case 'detalhe_pedido': {
        if (!input.numero) return 'Informe o número do pedido.'
        const { data, error } = await sb.from('orders')
          .select(PEDIDO_SELECT)
          .eq('number', String(input.numero))
          .limit(1)
        if (error) return `Erro: ${error.message}`
        if (!data || data.length === 0) {
          return JSON.stringify({ encontrado: false, aviso: `Pedido ${input.numero} não encontrado` })
        }
        return JSON.stringify({ encontrado: true, pedido: data[0] })
      }
      case 'buscar_pedido': {
        const termo = String(input.termo ?? '').trim()
        if (!termo) return 'Informe o número/identificador a buscar.'
        // Procura no número do pedido E no texto das observações
        const { data, error } = await sb.from('orders')
          .select(PEDIDO_SELECT)
          .or(`number.ilike.%${termo}%,notes.ilike.%${termo}%`)
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) return `Erro: ${error.message}`
        if (!data || data.length === 0) {
          return JSON.stringify({ total_registros: 0, pedidos: [], aviso: `Nenhum pedido encontrado contendo "${termo}"` })
        }
        return JSON.stringify({ total_registros: data.length, pedidos: data })
      }
      case 'prazo_entrega_fornecedor': {
        const nome = String(input.fornecedor ?? '').trim()
        if (!nome) return 'Informe o fornecedor.'
        let dias: number | null = null
        let fonte = ''
        // 1) Prazo cadastrado no fornecedor
        const { data: sup } = await sb.from('suppliers')
          .select('name,lead_time_days')
          .ilike('name', `%${nome}%`)
          .limit(1)
        if (sup?.[0]?.lead_time_days) {
          dias = sup[0].lead_time_days
          fonte = 'cadastro do fornecedor'
        } else {
          // 2) Prazo conhecido (fallback)
          const lower = nome.toLowerCase()
          const known = PRAZO_FABRICA_DIAS.find(p => p.termos.some(t => lower.includes(t)))
          if (known) { dias = known.dias; fonte = 'prazo padrão conhecido' }
        }
        if (dias == null) {
          return JSON.stringify({ fornecedor: nome, dias: null, aviso: 'Prazo de entrega não cadastrado para este fornecedor' })
        }
        let previsao_entrega: string | null = null
        if (input.data_pedido) {
          const d = new Date(input.data_pedido)
          if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + dias)
            previsao_entrega = d.toISOString().slice(0, 10)
          }
        }
        return JSON.stringify({ fornecedor: nome, dias, fonte, data_pedido: input.data_pedido ?? null, previsao_entrega })
      }
      case 'consultar_clientes': {
        let q = sb.from('clients')
          .select('id,name,company_name,type,city,state,priority,active,last_order_at,whatsapp,phone,client_cnpjs(razao_social,cnpj,num_lojas)')
          .order('last_order_at', { ascending: false, nullsFirst: false })
        if (input.busca) q = q.or(`name.ilike.%${input.busca}%,company_name.ilike.%${input.busca}%`)
        if (input.cidade) q = q.ilike('city', `%${input.cidade}%`)
        if (input.estado) q = q.eq('state', input.estado)
        if (typeof input.ativo === 'boolean') q = q.eq('active', input.ativo)
        const { data, error } = await q.limit(lim(input.limite, 200, 1000))
        if (error) return `Erro: ${error.message}`
        // total_pdv = nº de PDVs do cliente = maior num_lojas entre seus CNPJs
        // (mín. 1). Vários CNPJs do mesmo cliente são a mesma loja, não somam.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientes = (data ?? []).map((c: any) => {
          const vals = (c.client_cnpjs ?? []).map((x: { num_lojas: number | null }) => x.num_lojas ?? 1)
          return { ...c, total_pdv: vals.length ? Math.max(...vals) : 1 }
        })
        return JSON.stringify({ total_registros: clientes.length, clientes })
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
        // Cache curto: dados agregados pesados, consultados com frequência
        const rows = await cached('orders.ranking', 60_000, async () => {
          const { data, error } = await sb.from('orders')
            .select('total,status,clients(name,company_name)')
            .limit(5000)
          if (error) throw new Error(error.message)
          return data ?? []
        })
        const por = input.por === 'faturamento' ? 'faturamento' : 'pedidos'
        return JSON.stringify(rankClientes(rows, por, lim(input.limite, 10, 50)))
      }
      case 'resumo_financeiro': {
        const [com, ord] = await Promise.all([
          cached('commissions.resumo', 60_000, async () => {
            const { data, error } = await sb.from('commissions').select('value,status').limit(10000)
            if (error) throw new Error(error.message)
            return data ?? []
          }),
          cached('orders.resumo', 60_000, async () => {
            const { data, error } = await sb.from('orders').select('total,status').limit(10000)
            if (error) throw new Error(error.message)
            return data ?? []
          }),
        ])
        return JSON.stringify(resumoFinanceiro(com, ord))
      }
      case 'resumo_clientes': {
        const { data, error } = await sb.from('clients')
          .select('name,client_cnpjs(num_lojas)')
          .limit(5000)
        if (error) return `Erro: ${error.message}`
        let totalPdv = 0
        const multi: { cliente: string; pdv: number }[] = []
        for (const c of data ?? []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vals = (c.client_cnpjs ?? []).map((x: any) => x.num_lojas ?? 1)
          const pdv = vals.length ? Math.max(...vals) : 1
          totalPdv += pdv
          if (pdv > 1) multi.push({ cliente: c.name, pdv })
        }
        multi.sort((a, b) => b.pdv - a.pdv)
        return JSON.stringify({
          total_clientes: (data ?? []).length,
          total_pdv: totalPdv,
          clientes_com_mais_de_1_pdv: multi,
        })
      }
      case 'planejar_agenda_semanal': {
        // Regras + dados vêm da configuração/banco (nunca fixos no código)
        const { regras, plano, datas } = await montarAgendaSemana(sb)
        return JSON.stringify({
          regras: {
            working_days: regras.working_days,
            visits_per_day: regras.visits_per_day,
            capacidade_semanal_pdv: plano.capacidade_total,
            niveis: regras.priority_levels.map(l => ({
              nome: l.name, ideal_days: l.ideal_days, tolerance_days: l.tolerance_days, priority_weight: l.priority_weight,
            })),
          },
          datas_proxima_semana: datas,
          plano,
        })
      }
      case 'agendar_visitas_semana': {
        // Ação de escrita: só chegar aqui após o usuário CONFIRMAR (ver system prompt).
        const { data: userData } = await sb.auth.getUser()
        const userId = userData?.user?.id
        if (!userId) return 'Erro: não foi possível identificar o usuário para registrar as visitas.'

        const { plano, datas } = await montarAgendaSemana(sb)

        // Justificativa por cliente (vem da agenda detalhada do Planner).
        const justificativaPorCliente = new Map(plano.agenda.map(a => [a.cliente_id, a.justificativa]))

        // Uma visita por (cliente, dia) conforme a distribuição do Planner.
        // Deduplica cliente+data para não gerar visitas repetidas no mesmo dia.
        const vistas = new Set<string>()
        const rows: {
          user_id: string; client_id: string; scheduled_at: string; status: string; objective: string
        }[] = []
        for (const dia of plano.dias) {
          const data = datas[dia.dia]
          if (!data) continue
          for (const item of dia.itens) {
            const chave = `${item.cliente_id}|${data}`
            if (vistas.has(chave)) continue
            vistas.add(chave)
            const just = justificativaPorCliente.get(item.cliente_id)
            rows.push({
              user_id: userId,
              client_id: item.cliente_id,
              scheduled_at: `${data}T12:00:00`,
              status: 'agendada',
              objective: `Visita planejada pela AIVA${just ? ` — ${just}` : ''}`,
            })
          }
        }

        if (rows.length === 0) return JSON.stringify({ ok: true, criadas: 0, aviso: 'O Planner não gerou visitas para a próxima semana (sem capacidade ou sem clientes elegíveis).' })

        const ins = await sb.from('visits').insert(rows).select('id')
        if (ins.error) return `Erro ao registrar as visitas: ${ins.error.message}`

        // Resumo por dia para a AIVA confirmar ao usuário.
        const porDia = plano.dias
          .filter(d => datas[d.dia])
          .map(d => ({ dia: d.dia, data: datas[d.dia], clientes: d.itens.map(i => i.nome) }))
        return JSON.stringify({ ok: true, criadas: ins.data?.length ?? rows.length, semana: porDia })
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

export const POST = withObservability('ai/chat', async (req, { logger }) => {
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
            const out = await timed(
              logger,
              `tool:${block.name}`,
              () => executarFerramenta(sb, block.name, (block.input ?? {}) as Input),
              { tool: block.name, input: block.input },
            )
            results.push({ type: 'tool_result', tool_use_id: block.id, content: out })
          }
        }
        conv.push({ role: 'user', content: results })
        continue
      }

      finalText = resp.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
      logger.info('ai.chat.respondido', { loops: i + 1, chars: finalText.length })
      break
    }
  } catch (e) {
    logger.error('ai.chat.error', { error: serializeError(e) })
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
})
