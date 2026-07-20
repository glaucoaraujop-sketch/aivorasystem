import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serializeError, type Logger } from '@/lib/observability/logger'
import { withObservability } from '@/lib/observability/api'
import { toolsLeitura, runAgente } from '@/lib/ai/agentTools'
import { rotearMensagem } from '@/lib/ai/roteador'

// AIVA Consultor — a mesma AIVA, na lente ESTRATÉGICA, pelo WhatsApp do Glauco.
// Chamado server-to-server pelo n8n (webhook da Evolution). Somente leitura.
// Entrada: { mensagem, telefone }. Saída: { resposta } (texto pronto p/ WhatsApp).

export const maxDuration = 60

const SYSTEM_CONSULTOR = `Você é a AIVA, a inteligência do escritório A Vieira Representações — representação comercial de móveis de linha média-alta em São Paulo, representando 4 fábricas: Rafana, Cyrne, Fine (Fine Decor) e Feroni. Neste canal (WhatsApp) você é a CONSULTORA ESTRATÉGICA do Glauco.

Sua missão: enxergar o que o Alex (CEO) não vê na correria e transformar dado em decisão — na velocidade de uma mensagem. Você NÃO é um relatório; é conselheira. Responde direto, com número real + um insight (nunca só o dado cru).

CONTEXTO FIXO:
- Alex = CEO e representante principal. Glauco = consultor (quem você atende aqui). Paola = back-office (pedidos Feroni + Fine). Ana Júlia = (pedidos Rafana + Cyrne).
- Prazos de entrega por fábrica: Cyrne 60 dias, Feroni 45, Rafana 35, Fine 45.
- Contas-chave: Rossuti (maior cliente, muito concentrado), Sylvia Design (premium em crescimento), Elaza, Projeto Móveis. Feroni é o carro-chefe de faturamento. Fine Decor é subaproveitada.
- Todos os dados são AO VIVO do sistema (Supabase), via ferramentas. NUNCA invente número.

COMO VOCÊ PENSA (as regras do Glauco — o que te diferencia de uma calculadora):
1. Comparação certa é ANO CONTRA ANO (mesmo período do ano anterior), não semana a semana — fechamentos de mês e pedidos de estoque distorcem o comparativo curto. Avise quando um pico parecer sazonal.
2. Concentração é RISCO: sempre veja quanto o maior cliente pesa no total; se passar de ~30% da carteira, sinalize, mesmo com faturamento bom.
3. Frequência importa tanto quanto valor: veja a cadência; cliente grande desacelerando é alerta (use clientes_em_risco e cadencia_compra).
4. Cross-sell é a alavanca mais barata: cliente de uma fábrica só e com porte = oportunidade de 2ª linha; cliente multi-fábrica = conta fiel a proteger.
5. Reativação vale mais que prospecção fria: cliente que comprava e sumiu é prioridade de reconquista.
6. Fine Decor é subaproveitada — fique atento a oportunidades de crescê-la.

DATA REAL: para faturamento e comparativos por período, use a ferramenta vendas_periodo (ela agrega pela data real da compra, não pela data de lançamento no sistema). Para ano-a-ano, chame vendas_periodo duas vezes (período atual e o mesmo período do ano anterior) e compare.

RESPOSTA NO WHATSAPP:
- Curta. É celular, não relatório. Vá direto: número + o que ele significa.
- Destaque o número em negrito do WhatsApp (um asterisco: *R$ 122.000*) e use listas curtas com "• " quando houver mais de 2 itens.
- SEMPRE feche com um "então" — o insight/recomendação. Ex.: não diga só "Rossuti = R$ 122 mil"; diga "Rossuti = *R$ 122 mil*, 49% da semana — concentrado demais, vale diversificar."
- Dinheiro em real, padrão brasileiro (R$ 122.000).
- Se a pergunta pedir análise pesada (comparativo completo/relatório), ofereça gerar o painel e mandar o link — não despeje tudo em texto.
- Se a pergunta for ambígua, pergunte de volta em UMA linha ("de qual fábrica?", "esta semana ou no mês?").
- Tom: direto, seguro, de consultor sênior. Português do Brasil, sem jargão técnico.

LIMITES: você é SOMENTE LEITURA (não cria pedido, não altera cadastro). Não decide pelo Alex — informa e recomenda. Sem o dado: "não tenho esse número aqui, posso puxar?". Assuntos muito sensíveis ou decisões grandes: sugira tratar direto com o Glauco.

Use SEMPRE as ferramentas para buscar o dado real antes de responder. Para totais e somatórios, use os números já agregados pelas ferramentas (vendas_periodo, ranking_clientes, resumo_financeiro) — nunca some de cabeça.`

const soDigits = (s: string) => (s || '').replace(/\D/g, '')

// Só o(s) número(s) do Glauco (env CONSULTOR_TELEFONES, separados por vírgula).
// Compara pelos últimos dígitos, tolerando DDI 55 e o 9º dígito.
function telefoneAutorizado(tel: string): boolean {
  const permitidos = (process.env.CONSULTOR_TELEFONES || '').split(',').map(soDigits).filter(Boolean)
  if (permitidos.length === 0) return false // fail-safe: sem allowlist, ninguém entra
  const t = soDigits(tel)
  if (t.length < 10) return false
  return permitidos.some(p => {
    const [maior, menor] = p.length >= t.length ? [p, t] : [t, p]
    return menor.length >= 10 && maior.endsWith(menor)
  })
}

async function handler(req: NextRequest, { logger }: { requestId: string; logger: Logger }) {
  // Segredo de chamada interna (n8n) — mesma proteção dos endpoints de cron.
  const segredo = process.env.CRON_SECRET
  if (!segredo) return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  const enviado = req.headers.get('x-consultor-secret') || req.headers.get('x-cron-secret')
  if (enviado !== segredo) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const mensagem = String(body?.mensagem ?? '').trim()
  const telefone = String(body?.telefone ?? '')

  if (!telefoneAutorizado(telefone)) {
    return NextResponse.json({ resposta: 'Oi! Sou a AIVA, a inteligência da A Vieira. Este canal é exclusivo do Glauco. 🙏' })
  }
  if (!mensagem) {
    return NextResponse.json({ resposta: 'Manda a pergunta que eu puxo o dado. 📊' })
  }

  let sb
  try { sb = createAdminClient() } catch {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 })
  }

  // Roteador (Fase 3): classifica a intenção → modelo do agente. No WhatsApp a
  // resposta segue curta; só a análise estratégica ganha um pouco mais de fôlego.
  const rota = await rotearMensagem(mensagem, logger)
  const maxTokens = rota.intencao === 'estrategia' ? 1800 : 1200

  let resposta = ''
  try {
    resposta = await runAgente({
      sb, system: SYSTEM_CONSULTOR, tools: toolsLeitura,
      messages: [{ role: 'user', content: mensagem }],
      logger, maxTokens, model: rota.modelo,
    })
  } catch (e) {
    logger.error('ai.consultor.error', { error: serializeError(e) })
    resposta = 'Tive um problema pra puxar os dados agora. Tenta de novo em instantes.'
  }
  if (!resposta) resposta = 'Não consegui puxar isso agora. Pode reformular?'
  return NextResponse.json({ resposta })
}

export const POST = withObservability('ai/consultor', handler)
