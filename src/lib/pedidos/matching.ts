// Lógica pura de normalização e matching usada na importação de pedidos.
// Separada da UI/rota para reuso e testes de regressão (Vitest).

// Mantém só os dígitos de um CPF/CNPJ.
export function soDig(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

// Formata dígitos no padrão brasileiro (como fica salvo no banco).
export function fmtCnpj(d: string): string {
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
  return d
}

// Remove acentos e normaliza espaços.
export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

// Palavras genéricas ignoradas no matching por palavra-chave.
const STOPWORDS = new Set([
  'E', 'DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'NO', 'NA', 'OS', 'AS',
  'LTDA', 'EIRELI', 'EIRELE', 'ME', 'SA', 'SS', 'EPP', 'SRL',
  'MOVEIS', 'MOVEL', 'FURNITURE', 'INDUSTRIA', 'COMERCIO', 'COM',
])

export function palavrasChave(s: string): string[] {
  return semAcento(s).toUpperCase().split(' ').filter(w => w.length > 3 && !STOPWORDS.has(w))
}

// Aliases de fornecedor: o pedido pode trazer a razão social em vez do nome
// fantasia. Cada entrada lista termos equivalentes (sem acento, minúsculo).
export const FORNECEDOR_ALIASES: { termos: string[] }[] = [
  { termos: ['feroni', 'feital', 'gasparoni'] }, // Feroni = FEITAL E GASPARONI ESTOFADOS LTDA - ME
  { termos: ['rafana'] },                          // Rafana = MOVEIS RAFANA LTDA
  { termos: ['fine decor'] },                      // Fine Decor = FINE DECOR LTDA
  { termos: ['cyrne'] },                           // Cyrne = CYRNE DECOR LTDA
]

// Dado o nome do fornecedor no pedido, retorna os termos de busca equivalentes
// (nome fantasia + razão social) ou null se não for um fornecedor conhecido.
export function aliasTermos(nome: string | null | undefined): string[] | null {
  if (!nome) return null
  const lower = semAcento(nome).toLowerCase()
  const alias = FORNECEDOR_ALIASES.find(a => a.termos.some(t => lower.includes(t)))
  return alias ? alias.termos : null
}

// Remove pedidos duplicados pelo número de referência (mantém o primeiro).
// Pedidos sem número não são deduplicados.
export function deduplicarPedidos<T extends { numero?: string | null }>(pedidos: T[]): T[] {
  const vistos = new Set<string>()
  return pedidos.filter(p => {
    const n = (p.numero ?? '').toString().trim()
    if (!n) return true
    if (vistos.has(n)) return false
    vistos.add(n)
    return true
  })
}
