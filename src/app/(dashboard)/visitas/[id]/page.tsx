'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, MapPin, MessageCircle, Calendar, CheckCircle,
  XCircle, RotateCcw, Clock, ChevronRight,
} from 'lucide-react'
import { useVisita, useVisitasMutations } from '@/hooks/useVisitas'
import type { VisitStatus } from '@/types/database'
import { AiCard } from '@/components/ai/AiCard'
import { AiMensagem } from '@/components/ai/AiMensagem'
import { useAI } from '@/hooks/useAI'
import { useCurrentUserName } from '@/hooks/useCurrentUserName'

const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  agendada:   { label: 'Agendada',   color: '#0075FF', bg: 'rgba(0,117,255,0.15)',     icon: Calendar    },
  realizada:  { label: 'Realizada',  color: '#01B574', bg: 'rgba(1,181,116,0.15)',     icon: CheckCircle },
  cancelada:  { label: 'Cancelada',  color: '#FC8181', bg: 'rgba(252,129,129,0.15)',   icon: XCircle     },
  reagendada: { label: 'Reagendada', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)',    icon: RotateCcw   },
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type PanelType = 'resultado' | 'reagendar' | null

export default function VisitaDetalhe() {
  const params  = useParams()
  const id      = params.id as string
  const router  = useRouter()
  const { visita, loading, refetch } = useVisita(id)
  const { registrarResultado, atualizarStatus, reagendar } = useVisitasMutations()
  const { name: nomeRepresentante } = useCurrentUserName()

  const [panel, setPanel]             = useState<PanelType>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [result, setResult]           = useState('')
  const [nextAction, setNextAction]   = useState('')
  const [resultNotes, setResultNotes] = useState('')
  const [novaData, setNovaData]       = useState('')
  const minDatetime = new Date().toISOString().slice(0, 16)

  const briefing  = useAI()
  const followUp  = useAI()

  async function handleRegistrar() {
    if (!result.trim()) { setError('Descreva o resultado da visita'); return }
    setSaving(true); setError('')
    try {
      await registrarResultado(id, { result: result.trim(), notes: resultNotes || undefined, next_action: nextAction || undefined })
      await refetch(); setPanel(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleReagendar() {
    if (!novaData) { setError('Selecione a nova data'); return }
    setSaving(true); setError('')
    try {
      await reagendar(id, new Date(novaData).toISOString())
      await refetch(); setPanel(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleCancelar() {
    if (!confirm('Cancelar esta visita?')) return
    setSaving(true); setError('')
    try { await atualizarStatus(id, 'cancelada'); await refetch() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  function handleGerarBriefing() {
    if (!visita) return
    briefing.generate('/api/ai/briefing', {
      visita: {
        scheduled_at: visita.scheduled_at,
        objective:    visita.objective,
        notes:        visita.notes,
        result:       visita.result,
        next_action:  visita.next_action,
      },
      cliente: {
        name:          visita.clients?.name,
        company_name:  visita.clients?.company_name,
        city:          visita.clients?.city,
        state:         visita.clients?.state,
        whatsapp:      visita.clients?.whatsapp,
      },
    })
  }

  function handleGerarFollowUp() {
    if (!visita) return
    followUp.generate('/api/ai/mensagem', {
      tipo:              'pos_visita',
      clienteName:       visita.clients?.name ?? '',
      nomeRepresentante: nomeRepresentante ?? undefined,
      contexto:          `Visita realizada. Resultado: ${visita.result ?? 'Realizada com sucesso'}. Próxima ação: ${visita.next_action ?? 'Não definida'}`,
    })
  }

  if (loading) return (
    <div className="max-w-2xl w-full space-y-4 animate-pulse">
      <div className="h-8 rounded-xl w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )

  if (!visita) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <p className="text-white font-semibold">Visita não encontrada</p>
    </div>
  )

  const cfg = STATUS_CONFIG[visita.status]
  const StatusIcon = cfg.icon
  const agendada = visita.status === 'agendada'
  const reagendada = visita.status === 'reagendada'
  const realizada = visita.status === 'realizada'
  const atrasada = agendada && new Date(visita.scheduled_at) < new Date()

  return (
    <div className="max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/visitas')}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-white">Visita</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{visita.clients?.name}</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0"
          style={{ color: cfg.color, background: cfg.bg }}>
          <StatusIcon size={13} /> {cfg.label}
        </span>
      </div>

      {/* Alerta atrasada */}
      {atrasada && (
        <div className="rounded-2xl px-5 py-4 mb-5"
          style={{ background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#F6AD55' }}>
            Esta visita está com data passada sem resultado registrado.
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(246,173,85,0.7)' }}>
            Registre o resultado ou reagende.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Copiloto IA — antes da visita */}
        {(agendada || reagendada) && (
          <AiCard
            title="Copiloto de Visita"
            text={briefing.text}
            loading={briefing.loading}
            error={briefing.error}
            onGenerate={handleGerarBriefing}
            onReset={briefing.reset}
            generateLabel="Gerar briefing para esta visita"
          />
        )}

        {/* Cliente */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>Cliente</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{visita.clients?.name}</p>
              {visita.clients?.company_name && (
                <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{visita.clients.company_name}</p>
              )}
              {(visita.clients?.city || visita.clients?.state) && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#56577A' }}>
                  <MapPin size={11} />
                  {[visita.clients.city, visita.clients.state].filter(Boolean).join('/')}
                </p>
              )}
              {visita.clients?.address && (
                <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>{visita.clients.address}</p>
              )}
            </div>
            {visita.clients?.whatsapp && (
              <a href={`https://wa.me/55${visita.clients.whatsapp.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all hover:opacity-80"
                style={{ color: '#01B574', background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.2)' }}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Detalhes */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Detalhes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1" style={{ color: '#56577A' }}>Agendada para</p>
              <p className="font-medium capitalize"
                style={{ color: atrasada ? '#F6AD55' : '#ffffff' }}>
                {formatDatetime(visita.scheduled_at)}
              </p>
            </div>
            {visita.completed_at && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#56577A' }}>Realizada em</p>
                <p className="font-medium capitalize text-white">{formatDatetime(visita.completed_at)}</p>
              </div>
            )}
          </div>
          {visita.objective && (
            <div>
              <p className="text-xs mb-1" style={{ color: '#56577A' }}>Objetivo</p>
              <p className="text-sm" style={{ color: '#A0AEC0' }}>{visita.objective}</p>
            </div>
          )}
          {visita.notes && (
            <div>
              <p className="text-xs mb-1" style={{ color: '#56577A' }}>Observações</p>
              <p className="text-sm" style={{ color: '#A0AEC0' }}>{visita.notes}</p>
            </div>
          )}
        </div>

        {/* Resultado (se realizada) */}
        {realizada && visita.result && (
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(1,181,116,0.08)', border: '1px solid rgba(1,181,116,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#01B574' }}>Resultado</p>
            <div>
              <p className="text-xs mb-1" style={{ color: 'rgba(1,181,116,0.7)' }}>O que aconteceu</p>
              <p className="text-sm" style={{ color: '#ffffff' }}>{visita.result}</p>
            </div>
            {visita.next_action && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgba(1,181,116,0.7)' }}>Próxima ação</p>
                <p className="text-sm flex items-center gap-1" style={{ color: '#01B574' }}>
                  <ChevronRight size={14} />{visita.next_action}
                </p>
              </div>
            )}
          </div>
        )}

        {/* IA pós-visita: follow-up WhatsApp */}
        {realizada && (
          <>
            <AiCard
              title="Follow-up da Visita"
              text={followUp.text}
              loading={followUp.loading}
              error={followUp.error}
              onGenerate={handleGerarFollowUp}
              onReset={followUp.reset}
              generateLabel="Gerar mensagem de follow-up"
            />
            {visita.clients && (
              <AiMensagem
                clienteName={visita.clients.name}
                clienteWhatsapp={visita.clients.whatsapp}
                tiposDisponiveis={['pos_visita', 'follow_up_visita', 'follow_up_orcamento']}
                contextoBase={`Visita realizada. Resultado: ${visita.result ?? ''}. Próxima ação: ${visita.next_action ?? ''}`}
                nomeRepresentante={nomeRepresentante ?? undefined}
              />
            )}
          </>
        )}

        {/* Painel: Registrar resultado */}
        {panel === 'resultado' && (
          <div className="glass-card rounded-2xl p-5 space-y-4"
            style={{ border: '1px solid rgba(0,117,255,0.3)' }}>
            <p className="font-semibold text-white">Registrar Resultado</p>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
                O que aconteceu na visita? *
              </label>
              <textarea value={result} onChange={e => setResult(e.target.value)} rows={3}
                placeholder="Descreva como foi a visita, o que foi discutido..."
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
                Próxima ação
              </label>
              <input value={nextAction} onChange={e => setNextAction(e.target.value)}
                placeholder="ex: Enviar orçamento, ligar em 15 dias..."
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
                Observações adicionais
              </label>
              <textarea value={resultNotes} onChange={e => setResultNotes(e.target.value)} rows={2}
                placeholder="Qualquer informação extra relevante..."
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
            </div>
            {error && (
              <p className="text-sm px-3 py-2 rounded-xl"
                style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}>{error}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setPanel(null); setError('') }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={handleRegistrar} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #01B574 0%, #00875A 100%)', boxShadow: '0 4px 16px rgba(1,181,116,0.3)' }}>
                {saving ? 'Salvando…' : 'Confirmar resultado'}
              </button>
            </div>
          </div>
        )}

        {/* Painel: Reagendar */}
        {panel === 'reagendar' && (
          <div className="glass-card rounded-2xl p-5 space-y-4"
            style={{ border: '1px solid rgba(246,173,85,0.3)' }}>
            <p className="font-semibold text-white">Reagendar Visita</p>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
                Nova data e hora *
              </label>
              <input type="datetime-local" value={novaData} min={minDatetime}
                onChange={e => setNovaData(e.target.value)}
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
            </div>
            {error && (
              <p className="text-sm px-3 py-2 rounded-xl"
                style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}>{error}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setPanel(null); setError('') }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={handleReagendar} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #F6AD55 0%, #DD6B20 100%)', boxShadow: '0 4px 16px rgba(246,173,85,0.3)' }}>
                {saving ? 'Salvando…' : 'Confirmar reagendamento'}
              </button>
            </div>
          </div>
        )}

        {/* Ações */}
        {(agendada || reagendada) && panel === null && (
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => { setPanel('resultado'); setError('') }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #01B574 0%, #00875A 100%)', boxShadow: '0 4px 16px rgba(1,181,116,0.3)' }}>
              <CheckCircle size={15} /> Registrar resultado
            </button>
            <button onClick={() => { setPanel('reagendar'); setError('') }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'rgba(246,173,85,0.15)', border: '1px solid rgba(246,173,85,0.3)', color: '#F6AD55' }}>
              <RotateCcw size={15} /> Reagendar
            </button>
            <button onClick={handleCancelar} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ color: '#FC8181', background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <XCircle size={15} /> Cancelar visita
            </button>
          </div>
        )}

        {error && panel === null && (
          <p className="text-sm px-3 py-2 rounded-xl"
            style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}>{error}</p>
        )}

        <p className="text-xs flex items-center gap-1 pb-4" style={{ color: '#56577A' }}>
          <Clock size={11} />
          Criada em {new Date(visita.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
