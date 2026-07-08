// Lógica pura do "Radar de Carteira" (cadência/RFM). Separada da rota e do banco
// para permitir testes de regressão (Vitest), no mesmo padrão de aggregations.ts.

// Linha vinda da view aivora_rep.vw_client_rfm (+ fábricas anexadas pela rota).
export interface CadenceRow {
  client_id?: string
  client_name?: string | null
  company_name?: string | null
  pedidos_total?: number | null
  faturamento_total: number | null
  cadencia_media_dias: number | null
  dias_desde_ultimo: number | null
  atraso_relativo: number | null
  previsao_proxima_compra?: string | null
  segmento: string
  fabricas?: string[]
}

export const SEGMENTO_LABEL: Record<string, string> = {
  novo: 'Novo / sem histórico',
  em_dia: 'Em dia',
  atencao: 'Atenção',
  esfriando: 'Esfriando',
  em_risco: 'Em risco',
  hibernando: 'Hibernando',
}

export function rotuloSegmento(s: string): string {
  return SEGMENTO_LABEL[s] ?? s
}

const round1 = (n: number | null | undefined) => (n == null ? null : Math.round(Number(n) * 10) / 10)
const round2 = (n: number | null | undefined) => (n == null ? null : Math.round(Number(n) * 100) / 100)

export interface RadarItem {
  cliente: string
  fabricas: string[]
  segmento: string
  cadencia_media_dias: number | null
  dias_desde_ultimo: number | null
  atraso_relativo: number | null
  faturamento_total: number
  previsao_proxima_compra: string | null
  prioridade: number
}

// Filtra e prioriza os clientes do Radar.
// - minAtraso: atraso_relativo mínimo (default 1,3 = "Esfriando" pra cima)
// - segmentos: se informado, mantém só esses segmentos
// - fabrica: se informado, só clientes que compram dessa fábrica
// Ordena por faturamento_total × atraso_relativo (maior valor em risco primeiro).
export function priorizarRadar(
  rows: CadenceRow[],
  opts: { minAtraso?: number; segmentos?: string[]; fabrica?: string; limite?: number } = {},
): RadarItem[] {
  const minAtraso = opts.minAtraso ?? 1.3
  const limite = opts.limite ?? 100
  const fabrica = opts.fabrica ? opts.fabrica.trim().toLowerCase() : null

  return rows
    .filter(r => r.atraso_relativo != null && Number(r.atraso_relativo) >= minAtraso)
    .filter(r => !opts.segmentos || opts.segmentos.includes(r.segmento))
    .filter(r => !fabrica || (r.fabricas ?? []).some(f => f.toLowerCase().includes(fabrica)))
    .map(r => ({
      cliente: r.company_name || r.client_name || 'Sem cliente',
      fabricas: r.fabricas ?? [],
      segmento: r.segmento,
      cadencia_media_dias: round1(r.cadencia_media_dias),
      dias_desde_ultimo: round1(r.dias_desde_ultimo),
      atraso_relativo: round2(r.atraso_relativo),
      faturamento_total: Number(r.faturamento_total || 0),
      previsao_proxima_compra: r.previsao_proxima_compra ?? null,
      prioridade: Number(r.faturamento_total || 0) * Number(r.atraso_relativo || 0),
    }))
    .sort((a, b) => b.prioridade - a.prioridade)
    .slice(0, limite)
}

// % que o cliente está além do próprio ritmo (atraso 1,4 → "40% além do ritmo").
export function percentAlemDoRitmo(atraso_relativo: number | null): number {
  if (atraso_relativo == null) return 0
  return Math.round((Number(atraso_relativo) - 1) * 100)
}

// Mensagem curta pro WhatsApp do Alex (Radar diário). Máx. `max` itens.
export function formatarMensagemRadar(
  itens: RadarItem[],
  opts: { nome?: string; max?: number } = {},
): string {
  const nome = opts.nome ?? 'Alex'
  const max = opts.max ?? 5
  if (itens.length === 0) return `Bom dia, ${nome}! Carteira em dia — ninguém saindo do ritmo hoje. 👍`

  const lista = itens.slice(0, max)
  const linhas = lista.map(it => {
    const fab = it.fabricas[0] ? ` (${it.fabricas[0]})` : ''
    const pct = percentAlemDoRitmo(it.atraso_relativo)
    return `• ${it.cliente}${fab} — ${pct}% além do ritmo`
  })
  const qtd = itens.length
  const cab = `Bom dia, ${nome}. ${qtd} cliente${qtd > 1 ? 's' : ''} pra hoje:`
  const resto = itens.length > max ? `\n…e mais ${itens.length - max}.` : ''
  return `${cab}\n${linhas.join('\n')}${resto}`
}
