'use client'

import { useState } from 'react'
import { MessageCircle, Sparkles, Copy, Check, RefreshCw, ChevronDown } from 'lucide-react'
import { useAI } from '@/hooks/useAI'

type TipoMensagem =
  | 'follow_up_visita'
  | 'follow_up_orcamento'
  | 'atualizacao_pedido'
  | 'reengajamento'
  | 'pos_visita'

const TIPO_LABELS: Record<TipoMensagem, string> = {
  follow_up_visita:   'Follow-up pós-visita',
  follow_up_orcamento:'Follow-up de orçamento',
  atualizacao_pedido: 'Atualização de pedido',
  reengajamento:      'Reengajamento de cliente',
  pos_visita:         'Pós-visita com proposta',
}

interface AiMensagemProps {
  clienteName: string
  clienteWhatsapp?: string | null
  tiposDisponiveis?: TipoMensagem[]
  contextoBase?: string
  nomeRepresentante?: string
}

export function AiMensagem({
  clienteName,
  clienteWhatsapp,
  tiposDisponiveis = ['reengajamento', 'follow_up_orcamento'],
  contextoBase = '',
  nomeRepresentante,
}: AiMensagemProps) {
  const [open, setOpen]   = useState(false)
  const [tipo, setTipo]   = useState<TipoMensagem>(tiposDisponiveis[0])
  const [ctx, setCtx]     = useState(contextoBase)
  const [copied, setCopied] = useState(false)
  const { text, loading, error, generate, reset } = useAI()

  async function handleGenerate() {
    await generate('/api/ai/mensagem', {
      tipo,
      clienteName,
      contexto: ctx || `Cliente: ${clienteName}`,
      nomeRepresentante,
    })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    reset()
    setCtx(contextoBase)
  }

  const whatsappUrl = clienteWhatsapp
    ? `https://wa.me/55${clienteWhatsapp.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`
    : null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(1,181,116,0.2)' }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all"
        style={{ background: 'rgba(1,181,116,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(1,181,116,0.15)' }}
          >
            <Sparkles size={13} style={{ color: '#01B574' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#01B574' }}>
            Gerar Mensagem WhatsApp com IA
          </p>
        </div>
        <ChevronDown
          size={16}
          style={{ color: '#01B574', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {open && (
        <div className="p-5 space-y-4" style={{ background: 'rgba(1,181,116,0.04)' }}>
          {/* Tipo selector */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
              Tipo de mensagem
            </label>
            <div className="flex flex-wrap gap-2">
              {tiposDisponiveis.map(t => (
                <button
                  key={t}
                  onClick={() => { setTipo(t); reset() }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={tipo === t
                    ? { background: 'rgba(1,181,116,0.2)', color: '#01B574', border: '1px solid rgba(1,181,116,0.4)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Contexto extra */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
              Contexto adicional <span style={{ color: '#56577A' }}>(opcional)</span>
            </label>
            <textarea
              value={ctx}
              onChange={e => setCtx(e.target.value)}
              rows={2}
              placeholder="ex: orçamento de R$ 12.000 enviado há 3 dias, cliente não respondeu..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Resultado */}
          {text && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E0', whiteSpace: 'pre-wrap' }}>
                {text}
                {loading && (
                  <span
                    className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                    style={{ background: '#01B574', animation: 'pulse 1s ease-in-out infinite' }}
                  />
                )}
              </p>
              {!loading && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={copied
                      ? { color: '#01B574', background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.3)' }
                      : { color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado!' : 'Copiar texto'}
                  </button>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ color: '#01B574', background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.25)' }}
                    >
                      <MessageCircle size={12} /> Abrir no WhatsApp
                    </a>
                  )}
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ color: '#56577A', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <RefreshCw size={12} /> Gerar outra
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.08)' }}>
              {error}
            </p>
          )}

          {!text && !loading && (
            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #01B574 0%, #0075FF 100%)',
                boxShadow: '0 4px 16px rgba(1,181,116,0.2)',
              }}
            >
              <Sparkles size={14} /> Gerar mensagem
            </button>
          )}

          {loading && !text && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#01B574', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
              <p className="text-sm" style={{ color: '#A0AEC0' }}>Gerando mensagem…</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
