import { describe, it, expect } from 'vitest'
import { soDig, fmtCnpj, semAcento, palavrasChave, aliasTermos, deduplicarPedidos } from './matching'

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
