// AIVA Planner — contratos.
// Toda decisão do motor é orientada por estas estruturas (Business Rules).
// Nenhuma regra de negócio é fixa no código: tudo vem da configuração.

export interface PriorityLevel {
  id: number
  name: string            // apenas visual — o motor NUNCA decide pelo nome
  ideal_days: number      // cadência ideal (dias entre visitas)
  tolerance_days: number  // tolerância antes/depois do ideal
  priority_weight: number // peso da classificação no score
  enabled: boolean
}

// Pesos do score — todos configuráveis (nunca fixos).
export interface ScoreWeights {
  priority_weight: number
  days_since_visit: number
  pdvs: number
  potencial: number
  faturamento: number
  recent_visit_penalty: number
  already_scheduled_penalty: number
}

// As regras de negócio de uma empresa. Carregadas de configuração (DB/settings),
// nunca embutidas na lógica.
export interface BusinessRules {
  working_days: string[]          // ['segunda'..'domingo']
  visits_per_day: number          // capacidade (PDVs) por dia
  priority_levels: PriorityLevel[]
  score_weights: ScoreWeights
}

// Cliente já preparado para o motor (dados operacionais).
export interface ClientePlanner {
  id: string
  nome: string
  classificacao_id: number | null // id de um PriorityLevel
  pdvs: number                    // pontos de venda (peso operacional)
  dias_sem_visita: number | null  // null = nunca visitado
  faturamento?: number
  potencial?: number
  ja_agendado?: boolean           // já tem visita marcada na semana
  cidade?: string | null
  estado?: string | null
}

export type StatusJanela = 'em_risco' | 'na_janela' | 'ok' | 'sem_classificacao'

export interface ItemAgenda {
  cliente_id: string
  nome: string
  classificacao: string
  pdvs: number
  score: number
  status: StatusJanela
  dias_sem_visita: number | null
  justificativa: string
}

export interface DiaAgenda {
  dia: string
  pdvs: number
  itens: { cliente_id: string; nome: string; pdvs: number }[]
}

export interface PlanoSemanal {
  capacidade_total: number
  capacidade_usada: number
  capacidade_livre: number
  agenda: ItemAgenda[]
  em_risco: ItemAgenda[]
  fora_por_capacidade: ItemAgenda[] // devidos que não couberam
  dias: DiaAgenda[]
}
