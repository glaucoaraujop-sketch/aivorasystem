import type { CadenceRow } from './radar'

// Carrega as linhas do Radar (view vw_client_rfm) e anexa a(s) fábrica(s) de cada
// cliente a partir dos pedidos não cancelados. Reutilizado pelo chat e pelo cron.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function carregarLinhasRadar(sb: any): Promise<CadenceRow[]> {
  const { data, error } = await sb.from('vw_client_rfm').select('*')
  if (error) throw new Error(error.message)

  const ord = await sb.from('orders').select('client_id,suppliers(name)').neq('status', 'cancelado').limit(20000)
  const fabPorCliente = new Map<string, Set<string>>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const o of (ord.data ?? []) as any[]) {
    const nome = o.suppliers?.name
    if (!o.client_id || !nome) continue
    if (!fabPorCliente.has(o.client_id)) fabPorCliente.set(o.client_id, new Set())
    fabPorCliente.get(o.client_id)!.add(nome)
  }

  return ((data ?? []) as CadenceRow[]).map(r => ({
    ...r, fabricas: [...(fabPorCliente.get(r.client_id ?? '') ?? [])],
  }))
}
