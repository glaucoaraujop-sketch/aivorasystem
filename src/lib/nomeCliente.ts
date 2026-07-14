// Resolve o NOME DA EMPRESA de um cliente para exibição em relatórios.
// Regra: priorizar o nome fantasia; nunca mostrar o nome de uma pessoa
// (responsável/gerente) quando existe a razão social da empresa.
//
// No cadastro atual os campos são inconsistentes:
//   - `name`         → geralmente o nome fantasia (MADEIRA FORTE, CASA E CIA),
//                      mas às vezes é o responsável (NILCE CHIARAMONTE).
//   - `company_name` → às vezes guarda só o primeiro nome de um contato (Saulo).
//   - `razao_social` → a razão social da empresa (SUPREME HOME DECOR LTDA).

export interface ClienteNome {
  name?: string | null
  company_name?: string | null
  razao_social?: string | null
}

// Termos que denunciam que o texto é uma EMPRESA (não uma pessoa).
const TERMOS_EMPRESA =
  /m[oó]vei?s|casa|lar|home|decor|design|com[eé]rc|ind[uú]str|ltda|\bme\b|\bepp\b|\beireli\b|loja|store|shop|studio|planejad|interior|ambient|represent|mobili|magazine|outlet|estofad|colch|espa[cç]o|centro|nordeste|varejist|atacad|import|distribu|& ?cia|s\/?a\b|conceito|\bart\b|hauser|group|\d/i

export function pareceEmpresa(s: string): boolean {
  return TERMOS_EMPRESA.test(s)
}

// Heurística: texto parece o nome de uma PESSOA (2+ palavras, só letras,
// sem nenhum termo de empresa).
function parecePessoa(s: string): boolean {
  const t = s.trim()
  if (!t || pareceEmpresa(t)) return false
  const palavras = t.split(/\s+/)
  return palavras.length >= 2 && /^[\p{L}\s'.-]+$/u.test(t)
}

export function nomeEmpresaCliente(c: ClienteNome | null | undefined): string {
  if (!c) return '—'
  const name = (c.name ?? '').trim()
  const razao = (c.razao_social ?? '').trim()
  const comp = (c.company_name ?? '').trim()

  // 1) Se o `name` NÃO parece pessoa, ele é o nome fantasia → usa.
  if (name && !parecePessoa(name)) return name

  // 2) `name` parece pessoa. Comparando com a razão social:
  //    - se a razão contém a 1ª palavra do name, o name é a marca curta da
  //      empresa (ex.: "MADEIRA FORTE" ⊂ "MADEIRA FORTE COMERCIO…") → mantém o name;
  //    - senão, o name é o responsável → usa a razão social (a empresa).
  if (name && razao) {
    const primeiraName = name.split(/\s+/)[0].toUpperCase()
    return razao.toUpperCase().includes(primeiraName) ? name : razao
  }

  // 3) Fallbacks: razão social, o próprio name, company_name (se for empresa).
  if (razao) return razao
  if (name) return name
  if (comp && pareceEmpresa(comp)) return comp
  return '—'
}
