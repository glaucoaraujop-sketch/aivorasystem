'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiraChatProps {
  open: boolean
  onClose: () => void
  context?: string
  userName?: string
}

export function AiraChat({ open, onClose, context, userName }: AiraChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      const hora = new Date().getHours()
      const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
      setMessages([{
        role: 'assistant',
        content: `${saudacao}${userName ? `, ${userName}` : ''}! Sou a AIRA, sua assistente estratégica. Como posso ajudar hoje? 🤝`,
      }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: 'linear-gradient(180deg, #060B28 0%, #090D2E 100%)',
          borderLeft: '1px solid rgba(109,40,217,0.3)',
          boxShadow: '-8px 0 48px rgba(109,40,217,0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)', boxShadow: '0 4px 16px rgba(109,40,217,0.4)' }}
            >
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">AIRA</p>
              <p className="text-xs" style={{ color: '#A78BFA' }}>Assistente Estratégica · Aivora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={msg.role === 'assistant'
                  ? { background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)' }
                  : { background: 'rgba(255,255,255,0.1)' }
                }
              >
                {msg.role === 'assistant'
                  ? <Sparkles size={12} color="#fff" />
                  : <User size={12} color="#A0AEC0" />
                }
              </div>
              {/* Bubble */}
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={msg.role === 'assistant'
                  ? {
                      background: 'rgba(109,40,217,0.12)',
                      border: '1px solid rgba(109,40,217,0.2)',
                      color: '#E2E8F0',
                      whiteSpace: 'pre-wrap',
                      borderTopLeftRadius: 4,
                    }
                  : {
                      background: 'rgba(0,117,255,0.15)',
                      border: '1px solid rgba(0,117,255,0.25)',
                      color: '#ffffff',
                      borderTopRightRadius: 4,
                    }
                }
              >
                {msg.content}
                {loading && i === messages.length - 1 && msg.role === 'assistant' && msg.content && (
                  <span
                    className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
                    style={{ background: '#A78BFA', animation: 'pulse 1s ease-in-out infinite' }}
                  />
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)' }}>
                <Sparkles size={12} color="#fff" />
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.2)', borderTopLeftRadius: 4 }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#A78BFA', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte à AIRA…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)' }}
            >
              <Send size={14} color="#fff" />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: '#56577A' }}>
            AIRA pode cometer erros — valide decisões importantes
          </p>
        </div>
      </div>
    </>
  )
}
