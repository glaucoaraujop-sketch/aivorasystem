import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { carregarLinhasRadar } from '@/lib/ai/radarServer'
import { priorizarRadar, formatarMensagemRadar } from '@/lib/ai/radar'
import { withObservability } from '@/lib/observability/api'
import { segredoConfere } from '@/lib/security/segredo'

// Endpoint de AUTOMAÇÃO (n8n/cron): monta o Radar de Carteira diário e devolve a
// mensagem pronta pro WhatsApp do Alex + a lista priorizada. Não grava nada.
// Protegido por segredo (CRON_SECRET), pois não usa sessão de usuário.

export const maxDuration = 60

async function handler(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return NextResponse.json({ error: 'CRON_SECRET não configurado no servidor' }, { status: 500 })
  // Segredo só via header (n8n usa x-cron-secret). Fallback por query removido:
  // query string vaza em logs/proxies. Ver auditoria de segurança jul/2026.
  const enviado = req.headers.get('x-cron-secret')
  if (!segredoConfere(enviado, segredo)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })

  let sb: ReturnType<typeof createAdminClient>
  try { sb = createAdminClient() } catch {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' }, { status: 500 })
  }

  const nome = req.nextUrl.searchParams.get('nome') || 'Alex'
  const max = Number(req.nextUrl.searchParams.get('max')) || 5

  let itens
  try {
    const rows = await carregarLinhasRadar(sb)
    itens = priorizarRadar(rows, { limite: 50 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Falha ao montar o Radar', detalhe: msg }, { status: 500 })
  }

  const mensagem = formatarMensagemRadar(itens, { nome, max })
  return NextResponse.json({
    ok: true,
    total: itens.length,     // 0 = ninguém saindo do ritmo (n8n pode não disparar)
    enviar: itens.length > 0,
    mensagem,
    clientes: itens.slice(0, max),
  })
}

export const GET = withObservability('cron.radar-carteira', handler)
export const POST = withObservability('cron.radar-carteira', handler)
