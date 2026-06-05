'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react'

interface AiCardProps {
  title: string
  text: string
  loading: boolean
  error?: string
  onGenerate: () => void
  onReset?: () => void
  generateLabel?: string
  placeholder?: string
}

export function AiCard({
  title,
  text,
  loading,
  error,
  onGenerate,
  onReset,
  generateLabel = 'Gerar com IA',
  placeholder = 'Clique no botão para gerar',
}: AiCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasContent = text.length > 0

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(0,117,255,0.06) 0%, rgba(109,40,217,0.08) 100%)',
        border: '1px solid rgba(109,40,217,0.25)',
        boxShadow: hasContent || loading ? '0 0 32px rgba(109,40,217,0.08)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)' }}
          >
            <Sparkles size={13} color="#fff" />
          </div>
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasContent && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: copied ? '#01B574' : '#A0AEC0',
                background: copied ? 'rgba(1,181,116,0.1)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(1,181,116,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          )}
          {(hasContent || error) && !loading && onReset && (
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#56577A', background: 'rgba(255,255,255,0.04)' }}
              title="Limpar"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && !hasContent && (
        <div className="flex items-center gap-2 py-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#6D28D9',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <p className="text-sm" style={{ color: '#A0AEC0' }}>Gerando…</p>
        </div>
      )}

      {error && !hasContent && (
        <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.08)' }}>
          {error}
        </p>
      )}

      {hasContent && (
        <div
          className="text-sm leading-relaxed"
          style={{ color: '#CBD5E0', whiteSpace: 'pre-wrap' }}
        >
          {text}
          {loading && <span className="inline-block w-0.5 h-4 ml-0.5 align-middle" style={{ background: '#6D28D9', animation: 'pulse 1s ease-in-out infinite' }} />}
        </div>
      )}

      {/* Generate button */}
      {!hasContent && !loading && !error && (
        <button
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)',
            boxShadow: '0 4px 20px rgba(109,40,217,0.25)',
          }}
        >
          <Sparkles size={15} />
          {generateLabel}
        </button>
      )}

      {error && !loading && (
        <button
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)',
            boxShadow: '0 4px 20px rgba(109,40,217,0.25)',
          }}
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      )}
    </div>
  )
}
