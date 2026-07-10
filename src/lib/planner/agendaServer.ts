import { carregarBusinessRules } from './load'
import { planejarSemana } from './engine'
import type { BusinessRules, ClientePlanner, PlanoSemanal } from './types'

const OFFSET_SEGUNDA: Record<string, number> = {
  segunda: 0, terca: 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, domingo: 6,
}

// Datas reais (YYYY-MM-DD) da PRÓXIMA semana para cada dia útil configurado.
export function datasProximaSemana(workingDays: string[], hoje: Date = new Date()): Record<string, string> {
  const proxSegunda = new Date(hoje)
  proxSegunda.setHours(0, 0, 0, 0)
  const dow = proxSegunda.getDay() // 0=Domingo
  const voltar = dow === 0 ? 6 : dow - 1
  proxSegunda.setDate(proxSegunda.getDate() - voltar + 7) // segunda-feira da próxima semana
  const out: Record<string, string> = {}
  for (const key of workingDays) {
    const off = OFFSET_SEGUNDA[key]
    if (off == null) continue
    const d = new Date(proxSegunda)
    d.setDate(proxSegunda.getDate() + off)
    out[key] = d.toISOString().slice(0, 10)
  }
  return out
}

// Carrega dados operacionais e monta o plano da semana (reutilizável por chat/API).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function montarAgendaSemana(sb: any): Promise<{
  regras: BusinessRules
  plano: PlanoSemanal
  datas: Record<string, string>
}> {
  const regras = await carregarBusinessRules(sb)

  const [cli, vis, fat] = await Promise.all([
    sb.from('clients').select('id,name,priority,active,client_cnpjs(num_lojas)').eq('active', true).limit(5000),
    sb.from('visits').select('client_id,completed_at,scheduled_at,status').limit(20000),
    // faturamento por cliente agregado no banco (vw_ranking_clientes) — sem cap de 1000
    sb.from('vw_ranking_clientes').select('client_id,faturamento'),
  ])
  if (cli.error) throw new Error(cli.error.message)

  const hoje = Date.now()
  const ultimaVisita = new Map<string, number>()
  const agendadoFuturo = new Set<string>()
  for (const v of vis.data ?? []) {
    if (v.status === 'realizada') {
      const t = new Date(v.completed_at || v.scheduled_at || 0).getTime()
      if (!ultimaVisita.has(v.client_id) || t > (ultimaVisita.get(v.client_id) as number)) ultimaVisita.set(v.client_id, t)
    }
    if (v.status === 'agendada' && v.scheduled_at && new Date(v.scheduled_at).getTime() > hoje) {
      agendadoFuturo.add(v.client_id)
    }
  }
  const faturamento = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const o of (fat.data ?? []) as any[]) {
    if (o.client_id) faturamento.set(o.client_id, Number(o.faturamento || 0))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientes: ClientePlanner[] = (cli.data ?? []).map((c: any) => {
    const vals = (c.client_cnpjs ?? []).map((x: { num_lojas: number | null }) => x.num_lojas ?? 1)
    const pdvs = vals.length ? Math.max(...vals) : 1
    const t = ultimaVisita.get(c.id)
    const dias = t ? Math.floor((hoje - t) / 86400000) : null
    return {
      id: c.id, nome: c.name, classificacao_id: c.priority ?? null,
      pdvs, dias_sem_visita: dias, faturamento: faturamento.get(c.id) || 0,
      ja_agendado: agendadoFuturo.has(c.id),
    }
  })

  const plano = planejarSemana(regras, clientes)
  const datas = datasProximaSemana(regras.working_days)
  return { regras, plano, datas }
}
