import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { montarAgendaSemana } from '@/lib/planner/agendaServer'
import { withObservability } from '@/lib/observability/api'
import { segredoConfere } from '@/lib/security/segredo'

// Endpoint de AUTOMAÇÃO (n8n/cron): roda o AIVA Planner e devolve o briefing
// pronto (texto WhatsApp) + o plano estruturado. Não grava nada — apenas propõe.
// Protegido por segredo (CRON_SECRET), pois não usa sessão de usuário.

export const maxDuration = 60

const DIA_LABEL: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda', terca: 'Terça',
  quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado',
}

const fmtBR = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

async function handler(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado no servidor' }, { status: 500 })
  }
  const enviado = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (!segredoConfere(enviado, segredo)) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  let sb: ReturnType<typeof createAdminClient>
  try {
    sb = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' }, { status: 500 })
  }

  let dados: Awaited<ReturnType<typeof montarAgendaSemana>>
  try {
    dados = await montarAgendaSemana(sb)
  } catch (err) {
    // Erro só é exposto porque a rota já está autenticada pelo segredo.
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Falha ao ler dados do Planner', detalhe: msg }, { status: 500 })
  }
  const { regras, plano, datas } = dados

  // Intervalo da semana (menor/maior data dos dias úteis)
  const isos = Object.values(datas).sort()
  const inicio = isos[0]
  const fim = isos[isos.length - 1]

  // ── Briefing pronto para WhatsApp (texto plano, negrito com *) ──
  const linhas: string[] = []
  linhas.push(`*📅 AIVA — Plano da próxima semana${inicio ? ` (${fmtBR(inicio)} a ${fmtBR(fim)})` : ''}*`)
  linhas.push('')
  linhas.push(`Capacidade: *${plano.capacidade_usada}* de ${plano.capacidade_total} PDVs planejados (${plano.capacidade_livre} livres).`)
  linhas.push('')

  for (const dia of plano.dias) {
    const data = datas[dia.dia]
    if (!data || dia.itens.length === 0) continue
    linhas.push(`🗓️ *${DIA_LABEL[dia.dia] ?? dia.dia} ${fmtBR(data)}*`)
    for (const it of dia.itens) {
      linhas.push(`  • ${it.nome}${it.pdvs > 1 ? ` (${it.pdvs} PDV)` : ''}`)
    }
    linhas.push('')
  }

  if (plano.em_risco.length) {
    linhas.push('*⚠️ Clientes em risco (fora da janela):*')
    for (const c of plano.em_risco.slice(0, 12)) {
      linhas.push(`  • ${c.nome}${c.dias_sem_visita != null ? ` — ${c.dias_sem_visita} dias sem visita` : ''}`)
    }
    linhas.push('')
  }

  if (plano.fora_por_capacidade.length) {
    linhas.push(`*Ficaram de fora por capacidade:* ${plano.fora_por_capacidade.map(c => c.nome).join(', ')}.`)
    linhas.push('')
  }

  linhas.push('Abra o Rep-Móveis e peça à AIVA _"pode agendar"_ para registrar essas visitas.')

  const mensagem = linhas.join('\n')

  return NextResponse.json({
    ok: true,
    semana: { inicio, fim },
    capacidade: {
      total: plano.capacidade_total,
      usada: plano.capacidade_usada,
      livre: plano.capacidade_livre,
    },
    regras: { working_days: regras.working_days, visits_per_day: regras.visits_per_day },
    datas,
    mensagem,
    plano,
  })
}

export const GET = withObservability('cron.planner-semanal', handler)
export const POST = withObservability('cron.planner-semanal', handler)
