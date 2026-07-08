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

// ─────────────────────── Matching de cliente por similaridade ───────────────────────
// O pedido pode trazer o cliente pela RAZÃO SOCIAL enquanto o sistema o cadastrou
// pela NOME FANTASIA (ou vice-versa), e o CNPJ pode ser de outra filial (mesma raiz
// de 8 dígitos). Este matcher cruza CNPJ, razão social e nome fantasia e devolve o
// melhor candidato com um score e o motivo, para casar automaticamente (CNPJ idêntico)
// ou sugerir para confirmação (demais casos).

export interface ClienteMatch {
  id: string
  name: string
  company_name: string | null
  razao_social: string | null
  cpf_cnpj: string | null
}

export interface PedidoClienteInput {
  cliente_cnpj?: string | null
  cliente_nome?: string | null
  cliente_empresa?: string | null
  cliente_razao_social?: string | null
}

export interface ResultadoMatchCliente {
  cliente: ClienteMatch
  score: number   // 0..100
  motivo: string
}

// Score >= AUTO: casa sozinho (CNPJ idêntico). Score >= SUGESTAO: sugere e pede confirmação.
export const SCORE_AUTO = 90
export const SCORE_SUGESTAO = 45

function normList(...vals: (string | null | undefined)[]): string[] {
  return vals.filter((v): v is string => !!v && v.trim().length > 0).map(v => semAcento(v).toUpperCase())
}

// Melhor cliente do sistema para os dados de cliente extraídos do pedido (ou null).
export function acharClientePorSimilaridade(
  p: PedidoClienteInput,
  clientes: ClienteMatch[],
): ResultadoMatchCliente | null {
  const cnpjP = soDig(p.cliente_cnpj)
  const baseP = cnpjP.slice(0, 8)
  const textosP = normList(p.cliente_nome, p.cliente_empresa, p.cliente_razao_social)
  const chavesP = new Set(textosP.flatMap(t => palavrasChave(t)))

  let melhor: ResultadoMatchCliente | null = null
  for (const c of clientes) {
    let score = 0
    let motivo = ''
    const cnpjC = soDig(c.cpf_cnpj)

    if (cnpjP && cnpjC && cnpjP === cnpjC) {
      score = 100; motivo = 'CNPJ idêntico'
    } else if (cnpjP.length >= 8 && cnpjC.length >= 8 && baseP === cnpjC.slice(0, 8)) {
      score = 80; motivo = 'Mesmo CNPJ base (provável outra filial)'
    }

    const textosC = normList(c.name, c.company_name, c.razao_social)

    // Um nome contém o outro (razão social ↔ fantasia) — sinal forte
    const inclui = textosP.some(tp => textosC.some(tc =>
      (tp.includes(tc) || tc.includes(tp)) && Math.min(tp.length, tc.length) >= 5))
    if (inclui && score < 70) { score = 70; if (!motivo) motivo = 'Nome/razão social muito parecidos' }

    // Palavras-chave em comum (ignora genéricas: LTDA, MOVEIS, COMERCIO…)
    const chavesC = new Set(textosC.flatMap(t => palavrasChave(t)))
    const comuns = [...chavesP].filter(w => chavesC.has(w))
    if (comuns.length > 0) {
      const s = 40 + Math.min(comuns.length, 3) * 10 // 50..70
      if (s > score) { score = s; motivo = `Termos em comum: ${comuns.slice(0, 3).join(', ')}` }
      else if (!motivo) { motivo = `Termos em comum: ${comuns.slice(0, 3).join(', ')}` }
    }

    if (score > 0 && (!melhor || score > melhor.score)) melhor = { cliente: c, score, motivo }
  }
  return melhor
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
