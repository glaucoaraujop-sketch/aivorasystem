import type { CadenceRow } from './radar'

// Carrega as linhas do Radar (view vw_client_rfm) e anexa a(s) fábrica(s) de cada
// cliente a partir dos pedidos não cancelados. Reutilizado pelo chat e pelo cron.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function carregarLinhasRadar(sb: any): Promise<CadenceRow[]> {
  const { data, error } = await sb.from('vw_client_rfm').select('*')
  if (error) throw new Error(error.message)

  // Fábricas por cliente vêm agregadas do banco (vw_client_fabricas) — sem cap de 1000
  const fab = await sb.from('vw_client_fabricas').select('client_id,fabricas')
  const fabPorCliente = new Map<string, string[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const f of (fab.data ?? []) as any[]) {
    if (f.client_id) fabPorCliente.set(f.client_id, f.fabricas ?? [])
  }

  return ((data ?? []) as CadenceRow[]).map(r => ({
    ...r, fabricas: fabPorCliente.get(r.client_id ?? '') ?? [],
  }))
}
