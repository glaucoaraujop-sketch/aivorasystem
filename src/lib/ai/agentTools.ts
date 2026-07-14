// Ferramentas da AIVA (tool use) + o loop do agente — extraídos de /api/ai/chat
// para reuso por outras lentes da AIVA (ex.: /api/ai/consultor no WhatsApp).
// Fonte ÚNICA das tools: qualquer endpoint que use a AIVA importa daqui.
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { timed } from '@/lib/observability/api'
import { montarAgendaSemana } from '@/lib/planner/agendaServer'
import { soDig, fmtCnpj, semAcento, aliasTermos } from '@/lib/pedidos/matching'
import { priorizarRadar, rotuloSegmento, type CadenceRow } from '@/lib/ai/radar'
import { carregarLinhasRadar } from '@/lib/ai/radarServer'
import { nomeEmpresaCliente } from '@/lib/nomeCliente'

const STATUS_PEDIDO = ['processado', 'em_carga', 'em_producao', 'faturado', 'cancelado']
const STATUS_COMISSAO = ['prevista', 'aprovada', 'paga', 'cancelada']
const STATUS_VISITA = ['agendada', 'realizada', 'cancelada', 'reagendada']
const STATUS_ORCAMENTO = ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado']

export const tools: Anthropic.Tool[] = [
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
  {
    name: 'criar_pedido',
    description: 'AÇÃO DE ESCRITA: cria um pedido no formato "Pedido de Venda" das fábricas a partir dos dados que você extraiu de um documento (imagem/PDF/texto). Casa o cliente por CNPJ → código → nome (e cria se não existir e permitido); casa o fornecedor; casa cada item por código de produto (e cria o produto no catálogo se não existir e permitido). Preenche os campos do padrão fábrica (emissão, ordem de compra, ped. consultor, situação, tabela, prazos, frete, família por item). SÓ chame APÓS o usuário confirmar explicitamente ("pode inserir", "confirma", "cria o pedido"). Antes, mostre o resumo do pedido interpretado (cliente, fornecedor, itens, total) e peça confirmação. Retorna o id do pedido criado e o que foi casado/criado.',
    input_schema: {
      type: 'object',
      properties: {
        fornecedor: { type: 'string', description: 'Nome da fábrica (ex.: Fine Decor)' },
        numero: { type: 'string', description: 'Nº do Pedido de Venda (ex.: 8237)' },
        cliente: {
          type: 'object',
          description: 'Dados do cliente do documento (para casar ou criar)',
          properties: {
            nome: { type: 'string' },
            cpf_cnpj: { type: 'string' },
            codigo: { type: 'string', description: 'Código do cliente na fábrica (ex.: 543)' },
            inscricao_estadual: { type: 'string' },
            endereco: { type: 'string' },
            bairro: { type: 'string' },
            cidade: { type: 'string' },
            estado: { type: 'string' },
            cep: { type: 'string' },
            telefone: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['nome'],
        },
        data_emissao: { type: 'string', description: 'Data de emissão em YYYY-MM-DD' },
        ordem_compra: { type: 'string' },
        ped_consultor: { type: 'string' },
        situacao_financeira: { type: 'string', description: 'Ex.: BOLETO GERADO' },
        tabela: { type: 'string' },
        cond_pagamento: { type: 'string', description: 'Condição de pagamento (ex.: A VISTA)' },
        prazo_dias: { type: 'number' },
        classificacao: { type: 'string', enum: ['venda', 'mostruario'] },
        frete_tipo: { type: 'string' },
        frete_valor: { type: 'number' },
        frete_pct: { type: 'number' },
        frete_embutido: { type: 'boolean' },
        itens: {
          type: 'array',
          description: 'Itens do pedido (uma entrada por linha do documento)',
          items: {
            type: 'object',
            properties: {
              codigo: { type: 'string', description: 'Código do produto (ex.: 248.116.0)' },
              descricao: { type: 'string' },
              unidade: { type: 'string', description: 'Ex.: UN' },
              familia: { type: 'string', description: 'Ex.: FAMILIA A' },
              quantidade: { type: 'number' },
              valor_unitario: { type: 'number' },
              desconto_pct: { type: 'number' },
            },
            required: ['descricao', 'quantidade', 'valor_unitario'],
          },
        },
        criar_cliente_se_novo: { type: 'boolean', description: 'Padrão true: cria o cliente se não achar.' },
        criar_produto_se_novo: { type: 'boolean', description: 'Padrão true: cria o produto no catálogo se não achar pelo código.' },
      },
      required: ['itens'],
    },
  },
  {
    name: 'clientes_em_risco',
    description: 'Radar de Carteira: lista os clientes que estão SAINDO DO PRÓPRIO RITMO de compra (atraso_relativo ≥ 1,3), ordenados por faturamento × atraso (maior valor em risco primeiro). Cada cliente traz fábrica(s), cadência média, dias desde o último pedido, atraso relativo, previsão da próxima compra e segmento (Esfriando/Em risco/Hibernando). Use para "quais clientes estão atrasados pra comprar?", "quem preciso ligar essa semana?". Filtro opcional por fábrica.',
    input_schema: {
      type: 'object',
      properties: {
        fabrica: { type: 'string', description: 'Filtrar só clientes que compram desta fábrica (nome ou parte).' },
        limite: { type: 'number', description: 'Máximo de clientes (padrão 20).' },
      },
    },
  },
  {
    name: 'clientes_quentes',
    description: 'Radar (lente ofensiva): clientes que MAIS compraram nas últimas 4 semanas, ordenados por valor, com sinal de MOMENTO (crescendo = faturou mais que nas 4 semanas anteriores). Use para "quem está comprando forte agora?", "clientes mais quentes das últimas semanas?", oportunidades de aproveitar o momento.',
    input_schema: {
      type: 'object',
      properties: { limite: { type: 'number', description: 'Máximo de clientes (padrão 10).' } },
    },
  },
  {
    name: 'cadencia_compra',
    description: 'Radar de Carteira: cadência de compra de UM cliente — intervalo médio entre pedidos, previsão da próxima compra, dias desde o último pedido, segmento e o histórico de intervalos. Use para "de quanto em quanto tempo o cliente X compra?", "quando o cliente X deve comprar de novo?".',
    input_schema: {
      type: 'object',
      properties: {
        cliente: { type: 'string', description: 'Nome (ou parte) do cliente.' },
      },
      required: ['cliente'],
    },
  },
  {
    name: 'vendas_periodo',
    description: 'Faturamento e volume em um período pela DATA REAL da compra (data_emissao, com fallback para a data de lançamento). Retorna total faturado, nº de pedidos, clientes distintos, ticket médio e a quebra por fábrica. Use para "quanto vendemos essa semana/mês", ranking por fábrica no período e COMPARATIVO ANO-A-ANO (chame duas vezes: período atual e o mesmo período do ano anterior, e compare).',
    input_schema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Data inicial YYYY-MM-DD (inclusive), pela data real da compra.' },
        ate: { type: 'string', description: 'Data final YYYY-MM-DD (inclusive), pela data real da compra.' },
        fabrica: { type: 'string', description: 'Filtrar por fábrica (nome ou parte). Opcional.' },
      },
      required: ['desde', 'ate'],
    },
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

// Converte texto/numero (aceita vírgula decimal) em número, ou null.
function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
// Versão que preserva pontos como separador decimal (para valores já com ponto).
function toNumDot(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// AÇÃO DE ESCRITA: cria um pedido no formato "Pedido de Venda" das fábricas.
async function criarPedidoFabrica(sb: SB, input: Input): Promise<string> {
  const { data: userData } = await sb.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return 'Erro: não foi possível identificar o usuário para criar o pedido.'

  // ── Cliente: casa por CNPJ → código → nome; cria se permitido ──
  const cli = (input.cliente ?? {}) as Record<string, string | undefined>
  const cnpjDig = soDig(cli.cpf_cnpj)
  let clienteId: string | null = null
  let clienteNome = ''
  let clienteCriado = false

  if (cnpjDig) {
    const { data } = await sb.from('clients').select('id,name,cpf_cnpj').limit(5000)
    const found = (data ?? []).find((c: { cpf_cnpj: string | null }) => soDig(c.cpf_cnpj) === cnpjDig)
    if (found) { clienteId = found.id; clienteNome = found.name }
  }
  if (!clienteId && cli.codigo) {
    const { data } = await sb.from('clients').select('id,name').eq('codigo', String(cli.codigo)).limit(1)
    if (data && data[0]) { clienteId = data[0].id; clienteNome = data[0].name }
  }
  if (!clienteId && cli.nome) {
    const { data } = await sb.from('clients').select('id,name').ilike('name', `%${cli.nome}%`).limit(1)
    if (data && data[0]) { clienteId = data[0].id; clienteNome = data[0].name }
  }
  if (!clienteId) {
    if (input.criar_cliente_se_novo === false) {
      return `Cliente não encontrado (busquei por CNPJ, código e nome). Cadastre o cliente antes ou permita criá-lo (criar_cliente_se_novo).`
    }
    if (!cli.nome) return 'Erro: para criar o cliente é obrigatório o nome.'
    const ins = await sb.from('clients').insert({
      user_id: userId,
      name: cli.nome,
      cpf_cnpj: cnpjDig ? fmtCnpj(cnpjDig) : (cli.cpf_cnpj || null),
      codigo: cli.codigo || null,
      inscricao_estadual: cli.inscricao_estadual || null,
      address: cli.endereco || null,
      bairro: cli.bairro || null,
      city: cli.cidade || null,
      state: cli.estado || null,
      cep: cli.cep || null,
      phone: cli.telefone || null,
      email: cli.email || null,
    }).select('id,name').single()
    if (ins.error) return `Erro ao criar o cliente: ${ins.error.message}`
    clienteId = ins.data.id; clienteNome = ins.data.name; clienteCriado = true
  }

  // ── Fornecedor: casa por alias/nome (opcional) ──
  let supplierId: string | null = null
  let fornecedorNome = ''
  if (input.fornecedor) {
    const termos = aliasTermos(String(input.fornecedor)) ?? [semAcento(String(input.fornecedor)).toLowerCase()]
    const { data } = await sb.from('suppliers').select('id,name').limit(1000)
    const match = (data ?? []).find((s: { name: string }) => {
      const n = semAcento(s.name).toLowerCase()
      return termos.some(t => n.includes(t) || t.includes(n))
    })
    if (match) { supplierId = match.id; fornecedorNome = match.name }
  }

  // ── Itens: casa produto por código; cria no catálogo se permitido ──
  const itensInput = Array.isArray(input.itens) ? input.itens : []
  if (itensInput.length === 0) return 'Erro: o pedido precisa de ao menos um item.'

  const itemRows: Record<string, unknown>[] = []
  let subtotal = 0, total = 0, produtosCriados = 0
  for (const it of itensInput as Record<string, unknown>[]) {
    const codigo = String(it.codigo ?? '').trim()
    const descricao = String(it.descricao ?? it.nome ?? '').trim()
    const qtd = toNumDot(it.quantidade) ?? 0
    const unit = toNumDot(it.valor_unitario) ?? 0
    const desc = toNumDot(it.desconto_pct) ?? 0
    if (!codigo && !descricao) continue

    let productId: string | null = null
    if (codigo) {
      const { data } = await sb.from('products').select('id').eq('code', codigo).limit(1)
      if (data && data[0]) productId = data[0].id
    }
    if (!productId) {
      if (input.criar_produto_se_novo === false) {
        return `Produto "${codigo || descricao}" não encontrado no catálogo. Cadastre-o antes ou permita criá-lo (criar_produto_se_novo).`
      }
      const insP = await sb.from('products').insert({
        code: codigo || descricao.slice(0, 40),
        name: descricao || codigo,
        unit: (it.unidade as string) || 'UN',
        active: true,
      }).select('id').single()
      if (insP.error) return `Erro ao criar o produto "${codigo}": ${insP.error.message}`
      productId = insP.data.id; produtosCriados++
    }

    const bruto = qtd * unit
    const liquido = bruto * (1 - desc / 100)
    subtotal += bruto; total += liquido
    itemRows.push({
      product_id: productId, quantity: qtd, unit_price: unit,
      discount_pct: desc, total: liquido, familia: (it.familia as string) || null, notes: null,
    })
  }
  if (itemRows.length === 0) return 'Erro: nenhum item válido para inserir.'

  // ── Pedido ──
  const finalidade = input.classificacao === 'mostruario' ? 'mostruario' : 'venda'
  const insO = await sb.from('orders').insert({
    user_id: userId,
    client_id: clienteId,
    supplier_id: supplierId,
    number: input.numero ? String(input.numero) : null,
    status: 'processado',
    finalidade,
    subtotal,
    total,
    discount_pct: 0,
    payment_terms: input.cond_pagamento || null,
    purchase_order: input.ordem_compra || null,
    ped_consultor: input.ped_consultor || null,
    data_emissao: input.data_emissao || null,
    prazo_dias: toNum(input.prazo_dias),
    situacao_financeira: input.situacao_financeira || null,
    tabela: input.tabela || null,
    frete_tipo: input.frete_tipo || null,
    frete_valor: toNumDot(input.frete_valor),
    frete_pct: toNumDot(input.frete_pct),
    frete_embutido: typeof input.frete_embutido === 'boolean' ? input.frete_embutido : null,
  }).select('id,number').single()
  if (insO.error) return `Erro ao criar o pedido: ${insO.error.message}`

  const orderId = insO.data.id
  const insItems = await sb.from('order_items').insert(itemRows.map(r => ({ ...r, order_id: orderId })))
  if (insItems.error) return `Pedido ${orderId} criado, mas falhou ao inserir itens: ${insItems.error.message}. Revise o pedido.`

  return JSON.stringify({
    ok: true,
    order_id: orderId,
    numero: insO.data.number ?? (input.numero ?? null),
    cliente: clienteNome,
    cliente_criado: clienteCriado,
    fornecedor: fornecedorNome || input.fornecedor || null,
    fornecedor_casado: !!supplierId,
    itens: itemRows.length,
    produtos_criados: produtosCriados,
    subtotal,
    total,
  })
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
        // Agregado no banco (vw_ranking_clientes) — não some no navegador nem cai no cap de 1000
        const por = input.por === 'faturamento' ? 'faturamento' : 'pedidos'
        const { data, count, error } = await sb.from('vw_ranking_clientes')
          .select('name,company_name,razao_social,pedidos,faturamento', { count: 'exact' })
          .order(por, { ascending: false })
          .limit(lim(input.limite, 10, 50))
        if (error) return `Erro: ${error.message}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ranking = ((data ?? []) as any[]).map(r => ({
          cliente: nomeEmpresaCliente(r),
          pedidos: Number(r.pedidos) || 0,
          faturamento: Number(r.faturamento) || 0,
        }))
        return JSON.stringify({ criterio: por, total_clientes: count ?? ranking.length, ranking })
      }
      case 'resumo_financeiro': {
        // Totais agregados no banco (não caem no limite de 1000 linhas do PostgREST)
        const [resumo, com] = await Promise.all([
          sb.from('vw_pedidos_resumo').select('*').single(),
          sb.from('vw_comissoes_resumo').select('*').single(),
        ])
        if (resumo.error) return `Erro: ${resumo.error.message}`
        const r = resumo.data ?? {}
        const c = com.data ?? {}
        const previstas = Number(c.previstas || 0)
        const aprovadas = Number(c.aprovadas || 0)
        const pagas = Number(c.pagas || 0)
        return JSON.stringify({
          comissoes_a_receber: previstas + aprovadas,
          comissoes_previstas: previstas,
          comissoes_aprovadas: aprovadas,
          comissoes_pagas: pagas,
          faturamento_total: Number(r.total_vendas || 0),
          pedidos_total: Number(r.total_pedidos || 0),
          pedidos_em_aberto: Number(r.em_aberto || 0),
        })
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
      case 'criar_pedido':
        // Ação de escrita: só chega aqui após o usuário CONFIRMAR (ver system prompt).
        return await criarPedidoFabrica(sb, input)
      case 'clientes_em_risco': {
        let rows: CadenceRow[]
        try { rows = await carregarLinhasRadar(sb) } catch (e) { return `Erro: ${e instanceof Error ? e.message : e}` }
        const itens = priorizarRadar(rows, {
          fabrica: input.fabrica ? String(input.fabrica) : undefined,
          limite: lim(input.limite, 20, 100),
        }).map(it => ({ ...it, segmento_rotulo: rotuloSegmento(it.segmento) }))
        return JSON.stringify({ total: itens.length, clientes: itens })
      }
      case 'cadencia_compra': {
        const nomeCli = String(input.cliente ?? '').trim()
        if (!nomeCli) return 'Informe o nome do cliente.'
        const cli = await sb.from('clients')
          .select('id,name,company_name,razao_social')
          .or(`name.ilike.%${nomeCli}%,company_name.ilike.%${nomeCli}%`)
          .limit(1)
        if (cli.error) return `Erro: ${cli.error.message}`
        if (!cli.data || cli.data.length === 0) return `Cliente "${nomeCli}" não encontrado.`
        const c = cli.data[0]
        const rfm = await sb.from('vw_client_rfm').select('*').eq('client_id', c.id).maybeSingle()
        const ped = await sb.from('orders')
          .select('created_at,data_emissao,total,status').eq('client_id', c.id).neq('status', 'cancelado')
          .limit(500)
        // Histórico de intervalos (dias) entre OCASIÕES DE COMPRA distintas,
        // pela data real (data_emissao; cai para created_at quando ausente).
        const diasCompra = [...new Set((ped.data ?? []).map((o: { created_at: string; data_emissao: string | null }) =>
          (o.data_emissao ?? o.created_at).slice(0, 10)))].sort()
        const intervalos: number[] = []
        for (let i = 1; i < diasCompra.length; i++) {
          intervalos.push(Math.round((new Date(diasCompra[i] as string).getTime() - new Date(diasCompra[i - 1] as string).getTime()) / 86400000))
        }
        const r = rfm.data as CadenceRow | null
        return JSON.stringify({
          cliente: nomeEmpresaCliente(c),
          pedidos_total: r?.pedidos_total ?? (ped.data?.length ?? 0),
          cadencia_media_dias: r?.cadencia_media_dias != null ? Math.round(Number(r.cadencia_media_dias) * 10) / 10 : null,
          dias_desde_ultimo: r?.dias_desde_ultimo != null ? Math.round(Number(r.dias_desde_ultimo)) : null,
          atraso_relativo: r?.atraso_relativo != null ? Math.round(Number(r.atraso_relativo) * 100) / 100 : null,
          previsao_proxima_compra: r?.previsao_proxima_compra ?? null,
          segmento: r ? rotuloSegmento(r.segmento) : 'Novo / sem histórico',
          historico_intervalos_dias: intervalos,
        })
      }
      case 'clientes_quentes': {
        const { data, error } = await sb.from('vw_client_quentes')
          .select('*').order('valor_28d', { ascending: false }).limit(lim(input.limite, 10, 50))
        if (error) return `Erro: ${error.message}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itens = ((data ?? []) as any[]).map(r => ({
          cliente: nomeEmpresaCliente({ name: r.client_name, company_name: r.company_name, razao_social: r.razao_social }),
          pedidos_28d: Number(r.pedidos_28d) || 0,
          valor_28d: Math.round(Number(r.valor_28d) || 0),
          dias_desde_ultimo: r.dias_desde_ultimo != null ? Number(r.dias_desde_ultimo) : null,
          crescendo: !!r.crescendo,
        }))
        return JSON.stringify({ janela_dias: 28, total: itens.length, clientes: itens })
      }
      case 'vendas_periodo': {
        const desde = String(input.desde ?? '').slice(0, 10)
        const ate = String(input.ate ?? '').slice(0, 10)
        if (!desde || !ate) return 'Informe desde e ate (YYYY-MM-DD).'
        // Agregado no banco (fn_vendas_periodo, pela data real) — sem cap de 1000
        const { data, error } = await sb.rpc('fn_vendas_periodo', {
          p_desde: desde, p_ate: ate, p_fabrica: input.fabrica ? String(input.fabrica) : null,
        })
        if (error) return `Erro: ${error.message}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: any = Array.isArray(data) ? data[0] : data
        const fat = Number(row?.faturamento || 0)
        const ped = Number(row?.pedidos || 0)
        return JSON.stringify({
          periodo: { desde, ate }, fabrica: input.fabrica ?? null,
          faturamento_total: Math.round(fat * 100) / 100,
          pedidos: ped,
          clientes_distintos: Number(row?.clientes_distintos || 0),
          ticket_medio: ped ? Math.round((fat / ped) * 100) / 100 : 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          por_fabrica: ((row?.por_fabrica ?? []) as any[]).map(x => ({ fabrica: x.fabrica, faturamento: Number(x.faturamento) })),
        })
      }
      default:
        return `Ferramenta desconhecida: ${nome}`
    }
  } catch (e) {
    return `Erro ao executar ${nome}: ${e instanceof Error ? e.message : 'desconhecido'}`
  }
}

// Ferramentas de ESCRITA (não expostas na lente consultora, que é read-only)
const FERRAMENTAS_ESCRITA = new Set(['agendar_visitas_semana', 'criar_pedido'])
// Subconjunto somente-leitura das ferramentas (para a AIVA Consultor / WhatsApp).
export const toolsLeitura: Anthropic.Tool[] = tools.filter(t => !FERRAMENTAS_ESCRITA.has(t.name))

const MAX_LOOPS = 8

// Loop do agente: chama o modelo, executa as tool_use e devolve o texto final.
export async function runAgente(opts: {
  sb: SB
  system: string
  tools: Anthropic.Tool[]
  messages: Anthropic.MessageParam[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any
  maxTokens?: number
}): Promise<string> {
  const conv = [...opts.messages]
  while (conv.length && conv[0]?.role === 'assistant') conv.shift()

  let finalText = ''
  for (let i = 0; i < MAX_LOOPS; i++) {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 3000,
      system: opts.system,
      tools: opts.tools,
      messages: conv,
    })

    if (resp.stop_reason === 'tool_use') {
      conv.push({ role: 'assistant', content: resp.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of resp.content) {
        if (block.type === 'tool_use') {
          const out = await timed(opts.logger, `tool:${block.name}`,
            () => executarFerramenta(opts.sb, block.name, (block.input ?? {}) as Input),
            { tool: block.name })
          results.push({ type: 'tool_result', tool_use_id: block.id, content: out })
        }
      }
      conv.push({ role: 'user', content: results })
      continue
    }

    finalText = resp.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
    opts.logger?.info?.('ai.agente.respondido', { loops: i + 1, chars: finalText.length })
    break
  }
  return finalText
}
