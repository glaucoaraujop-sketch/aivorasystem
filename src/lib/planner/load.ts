import { DEFAULT_BUSINESS_RULES, rulesFromSettings } from './rules'
import type { BusinessRules } from './types'

// Carrega as Business Rules da configuração (nunca do código), na ordem:
//   1) tabela business_rules (config completa, editável sem recompilar);
//   2) system_settings (o que o representante já edita na aba Configurações);
//   3) padrão de fallback.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function carregarBusinessRules(sb: any): Promise<BusinessRules> {
  // 1) Config completa (quando a tabela existir/estiver preenchida)
  try {
    const { data } = await sb.from('business_rules').select('rules').limit(1).maybeSingle()
    if (data?.rules) return data.rules as BusinessRules
  } catch {
    /* tabela pode ainda não existir — segue para o fallback */
  }
  // 2) Configurações que o usuário já edita hoje
  try {
    const { data: s } = await sb.from('system_settings').select('*').limit(1).maybeSingle()
    return rulesFromSettings(s)
  } catch {
    /* ignore */
  }
  // 3) Padrão
  return DEFAULT_BUSINESS_RULES
}
