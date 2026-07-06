import { DEFAULT_BUSINESS_RULES } from './rules'
import type { BusinessRules } from './types'

// Carrega as Business Rules da configuração (nunca do código):
//   1) tabela business_rules (config editável sem recompilar — fonte única);
//   2) padrão de fallback.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function carregarBusinessRules(sb: any): Promise<BusinessRules> {
  try {
    const { data } = await sb.from('business_rules').select('rules').limit(1).maybeSingle()
    if (data?.rules) return data.rules as BusinessRules
  } catch {
    /* segue para o padrão */
  }
  return DEFAULT_BUSINESS_RULES
}
