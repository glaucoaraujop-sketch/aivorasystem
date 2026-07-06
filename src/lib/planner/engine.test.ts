import { describe, it, expect } from 'vitest'
import { capacidadeSemanal, calcularScore, statusJanela, planejarSemana } from './engine'
import { DEFAULT_BUSINESS_RULES, rulesFromSettings } from './rules'
import type { BusinessRules, ClientePlanner } from './types'

const R = DEFAULT_BUSINESS_RULES

const c = (over: Partial<ClientePlanner>): ClientePlanner => ({
  id: over.id ?? 'x',
  nome: over.nome ?? 'Cliente',
  // 'key in over' respeita valores explícitos, inclusive null
  classificacao_id: ('classificacao_id' in over ? over.classificacao_id : 1) as number | null,
  pdvs: over.pdvs ?? 1,
  dias_sem_visita: ('dias_sem_visita' in over ? over.dias_sem_visita : 0) as number | null,
  faturamento: over.faturamento, potencial: over.potencial, ja_agendado: over.ja_agendado,
})

describe('capacidadeSemanal', () => {
  it('é dias úteis × visitas por dia (config-driven)', () => {
    expect(capacidadeSemanal(R)).toBe(12) // 3 dias × 4
    const r2: BusinessRules = { ...R, working_days: ['segunda','terca','quarta','quinta','sexta'], visits_per_day: 6 }
    expect(capacidadeSemanal(r2)).toBe(30)
  })
})

describe('statusJanela', () => {
  it('VIP a 16 dias (ideal 15, tol 3) está na janela', () => {
    expect(statusJanela(R, c({ classificacao_id: 1, dias_sem_visita: 16 }))).toBe('na_janela')
  })
  it('VIP a 20 dias (> 15+3) está em risco', () => {
    expect(statusJanela(R, c({ classificacao_id: 1, dias_sem_visita: 20 }))).toBe('em_risco')
  })
  it('VIP a 5 dias ainda não está devido', () => {
    expect(statusJanela(R, c({ classificacao_id: 1, dias_sem_visita: 5 }))).toBe('ok')
  })
  it('nunca visitado entra como risco', () => {
    expect(statusJanela(R, c({ dias_sem_visita: null }))).toBe('em_risco')
  })
  it('sem classificação é sem_classificacao', () => {
    expect(statusJanela(R, c({ classificacao_id: null }))).toBe('sem_classificacao')
  })
})

describe('calcularScore', () => {
  it('VIP pontua mais que Bronze com o mesmo tempo/PDV', () => {
    const vip = calcularScore(R, c({ classificacao_id: 1, dias_sem_visita: 16, pdvs: 1 }))
    const bronze = calcularScore(R, c({ classificacao_id: 4, dias_sem_visita: 16, pdvs: 1 }))
    expect(vip).toBeGreaterThan(bronze)
  })
  it('pesos configuráveis mudam o resultado (config-driven)', () => {
    const base = calcularScore(R, c({ classificacao_id: 2, dias_sem_visita: 22, pdvs: 8 }))
    const semPeso: BusinessRules = { ...R, score_weights: { ...R.score_weights, pdvs: 0 } }
    const semPdv = calcularScore(semPeso, c({ classificacao_id: 2, dias_sem_visita: 22, pdvs: 8 }))
    expect(semPdv).toBeLessThan(base) // remover o peso de PDV reduz o score
  })
  it('cliente já agendado é fortemente penalizado', () => {
    const s = calcularScore(R, c({ classificacao_id: 1, dias_sem_visita: 30, ja_agendado: true }))
    expect(s).toBeLessThan(0)
  })
})

describe('planejarSemana', () => {
  const clientes = [
    c({ id: 'sylvia', nome: 'Sylvia Design', classificacao_id: 1, pdvs: 8, dias_sem_visita: 16 }),
    c({ id: 'pieta',  nome: 'PIETÁ',         classificacao_id: 1, pdvs: 3, dias_sem_visita: 18 }),
    c({ id: 'small1', nome: 'Loja A',        classificacao_id: 2, pdvs: 1, dias_sem_visita: 25 }),
    c({ id: 'small2', nome: 'Loja B',        classificacao_id: 3, pdvs: 1, dias_sem_visita: 5 }), // não devido
  ]

  it('respeita a capacidade (12 PDV) e usa peso operacional (PDVs)', () => {
    const p = planejarSemana(R, clientes)
    expect(p.capacidade_total).toBe(12)
    expect(p.capacidade_usada).toBeLessThanOrEqual(12)
    // Sylvia(8) + Pietá(3) = 11; sobra 1 → preenche com o próximo de maior score
    expect(p.capacidade_usada).toBe(12)
    expect(p.capacidade_livre).toBe(0)
    expect(p.agenda.map(a => a.cliente_id)).toContain('sylvia')
    expect(p.agenda.map(a => a.cliente_id)).toContain('pieta')
  })

  it('distribui em dias respeitando visits_per_day', () => {
    const p = planejarSemana(R, clientes)
    expect(p.dias.length).toBe(3)
    for (const d of p.dias) expect(d.pdvs).toBeLessThanOrEqual(R.visits_per_day)
  })

  it('gera justificativa para cada item da agenda', () => {
    const p = planejarSemana(R, clientes)
    for (const it of p.agenda) expect(it.justificativa.length).toBeGreaterThan(0)
  })

  it('reporta quem ficou de fora por falta de capacidade', () => {
    const muitos = [
      c({ id: 'a', nome: 'A', classificacao_id: 1, pdvs: 8, dias_sem_visita: 20 }),
      c({ id: 'b', nome: 'B', classificacao_id: 1, pdvs: 8, dias_sem_visita: 20 }),
    ]
    const p = planejarSemana(R, muitos)
    expect(p.agenda.length).toBe(1)          // só um cabe (8 de 12; o outro 8 não cabe)
    expect(p.fora_por_capacidade.length).toBe(1)
  })
})

describe('rulesFromSettings (config-driven a partir do que o usuário edita)', () => {
  it('usa dias úteis, capacidade e cadência das configurações', () => {
    const r = rulesFromSettings({
      priority_1_days: 10, clients_per_day: 5,
      visit_mon: true, visit_tue: false, visit_wed: true, visit_thu: false,
      visit_fri: true, visit_sat: false, visit_sun: false,
    })
    expect(r.working_days).toEqual(['segunda', 'quarta', 'sexta'])
    expect(r.visits_per_day).toBe(5)
    expect(r.priority_levels[0].ideal_days).toBe(10)
    expect(capacidadeSemanal(r)).toBe(15)
  })
})
