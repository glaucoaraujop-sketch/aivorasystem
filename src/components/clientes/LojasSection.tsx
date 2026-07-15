'use client'

import { useState } from 'react'
import { Store, Plus, Trash2, Pencil, X, Warehouse, MapPin, Clock, Wand2, Inbox } from 'lucide-react'
import { useClientLojas, useClientLojasMutations, usePedidosSemLoja, PRIORIDADE_PDV, type ClientLoja, type ClientLojaInput } from '@/hooks/useClientLojas'
import { formatCurrency } from '@/lib/utils'

const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const input = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

type FormState = {
  nome: string; tipo: string; prioridade: string; apelidos: string
  cidade: string; uf: string; bairro: string; endereco: string; cep: string
  whatsapp: string; responsavel: string; ativo: boolean
}
const vazio: FormState = { nome: '', tipo: 'loja', prioridade: '', apelidos: '', cidade: '', uf: '', bairro: '', endereco: '', cep: '', whatsapp: '', responsavel: '', ativo: true }

function paraForm(l: ClientLoja): FormState {
  return {
    nome: l.nome, tipo: l.tipo, prioridade: l.prioridade ? String(l.prioridade) : '',
    apelidos: (l.apelidos ?? []).join(', '),
    cidade: l.cidade ?? '', uf: l.uf ?? '', bairro: l.bairro ?? '', endereco: l.endereco ?? '',
    cep: l.cep ?? '', whatsapp: l.whatsapp ?? '', responsavel: l.responsavel ?? '', ativo: l.ativo,
  }
}
function paraInput(f: FormState): ClientLojaInput {
  return {
    nome: f.nome.trim(), tipo: f.tipo,
    prioridade: f.prioridade ? Number(f.prioridade) : null,
    apelidos: f.apelidos.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    cidade: f.cidade.trim() || null, uf: f.uf.trim().toUpperCase() || null, bairro: f.bairro.trim() || null,
    endereco: f.endereco.trim() || null, cep: f.cep.trim() || null,
    whatsapp: f.whatsapp.trim() || null, responsavel: f.responsavel.trim() || null, ativo: f.ativo,
  }
}

export function LojasSection({ clientId }: { clientId: string }) {
  const [reloadKey, setReloadKey] = useState(0)
  const { lojas, loading, refetch } = useClientLojas(clientId)
  const { criar, atualizar, remover, atribuirPedido, reatribuirAuto } = useClientLojasMutations()
  const { pedidos: semLoja, total: semLojaTotal, refetch: refetchSemLoja } = usePedidosSemLoja(clientId, reloadKey)

  const [aberto, setAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [auto, setAuto] = useState(false)

  const pdvs = lojas.filter(l => l.tipo === 'loja')

  async function recarregar() { await Promise.all([refetch(), refetchSemLoja()]); setReloadKey(k => k + 1) }

  async function tentarAuto() {
    setAuto(true)
    try {
      const n = await reatribuirAuto(clientId)
      await recarregar()
      alert(n > 0 ? `${n} pedido(s) atribuído(s) automaticamente pelo código da OC.` : 'Nenhum pedido novo casou automaticamente. Atribua manualmente abaixo.')
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setAuto(false) }
  }

  async function atribuir(orderId: string, lojaId: string) {
    if (!lojaId) return
    try { await atribuirPedido(orderId, lojaId); await recarregar() }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
  }

  function abrirNovo() { setEditId(null); setForm(vazio); setErro(''); setAberto(true) }
  function abrirEdicao(l: ClientLoja) { setEditId(l.id); setForm(paraForm(l)); setErro(''); setAberto(true) }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(p => ({ ...p, [k]: v })) }

  async function salvar() {
    setErro('')
    if (!form.nome.trim()) { setErro('Informe o nome do PDV.'); return }
    setSalvando(true)
    try {
      if (editId) await atualizar(editId, paraInput(form))
      else await criar(clientId, paraInput(form))
      setAberto(false); await recarregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') }
    finally { setSalvando(false) }
  }

  async function excluir(l: ClientLoja) {
    const aviso = l.pedidos > 0
      ? `Remover o PDV "${l.nome}"? Os ${l.pedidos} pedido(s) ligados ficarão SEM loja (podem ser reatribuídos depois).`
      : `Remover o PDV "${l.nome}"?`
    if (!confirm(aviso)) return
    try { await remover(l.id); await recarregar() } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
  }

  return (
    <section className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Store size={16} style={{ color: '#0075FF' }} />
          <h2 className="font-bold text-white text-base">Lojas / PDVs</h2>
          {pdvs.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#0075FF', background: 'rgba(0,117,255,0.12)' }}>
              {pdvs.length} {pdvs.length === 1 ? 'loja' : 'lojas'}
            </span>
          )}
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
          <Plus size={13} /> Adicionar PDV
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: '#56577A' }}>
        Filiais físicas do mesmo CNPJ. Cada PDV recebe os pedidos pelo <b>código da OC</b> e uma <b>classificação</b> de visita.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: '#A0AEC0' }}>Carregando…</p>
      ) : lojas.length === 0 ? (
        <div className="rounded-xl px-4 py-6 text-center" style={card}>
          <p className="text-sm" style={{ color: '#A0AEC0' }}>Nenhum PDV cadastrado.</p>
          <p className="text-xs mt-1" style={{ color: '#56577A' }}>Adicione as lojas físicas deste cliente para acompanhar o que cada uma compra.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {lojas.map(l => {
            const prio = l.prioridade ? PRIORIDADE_PDV[l.prioridade] : null
            return (
              <div key={l.id} className="rounded-xl px-4 py-3" style={card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.tipo === 'estoque'
                        ? <Warehouse size={14} style={{ color: '#A0AEC0' }} />
                        : <Store size={14} style={{ color: '#0075FF' }} />}
                      <span className="font-semibold text-white">{l.nome}</span>
                      {prio && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: prio.color, background: prio.bg }}>{prio.label}</span>
                      )}
                      {!l.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.15)' }}>inativo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: '#A0AEC0' }}>
                      <span className="font-semibold" style={{ color: '#01B574' }}>{formatCurrency(l.faturamento)}</span>
                      <span>{l.pedidos} ped.</span>
                      {l.dias_desde_ultima != null && (
                        <span className="flex items-center gap-1"><Clock size={11} /> {l.dias_desde_ultima}d sem comprar</span>
                      )}
                      {l.cidade && <span className="flex items-center gap-1"><MapPin size={11} /> {l.cidade}{l.uf ? `/${l.uf}` : ''}</span>}
                    </div>
                    {l.apelidos.length > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: '#56577A' }}>códigos OC: {l.apelidos.join(' · ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEdicao(l)} title="Editar" className="p-1.5 rounded-lg" style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.05)' }}><Pencil size={13} /></button>
                    <button onClick={() => excluir(l)} title="Remover" className="p-1.5 rounded-lg" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Fila: pedidos sem loja */}
      {pdvs.length > 0 && semLojaTotal > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Inbox size={15} style={{ color: '#F6AD55' }} />
              <h3 className="text-sm font-semibold text-white">Pedidos sem loja</h3>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#F6AD55', background: 'rgba(246,173,85,0.14)' }}>{semLojaTotal}</span>
            </div>
            <button onClick={tentarAuto} disabled={auto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(0,117,255,0.12)', color: '#0075FF', border: '1px solid rgba(0,117,255,0.25)' }}>
              <Wand2 size={13} /> {auto ? 'Atribuindo…' : 'Tentar automático'}
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: '#56577A' }}>
            Pedidos que o sistema não conseguiu ligar a um PDV. Use “Tentar automático” (casa pelo código da OC) ou escolha a loja em cada um.
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {semLoja.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={card}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white font-medium">{p.number || '—'}</span>
                    <span className="font-semibold" style={{ color: '#01B574' }}>{formatCurrency(p.total)}</span>
                  </div>
                  <p className="text-[11px] truncate" style={{ color: '#56577A' }}>{p.oc || '(sem OC)'}{p.data ? ` · ${p.data.split('-').reverse().join('/')}` : ''}</p>
                </div>
                <select defaultValue="" onChange={e => atribuir(p.id, e.target.value)}
                  className="text-xs rounded-lg px-2 py-1.5 text-white outline-none flex-shrink-0" style={input}>
                  <option value="" style={{ color: '#000' }}>Escolher loja…</option>
                  {lojas.map(l => <option key={l.id} value={l.id} style={{ color: '#000' }}>{l.nome}</option>)}
                </select>
              </div>
            ))}
            {semLojaTotal > semLoja.length && (
              <p className="text-[11px] text-center py-1" style={{ color: '#56577A' }}>Mostrando {semLoja.length} de {semLojaTotal}.</p>
            )}
          </div>
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => !salvando && setAberto(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-6 max-h-[92vh] overflow-y-auto"
            style={{ background: 'linear-gradient(127deg, rgba(6,11,40,0.98) 19%, rgba(10,14,35,0.95) 77%)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{editId ? 'Editar PDV' : 'Novo PDV'}</h2>
              <button onClick={() => setAberto(false)} className="p-1.5 rounded-lg" style={{ color: '#A0AEC0' }}><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <Campo label="Nome do PDV *"><input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Loja Tatuapé" className={cls} style={input} /></Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Tipo">
                  <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={cls} style={input}>
                    <option value="loja" style={{ color: '#000' }}>Loja (PDV físico)</option>
                    <option value="estoque" style={{ color: '#000' }}>Estoque / Mostruário</option>
                  </select>
                </Campo>
                <Campo label="Classificação de visita">
                  <select value={form.prioridade} onChange={e => set('prioridade', e.target.value)} className={cls} style={input}>
                    <option value="" style={{ color: '#000' }}>Sem classificação</option>
                    <option value="1" style={{ color: '#000' }}>P1 VIP</option>
                    <option value="2" style={{ color: '#000' }}>P2 Ouro</option>
                    <option value="3" style={{ color: '#000' }}>P3 Prata</option>
                    <option value="4" style={{ color: '#000' }}>P4 Bronze</option>
                  </select>
                </Campo>
              </div>

              <Campo label="Código(s) da OC — separados por vírgula">
                <input value={form.apelidos} onChange={e => set('apelidos', e.target.value)} placeholder="Ex.: TP, TATUAPE" className={cls} style={input} />
              </Campo>

              <Campo label="Endereço"><input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número" className={cls} style={input} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Bairro"><input value={form.bairro} onChange={e => set('bairro', e.target.value)} className={cls} style={input} /></Campo>
                <Campo label="CEP"><input value={form.cep} onChange={e => set('cep', e.target.value)} className={cls} style={input} /></Campo>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Campo label="Cidade"><input value={form.cidade} onChange={e => set('cidade', e.target.value)} className={cls} style={input} /></Campo></div>
                <Campo label="UF"><input value={form.uf} maxLength={2} onChange={e => set('uf', e.target.value)} className={cls} style={input} /></Campo>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="WhatsApp"><input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={cls} style={input} /></Campo>
                <Campo label="Responsável"><input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} className={cls} style={input} /></Campo>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#A0AEC0' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} /> PDV ativo
              </label>
            </div>

            {erro && <p className="text-xs mt-3" style={{ color: '#FC8181' }}>{erro}</p>}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setAberto(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const cls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50'
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: '#A0AEC0' }}>{label}</label>
      {children}
    </div>
  )
}
