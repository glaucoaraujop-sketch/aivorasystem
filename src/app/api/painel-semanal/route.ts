import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withObservability } from '@/lib/observability/api'
import { nomeEmpresaCliente } from '@/lib/nomeCliente'

// Rota SÓ-LEITURA que alimenta o Painel Semanal externo (corte quinta→quinta,
// drill-down Cliente → Fábrica → Item). Métrica = VENDAS (pedido colocado, pela
// data do pedido). Protegida por token (PAINEL_TOKEN) e liberada por CORS (*),
// pois o painel externo é público. Não grava nada.

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-painel-token',
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS, 'Cache-Control': 'no-store' },
  })
}

// ── Helpers de data (semana quinta→quinta), no fuso de São Paulo ──────────────
const SP = 'America/Sao_Paulo'
const isoHoje = () => new Date().toLocaleDateString('en-CA', { timeZone: SP }) // YYYY-MM-DD
const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`)
const toISO = (d: Date) => d.toISOString().slice(0, 10)
const addDias = (iso: string, n: number) => {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}
const dow = (iso: string) => toDate(iso).getUTCDay() // 0=Dom .. 4=Qui .. 6=Sáb

// Última quinta ENCERRADA (a mais recente estritamente anterior à data de ref).
function ultimaQuintaEncerrada(refIso: string) {
  let d = addDias(refIso, -1)
  while (dow(d) !== 4) d = addDias(d, -1)
  return d
}
// Ajusta uma data qualquer para a QUINTA que fecha a semana dela (1ª quinta >=).
function ajustaParaQuinta(iso: string) {
  let d = iso
  for (let i = 0; i < 7 && dow(d) !== 4; i++) d = addDias(d, 1)
  return d
}
// Última quinta do mês (ano,mês) que não ultrapasse o teto.
function ultimaQuintaDoMes(ano: number, mes: number, teto: string) {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const mm = String(mes).padStart(2, '0')
  for (let d = ultimoDia; d >= 1; d--) {
    const iso = `${ano}-${mm}-${String(d).padStart(2, '0')}`
    if (dow(iso) === 4 && iso <= teto) return iso
  }
  return ajustaParaQuinta(`${ano}-${mm}-01`)
}

async function handler(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  // 1) Token
  const segredo = process.env.PAINEL_TOKEN
  if (!segredo) {
    return json({ error: 'PAINEL_TOKEN não configurado no servidor' }, 500)
  }
  const enviado = sp.get('token') || req.headers.get('x-painel-token')
  if (enviado !== segredo) {
    return json({ error: 'não autorizado' }, 401)
  }

  // 2) Quinta de referência (fim da semana)
  const hoje = isoHoje()
  const ateParam = sp.get('ate')
  const anoParam = sp.get('ano')
  const mesParam = sp.get('mes')

  let ate: string
  if (ateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ateParam)) {
      return json({ error: 'ate inválido — use YYYY-MM-DD' }, 400)
    }
    ate = ajustaParaQuinta(ateParam)
  } else if (anoParam && mesParam) {
    const ano = Number(anoParam)
    const mes = Number(mesParam)
    if (!Number.isInteger(ano) || ano < 2020 || ano > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return json({ error: 'ano/mes inválidos' }, 400)
    }
    ate = ultimaQuintaDoMes(ano, mes, ultimaQuintaEncerrada(hoje))
  } else {
    ate = ultimaQuintaEncerrada(hoje)
  }

  // 3) Monta o contrato no banco (uma chamada, sem cap de 1000)
  let sb: ReturnType<typeof createAdminClient>
  try {
    sb = createAdminClient()
  } catch {
    return json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' }, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.rpc as any)('fn_painel_semanal', { p_ate: ate })
  if (error) {
    return json({ error: 'falha ao gerar o painel', detalhe: error.message }, 500)
  }

  // 4) Resolve o NOME DA EMPRESA de cada cliente (nunca o responsável)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = data as any
  if (payload && Array.isArray(payload.clientes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload.clientes = payload.clientes.map((c: any) => {
      const { cliente_raw, ...resto } = c
      return { cliente: nomeEmpresaCliente(cliente_raw), ...resto }
    })
  }

  return json(payload)
}

export const GET = withObservability('painel-semanal', handler)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
