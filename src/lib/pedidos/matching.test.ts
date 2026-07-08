import { describe, it, expect } from 'vitest'
import { soDig, fmtCnpj, semAcento, palavrasChave, aliasTermos, deduplicarPedidos,
  acharClientePorSimilaridade, SCORE_AUTO, SCORE_SUGESTAO, type ClienteMatch } from './matching'

describe('soDig', () => {
  it('mantém só dígitos do CNPJ', () => {
    expect(soDig('31.792.444/0001-30')).toBe('31792444000130')
  })
  it('trata null/undefined', () => {
    expect(soDig(null)).toBe('')
    expect(soDig(undefined)).toBe('')
  })
})

describe('fmtCnpj', () => {
  it('formata CNPJ (14 dígitos)', () => {
    expect(fmtCnpj('31792444000130')).toBe('31.792.444/0001-30')
  })
  it('formata CPF (11 dígitos)', () => {
    expect(fmtCnpj('12345678901')).toBe('123.456.789-01')
  })
  it('devolve sem alterar quando o tamanho não bate', () => {
    expect(fmtCnpj('123')).toBe('123')
  })
})

describe('semAcento', () => {
  it('remove acentos e normaliza espaços', () => {
    expect(semAcento('SÃO   PAULO')).toBe('SAO PAULO')
    expect(semAcento('  Móveis Açaí ')).toBe('Moveis Acai')
  })
})

describe('palavrasChave', () => {
  it('ignora stopwords e palavras curtas', () => {
    expect(palavrasChave('MOVEIS RAFANA LTDA')).toEqual(['RAFANA'])
  })
  it('mantém termos relevantes', () => {
    expect(palavrasChave('SETTE MOVEIS EIRELI')).toEqual(['SETTE'])
  })
})

describe('aliasTermos (razão social ↔ nome fantasia)', () => {
  it('reconhece Feroni pela razão social', () => {
    const termos = aliasTermos('FEITAL E GASPARONI ESTOFADOS LTDA - ME')
    expect(termos).toContain('feroni')
  })
  it('reconhece Cyrne mesmo com acento/caixa', () => {
    expect(aliasTermos('Cyrne Decor LTDA')).toContain('cyrne')
  })
  it('reconhece Rafana e Fine Decor', () => {
    expect(aliasTermos('MOVEIS RAFANA LTDA')).toContain('rafana')
    expect(aliasTermos('FINE DECOR LTDA')).toContain('fine decor')
  })
  it('retorna null para fornecedor desconhecido', () => {
    expect(aliasTermos('Loja Qualquer XYZ')).toBeNull()
    expect(aliasTermos(null)).toBeNull()
  })
})

describe('deduplicarPedidos', () => {
  it('remove duplicados pelo número, mantendo o primeiro', () => {
    const entrada = [
      { numero: '44374', v: 1 },
      { numero: '44374', v: 2 },
      { numero: '96258', v: 3 },
    ]
    const saida = deduplicarPedidos(entrada)
    expect(saida).toHaveLength(2)
    expect(saida[0].v).toBe(1)
    expect(saida.map(p => p.numero)).toEqual(['44374', '96258'])
  })
  it('mantém todos os pedidos sem número', () => {
    const entrada = [{ numero: null }, { numero: '' }, { numero: undefined }]
    expect(deduplicarPedidos(entrada)).toHaveLength(3)
  })
})

describe('acharClientePorSimilaridade', () => {
  const clientes: ClienteMatch[] = [
    { id: 'c1', name: 'MAISON PICCOLLI COMERCIO DE MOVEIS', company_name: null,
      razao_social: 'PICCOLLI & PREMIER COMERCIO DE MOVEIS LTDA', cpf_cnpj: '08.895.647/0001-33' },
    { id: 'c2', name: 'CASA BELLA DECORACOES', company_name: null, razao_social: 'CASA BELLA LTDA', cpf_cnpj: '11.222.333/0001-44' },
  ]

  it('casa por CNPJ idêntico (score máximo, auto)', () => {
    const r = acharClientePorSimilaridade({ cliente_cnpj: '08895647000133', cliente_nome: 'QUALQUER' }, clientes)
    expect(r?.cliente.id).toBe('c1')
    expect(r?.score).toBe(100)
    expect(r!.score).toBeGreaterThanOrEqual(SCORE_AUTO)
  })

  it('sugere por razão social quando o sistema tem só a fantasia (CNPJ de outra filial)', () => {
    const r = acharClientePorSimilaridade(
      { cliente_cnpj: '08895647000300', cliente_nome: 'PICCOLLI & PREMIER COMERCIO DE MOVEIS LTDA' },
      clientes,
    )
    expect(r?.cliente.id).toBe('c1')
    expect(r!.score).toBeGreaterThanOrEqual(SCORE_SUGESTAO)
    expect(r!.score).toBeLessThan(SCORE_AUTO)
  })

  it('sugere por termos em comum mesmo sem CNPJ', () => {
    const r = acharClientePorSimilaridade({ cliente_nome: 'PICCOLLI PREMIER' }, clientes)
    expect(r?.cliente.id).toBe('c1')
    expect(r!.score).toBeGreaterThanOrEqual(SCORE_SUGESTAO)
  })

  it('retorna null quando não há nenhuma semelhança', () => {
    expect(acharClientePorSimilaridade({ cliente_nome: 'ZZZ INEXISTENTE XYZ' }, clientes)).toBeNull()
  })
})
