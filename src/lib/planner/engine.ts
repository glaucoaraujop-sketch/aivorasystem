import type {
  BusinessRules, ClientePlanner, DiaAgenda, ItemAgenda, PlanoSemanal, PriorityLevel, StatusJanela,
} from './types'

// ─────────────────────────── Capacity Engine ───────────────────────────
// Capacidade semanal em PDVs = dias úteis × visitas por dia (tudo da config).
export function capacidadeSemanal(rules: BusinessRules): number {
  return Math.max(0, rules.working_days.length) * Math.max(0, rules.visits_per_day)
}

function nivel(rules: BusinessRules, id: number | null | undefined): PriorityLevel | null {
  if (id == null) return null
  return rules.priority_levels.find(l => l.id === id && l.enabled) ?? null
}

// ─────────────────────────── Janela (due/risco) ───────────────────────────
// Usa apenas ideal_days e tolerance_days do nível — nada fixo.
export function statusJanela(rules: BusinessRules, c: ClientePlanner): StatusJanela {
  const lvl = nivel(rules, c.classificacao_id)
  if (!lvl) return 'sem_classificacao'
  if (c.dias_sem_visita == null) return 'em_risco' // nunca visitado → entra com prioridade
  if (c.dias_sem_visita > lvl.ideal_days + lvl.tolerance_days) return 'em_risco'
  if (c.dias_sem_visita >= lvl.ideal_days - lvl.tolerance_days) return 'na_janela'
  return 'ok'
}

// ─────────────────────────── Score Engine ───────────────────────────
// Combinação linear de fatores; TODOS os pesos vêm de rules.score_weights.
export function calcularScore(rules: BusinessRules, c: ClientePlanner): number {
  const w = rules.score_weights
  const lvl = nivel(rules, c.classificacao_id)
  const pw = lvl?.priority_weight ?? 0
  const ideal = lvl?.ideal_days ?? 30
  const dias = c.dias_sem_visita ?? ideal * 2 // nunca visitado pesa como "muito atrasado"

  let score = 0
  score += w.priority_weight * pw
  score += w.days_since_visit * dias
  score += w.pdvs * (c.pdvs || 0)
  score += w.potencial * (c.potencial ?? 0)
  score += w.faturamento * (c.faturamento ?? 0)

  // Penalidade por visita recente: quanto mais cedo que a janela, maior a penalidade.
  if (lvl && c.dias_sem_visita != null) {
    const faltamParaJanela = (lvl.ideal_days - lvl.tolerance_days) - c.dias_sem_visita
    if (faltamParaJanela > 0) score -= w.recent_visit_penalty * faltamParaJanela
  }
  if (c.ja_agendado) score -= w.already_scheduled_penalty

  return Math.round(score)
}

function justificativa(rules: BusinessRules, c: ClientePlanner, score: number, status: StatusJanela): string {
  const lvl = nivel(rules, c.classificacao_id)
  const partes: string[] = []
  if (lvl) partes.push(lvl.name)
  partes.push(c.dias_sem_visita == null ? 'nunca visitado' : `${c.dias_sem_visita} dias sem visita`)
  partes.push(`${c.pdvs || 0} PDV`)
  partes.push(`score ${score}`)
  if (status === 'em_risco') partes.push('em risco (fora da tolerância)')
  else if (status === 'na_janela') partes.push('dentro da janela ideal')
  else if (status === 'ok') partes.push('preenchimento de capacidade')
  return partes.join(' · ')
}

// Desempate — "Ordem de Prioridade" do spec: score → priority_weight → PDVs → faturamento → dias.
function comparar(rules: BusinessRules, a: ClientePlanner, sa: number, b: ClientePlanner, sb: number): number {
  if (sb !== sa) return sb - sa
  const pa = nivel(rules, a.classificacao_id)?.priority_weight ?? 0
  const pb = nivel(rules, b.classificacao_id)?.priority_weight ?? 0
  if (pb !== pa) return pb - pa
  if ((b.pdvs || 0) !== (a.pdvs || 0)) return (b.pdvs || 0) - (a.pdvs || 0)
  if ((b.faturamento ?? 0) !== (a.faturamento ?? 0)) return (b.faturamento ?? 0) - (a.faturamento ?? 0)
  return (b.dias_sem_visita ?? 0) - (a.dias_sem_visita ?? 0)
}

// Distribui a agenda (que é semanal) em dias, respeitando visits_per_day por dia.
// Um cliente com muitos PDVs pode ocupar mais de um dia (visitar lojas em dias diferentes).
function distribuirPorDia(rules: BusinessRules, agenda: ItemAgenda[]): DiaAgenda[] {
  const capDia = Math.max(1, rules.visits_per_day)
  const dias: DiaAgenda[] = rules.working_days.map(d => ({ dia: d, pdvs: 0, itens: [] }))
  if (dias.length === 0) return dias
  let di = 0
  for (const it of agenda) {
    let restantes = it.pdvs || 1
    while (restantes > 0 && di < dias.length) {
      const livre = capDia - dias[di].pdvs
      if (livre <= 0) { di++; continue }
      const usar = Math.min(livre, restantes)
      dias[di].itens.push({ cliente_id: it.cliente_id, nome: it.nome, pdvs: usar })
      dias[di].pdvs += usar
      restantes -= usar
      if (dias[di].pdvs >= capDia) di++
    }
    if (di >= dias.length) break
  }
  return dias
}

// ─────────────────────────── Planning Engine ───────────────────────────
// Monta a agenda da semana: preenche a capacidade (em PDVs) pelos maiores scores,
// priorizando quem está "devido" (na janela / em risco) e completando a capacidade
// livre com o próximo maior score.
export function planejarSemana(rules: BusinessRules, clientes: ClientePlanner[]): PlanoSemanal {
  const capacidade = capacidadeSemanal(rules)

  const enriched = clientes.map(c => ({
    c,
    score: calcularScore(rules, c),
    status: statusJanela(rules, c),
  }))

  const item = (e: { c: ClientePlanner; score: number; status: StatusJanela }): ItemAgenda => ({
    cliente_id: e.c.id,
    nome: e.c.nome,
    classificacao: nivel(rules, e.c.classificacao_id)?.name ?? '—',
    pdvs: e.c.pdvs || 0,
    score: e.score,
    status: e.status,
    dias_sem_visita: e.c.dias_sem_visita,
    justificativa: justificativa(rules, e.c, e.score, e.status),
  })

  const devidos = enriched
    .filter(e => e.status === 'em_risco' || e.status === 'na_janela')
    .sort((x, y) => comparar(rules, x.c, x.score, y.c, y.score))
  const restante = enriched
    .filter(e => !(e.status === 'em_risco' || e.status === 'na_janela'))
    .sort((x, y) => comparar(rules, x.c, x.score, y.c, y.score))

  const agenda: ItemAgenda[] = []
  const foraPorCapacidade: ItemAgenda[] = []
  let usada = 0

  // 1) encaixa os devidos por score enquanto couber na capacidade (peso = PDVs)
  for (const e of devidos) {
    const peso = e.c.pdvs || 1
    if (usada + peso <= capacidade) { agenda.push(item(e)); usada += peso }
    else foraPorCapacidade.push(item(e))
  }
  // 2) preenche a capacidade livre com o maior score restante
  for (const e of restante) {
    if (usada >= capacidade) break
    const peso = e.c.pdvs || 1
    if (usada + peso <= capacidade) { agenda.push(item(e)); usada += peso }
  }

  const em_risco = enriched
    .filter(e => e.status === 'em_risco')
    .map(item)
    .sort((a, b) => b.score - a.score)

  return {
    capacidade_total: capacidade,
    capacidade_usada: usada,
    capacidade_livre: Math.max(0, capacidade - usada),
    agenda,
    em_risco,
    fora_por_capacidade: foraPorCapacidade,
    dias: distribuirPorDia(rules, agenda),
  }
}
