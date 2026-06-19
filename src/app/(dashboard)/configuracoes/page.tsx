'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Settings, Save, CheckCircle, AlertTriangle, Calendar, MapPin, Users,
  User, Star, MessageCircle, Upload, Trash2, Plus, Bell, BellOff,
  RefreshCw, Building2, Phone, Hash, RotateCcw, UserCog, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useSpecialDates } from '@/hooks/useSpecialDates'
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals'
import { useTeamMembers, useTeamMembersMutations, type TeamMember, type TeamMemberUpdate } from '@/hooks/useTeamMembers'

// ── shared styles ──────────────────────────────────────────────
const card = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const inputCls = 'w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all'
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
const inputFocusStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,117,255,0.5)' }

type Tab = 'perfil' | 'datas' | 'metas' | 'whatsapp' | 'sistema' | 'equipe'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',   label: 'Perfil',          icon: User          },
  { id: 'datas',    label: 'Datas Especiais',  icon: Star          },
  { id: 'metas',    label: 'Metas',            icon: Hash          },
  { id: 'whatsapp', label: 'WhatsApp',         icon: MessageCircle },
  { id: 'sistema',  label: 'Sistema',          icon: Settings      },
  { id: 'equipe',   label: 'Equipe',           icon: UserCog       },
]

const PRIORITY_CONFIG = [
  { key: 1, label: 'Prioridade 1', desc: 'Clientes VIP',         color: '#0075FF', bg: 'rgba(0,117,255,0.12)',   border: 'rgba(0,117,255,0.25)'   },
  { key: 2, label: 'Prioridade 2', desc: 'Clientes ativos',      color: '#01B574', bg: 'rgba(1,181,116,0.12)',   border: 'rgba(1,181,116,0.25)'   },
  { key: 3, label: 'Prioridade 3', desc: 'Em desenvolvimento',   color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  border: 'rgba(246,173,85,0.25)'  },
  { key: 4, label: 'Prioridade 4', desc: 'Baixa frequência',     color: '#A0AEC0', bg: 'rgba(160,174,192,0.12)', border: 'rgba(160,174,192,0.2)'  },
]

type VisitDays = {
  visit_sun: boolean; visit_mon: boolean; visit_tue: boolean; visit_wed: boolean
  visit_thu: boolean; visit_fri: boolean; visit_sat: boolean
}
const WEEK_DAYS: { key: keyof VisitDays; label: string; short: string }[] = [
  { key: 'visit_sun', label: 'Domingo',  short: 'D' }, { key: 'visit_mon', label: 'Segunda', short: 'S' },
  { key: 'visit_tue', label: 'Terça',    short: 'T' }, { key: 'visit_wed', label: 'Quarta',  short: 'Q' },
  { key: 'visit_thu', label: 'Quinta',   short: 'Q' }, { key: 'visit_fri', label: 'Sexta',   short: 'S' },
  { key: 'visit_sat', label: 'Sábado',   short: 'S' },
]

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      className={inputCls}
      style={focused ? inputFocusStyle : inputStyle}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function ImageUpload({ label, hint, value, onUpload }: {
  label: string; hint: string; value: string | null; onUpload: (f: File) => Promise<void>
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await onUpload(file) } finally { setUploading(false) }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-white mb-1">{label}</p>
      <p className="text-xs mb-3" style={{ color: '#A0AEC0' }}>{hint}</p>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {value ? <img src={value} alt={label} className="w-full h-full object-cover" /> : <Upload size={20} style={{ color: '#56577A' }} />}
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => ref.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(0,117,255,0.15)', border: '1px solid rgba(0,117,255,0.3)', color: '#0075FF' }}>
            <Upload size={14} />{uploading ? 'Enviando...' : 'Escolher arquivo'}
          </button>
          <p className="text-xs" style={{ color: '#56577A' }}>JPG, PNG ou WebP · máx 5MB</p>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handle} />
    </div>
  )
}

function Feedback({ erro, sucesso }: { erro: string; sucesso: boolean }) {
  if (erro) return (
    <div className="flex items-center gap-2 rounded-xl px-4 py-3"
      style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
      <AlertTriangle size={15} style={{ color: '#FC8181' }} />
      <p className="text-sm" style={{ color: '#FC8181' }}>{erro}</p>
    </div>
  )
  if (sucesso) return (
    <div className="flex items-center gap-2 rounded-xl px-4 py-3"
      style={{ background: 'rgba(1,181,116,0.1)', border: '1px solid rgba(1,181,116,0.25)' }}>
      <CheckCircle size={15} style={{ color: '#01B574' }} />
      <p className="text-sm" style={{ color: '#01B574' }}>Salvo com sucesso!</p>
    </div>
  )
  return null
}

function SaveBtn({ saving, disabled, onClick, label = 'Salvar' }: { saving: boolean; disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={saving || disabled}
      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
      <Save size={15} />{saving ? 'Salvando...' : label}
    </button>
  )
}

// ── ABA PERFIL ─────────────────────────────────────────────────
function TabPerfil() {
  const { profile, loading, salvar, uploadFile } = useUserProfile()
  const [form, setForm] = useState({ full_name: '', display_name: '', area: '', cnpj: '', phone: '', address: '', city: '', state: '', cep: '' })
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? '', display_name: profile.display_name ?? '',
      area: profile.area ?? '', cnpj: profile.cnpj ?? '', phone: profile.phone ?? '',
      address: profile.address ?? '', city: profile.city ?? '', state: profile.state ?? '', cep: profile.cep ?? '',
    })
  }, [profile])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSalvar() {
    setSaving(true); setErro(''); setSucesso(false)
    try { await salvar(form); setSucesso(true); setTimeout(() => setSucesso(false), 3000) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  function handleUpload(type: 'photo' | 'logo') {
    return async (file: File) => {
      try {
        const url = await uploadFile(file, type)
        await salvar({ [type === 'photo' ? 'photo_url' : 'logo_url']: url })
      } catch (e) { setErro(e instanceof Error ? e.message : 'Erro no upload') }
    }
  }

  if (loading) return <p className="text-sm" style={{ color: '#A0AEC0' }}>Carregando...</p>

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-5"><Upload size={16} style={{ color: '#9F7AEA' }} /><h2 className="font-bold text-white text-base">Foto e Logo</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ImageUpload label="Foto de Perfil" hint="Aparece nas boas-vindas e no seu perfil" value={profile?.photo_url ?? null} onUpload={handleUpload('photo')} />
          <ImageUpload label="Logo do Escritório" hint="Aparece como timbre nos orçamentos gerados" value={profile?.logo_url ?? null} onUpload={handleUpload('logo')} />
        </div>
      </section>

      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-5"><User size={16} style={{ color: '#0075FF' }} /><h2 className="font-bold text-white text-base">Dados Pessoais</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { k: 'full_name',     label: 'Nome Completo',          placeholder: 'Seu nome completo' },
            { k: 'display_name',  label: 'Como a AIVA te chama',   placeholder: 'Ex: Glauco' },
            { k: 'area',          label: 'Área de Atuação',        placeholder: 'Ex: Ubá - MG' },
            { k: 'cnpj',          label: 'CNPJ',                   placeholder: '00.000.000/0000-00' },
            { k: 'phone',         label: 'Telefone',               placeholder: '(00) 00000-0000' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>{label}</label>
              <FocusInput placeholder={placeholder} value={form[k as keyof typeof form]} onChange={set(k)} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-5"><Building2 size={16} style={{ color: '#01B574' }} /><h2 className="font-bold text-white text-base">Endereço</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>Endereço</label>
            <FocusInput placeholder="Rua, número, complemento" value={form.address} onChange={set('address')} />
          </div>
          {[
            { k: 'city', label: 'Cidade', placeholder: 'Cidade' },
            { k: 'state', label: 'Estado', placeholder: 'UF' },
            { k: 'cep', label: 'CEP', placeholder: '00000-000' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>{label}</label>
              <FocusInput placeholder={placeholder} value={form[k as keyof typeof form]} onChange={set(k)} />
            </div>
          ))}
        </div>
      </section>

      <Feedback erro={erro} sucesso={sucesso} />
      <SaveBtn saving={saving} onClick={handleSalvar} label="Salvar perfil" />
    </div>
  )
}

// ── ABA DATAS ESPECIAIS ────────────────────────────────────────
function TabDatas() {
  const { dates, loading, adicionar, remover } = useSpecialDates()
  const [form, setForm] = useState({ title: '', date: '', recurring: false, notify_whatsapp: true, notes: '' })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function handleAdd() {
    if (!form.title || !form.date) { setErro('Título e data são obrigatórios.'); return }
    setSaving(true); setErro('')
    try {
      await adicionar({ title: form.title, date: form.date, recurring: form.recurring, notify_whatsapp: form.notify_whatsapp, notes: form.notes || null })
      setForm({ title: '', date: '', recurring: false, notify_whatsapp: true, notes: '' })
      setAdding(false)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  function formatDate(d: string) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }

  if (loading) return <p className="text-sm" style={{ color: '#A0AEC0' }}>Carregando...</p>

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2"><Star size={16} style={{ color: '#F6AD55' }} /><h2 className="font-bold text-white text-base">Datas Especiais</h2></div>
          <button onClick={() => setAdding(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
            style={{ background: 'rgba(0,117,255,0.15)', border: '1px solid rgba(0,117,255,0.3)', color: '#0075FF' }}>
            <Plus size={14} />Nova data
          </button>
        </div>

        {adding && (
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>Título</label>
                <FocusInput placeholder="Ex: Aniversário do cliente João" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>Data</label>
                <FocusInput type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>Observação (opcional)</label>
                <FocusInput placeholder="Detalhes adicionais" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.recurring} onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))} className="rounded" />
                <span className="text-sm" style={{ color: '#A0AEC0' }}>Repetir todo ano</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notify_whatsapp} onChange={e => setForm(p => ({ ...p, notify_whatsapp: e.target.checked }))} className="rounded" />
                <span className="text-sm" style={{ color: '#A0AEC0' }}>Notificar no WhatsApp</span>
              </label>
            </div>
            {erro && <p className="text-xs" style={{ color: '#FC8181' }}>{erro}</p>}
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#fff' }}>
                <Save size={13} />{saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#A0AEC0' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {dates.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#56577A' }}>
            <Star size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma data especial cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dates.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: 'rgba(246,173,85,0.12)', border: '1px solid rgba(246,173,85,0.25)' }}>⭐</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{d.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs" style={{ color: '#A0AEC0' }}>{formatDate(d.date)}</p>
                    {d.recurring && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(159,122,234,0.15)', color: '#9F7AEA' }}>Todo ano</span>}
                    {d.notify_whatsapp ? <Bell size={11} style={{ color: '#01B574' }} /> : <BellOff size={11} style={{ color: '#56577A' }} />}
                  </div>
                  {d.notes && <p className="text-xs mt-0.5 truncate" style={{ color: '#56577A' }}>{d.notes}</p>}
                </div>
                <button onClick={() => remover(d.id)} className="p-2 rounded-lg hover:opacity-80 flex-shrink-0" style={{ color: '#56577A' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── ABA METAS ──────────────────────────────────────────────────
function TabMetas() {
  const now = new Date()
  const [selYear, setSelYear]   = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const { goal, loading, salvar } = useMonthlyGoals(selYear, selMonth)
  const [form, setForm]   = useState({ orders_goal: 0, visits_goal: 0, revenue_goal: 0 })
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  useEffect(() => {
    setForm({ orders_goal: goal?.orders_goal ?? 0, visits_goal: goal?.visits_goal ?? 0, revenue_goal: goal?.revenue_goal ?? 0 })
  }, [goal])

  async function handleSalvar() {
    setSaving(true); setErro(''); setSucesso(false)
    try { await salvar(form); setSucesso(true); setTimeout(() => setSucesso(false), 3000) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-5"><Hash size={16} style={{ color: '#01B574' }} /><h2 className="font-bold text-white text-base">Metas Mensais</h2></div>
        <div className="flex gap-3 mb-6">
          <select value={selMonth} onChange={e => setSelMonth(+e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1} style={{ background: '#0f123b' }}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e => setSelYear(+e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {years.map(y => <option key={y} value={y} style={{ background: '#0f123b' }}>{y}</option>)}
          </select>
        </div>

        {loading ? <p className="text-sm" style={{ color: '#A0AEC0' }}>Carregando...</p> : (
          <div className="space-y-4">
            {[
              { key: 'orders_goal',  label: 'Meta de Pedidos', suffix: 'pedidos', color: '#0075FF', icon: '📦', prefix: false },
              { key: 'visits_goal',  label: 'Meta de Visitas', suffix: 'visitas', color: '#9F7AEA', icon: '🗺️', prefix: false },
              { key: 'revenue_goal', label: 'Meta de Receita', suffix: 'R$',      color: '#01B574', icon: '💰', prefix: true  },
            ].map(({ key, label, suffix, color, icon, prefix }) => (
              <div key={key} className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs" style={{ color: '#A0AEC0' }}>para {MONTHS[selMonth - 1]} de {selYear}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {prefix && <span className="text-sm font-semibold" style={{ color }}>{suffix}</span>}
                  <input type="number" min={0}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-24 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color }}
                  />
                  {!prefix && <span className="text-sm font-medium" style={{ color: '#A0AEC0' }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Feedback erro={erro} sucesso={sucesso} />
      <SaveBtn saving={saving} disabled={loading} onClick={handleSalvar} label="Salvar metas" />
    </div>
  )
}

// ── ABA WHATSAPP ───────────────────────────────────────────────
function TabWhatsApp() {
  const { profile, loading, salvar } = useUserProfile()
  const [number, setNumber] = useState('')
  const [notif, setNotif]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro]     = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (profile) {
      setNumber(profile.whatsapp_number ?? '')
      setNotif(profile.whatsapp_notifications)
      setConnected(!!profile.evolution_instance_id)
    }
  }, [profile])

  async function handleSalvar() {
    setSaving(true); setErro(''); setSucesso(false)
    try { await salvar({ whatsapp_number: number, whatsapp_notifications: notif }); setSucesso(true); setTimeout(() => setSucesso(false), 3000) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Erro') }
    finally { setSaving(false) }
  }

  async function handleConectar() {
    if (!number) { setErro('Informe o número do WhatsApp primeiro.'); return }
    setQrLoading(true); setErro(''); setQrCode(null)
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: number }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar QR Code')
      setQrCode(json.qrCode)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao conectar') }
    finally { setQrLoading(false) }
  }

  if (loading) return <p className="text-sm" style={{ color: '#A0AEC0' }}>Carregando...</p>

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-5"><Phone size={16} style={{ color: '#25D366' }} /><h2 className="font-bold text-white text-base">Número do WhatsApp</h2></div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>Número com DDI e DDD</label>
            <FocusInput placeholder="Ex: 5531999999999" value={number} onChange={e => setNumber(e.target.value)} />
            <p className="text-xs mt-1.5" style={{ color: '#56577A' }}>Formato: 55 + DDD + número (sem espaços ou traços)</p>
          </div>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setNotif(v => !v)}>
            <div className="w-11 h-6 rounded-full relative flex-shrink-0 transition-all" style={{ background: notif ? '#01B574' : 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: notif ? '24px' : '4px' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Receber notificações</p>
              <p className="text-xs" style={{ color: '#A0AEC0' }}>Lembretes de datas especiais e relatório mensal</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2"><MessageCircle size={16} style={{ color: '#25D366' }} /><h2 className="font-bold text-white text-base">Conexão WhatsApp</h2></div>
          {connected && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.3)', color: '#01B574' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Conectado
            </span>
          )}
        </div>

        {qrCode ? (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: '#A0AEC0' }}>Abra o WhatsApp → <strong>Dispositivos Conectados</strong> → <strong>Conectar dispositivo</strong> e escaneie:</p>
            <div className="inline-block p-4 rounded-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
            </div>
            <button onClick={() => setQrCode(null)} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#A0AEC0' }}>
              <RotateCcw size={13} />Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#A0AEC0' }}>
              Conecte seu WhatsApp para receber lembretes de datas importantes e o relatório mensal diretamente na sua conversa com a AIVA.
            </p>
            <button onClick={handleConectar} disabled={qrLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ background: '#25D366', color: '#fff' }}>
              {qrLoading ? <RefreshCw size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              {qrLoading ? 'Gerando QR Code...' : connected ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
            </button>
            {connected && <p className="text-xs" style={{ color: '#56577A' }}>Relatório enviado todo dia 1º · Lembretes 1 dia antes das datas especiais</p>}
          </div>
        )}
      </section>

      <Feedback erro={erro} sucesso={sucesso} />
      <SaveBtn saving={saving} onClick={handleSalvar} label="Salvar configurações" />
    </div>
  )
}

// ── ABA SISTEMA ────────────────────────────────────────────────
function TabSistema() {
  const { settings, loading, salvar } = useSystemSettings()
  const [days, setDays]         = useState({ p1: 15, p2: 30, p3: 45, p4: 60 })
  const [perDay, setPerDay]     = useState(5)
  const [visitDays, setVisitDays] = useState<VisitDays>({ visit_sun: false, visit_mon: true, visit_tue: true, visit_wed: true, visit_thu: true, visit_fri: true, visit_sat: false })
  const [saving, setSaving]     = useState(false)
  const [sucesso, setSucesso]   = useState(false)
  const [erro, setErro]         = useState('')

  useEffect(() => {
    if (!loading) {
      setDays({ p1: settings.priority_1_days, p2: settings.priority_2_days, p3: settings.priority_3_days, p4: settings.priority_4_days })
      setPerDay(settings.clients_per_day)
      setVisitDays({ visit_sun: settings.visit_sun, visit_mon: settings.visit_mon, visit_tue: settings.visit_tue, visit_wed: settings.visit_wed, visit_thu: settings.visit_thu, visit_fri: settings.visit_fri, visit_sat: settings.visit_sat })
    }
  }, [loading, settings])

  const activeDays = WEEK_DAYS.filter(d => visitDays[d.key]).length
  const daysMap    = [days.p1, days.p2, days.p3, days.p4]
  const setDay     = (i: number, v: number) => setDays(prev => ({ ...prev, [(['p1','p2','p3','p4'] as const)[i]]: v }))
  function toggleDay(key: keyof VisitDays) { setVisitDays(prev => ({ ...prev, [key]: !prev[key] })) }

  async function handleSalvar() {
    if (activeDays === 0) { setErro('Selecione pelo menos um dia de visita.'); return }
    setSaving(true); setErro(''); setSucesso(false)
    try {
      await salvar({ priority_1_days: days.p1, priority_2_days: days.p2, priority_3_days: days.p3, priority_4_days: days.p4, clients_per_day: perDay, ...visitDays })
      setSucesso(true); setTimeout(() => setSucesso(false), 3000)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-1"><Calendar size={16} style={{ color: '#9F7AEA' }} /><h2 className="font-bold text-white text-base">Dias de Visita</h2></div>
        <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>Dias da semana em que você realiza visitas a clientes.</p>
        <div className="flex gap-2 flex-wrap">
          {WEEK_DAYS.map(d => {
            const active = !!visitDays[d.key]
            return (
              <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                className="flex flex-col items-center gap-1 w-[calc(14.28%-8px)] min-w-[52px] py-3 rounded-xl font-semibold transition-all"
                style={active ? { background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#ffffff', boxShadow: '0 4px 16px rgba(0,117,255,0.35)' } : { background: 'rgba(255,255,255,0.05)', color: '#56577A', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-base font-semibold">{d.short}</span>
                <span className="text-xs font-medium hidden sm:block" style={{ color: active ? 'rgba(255,255,255,0.8)' : '#56577A' }}>{d.label.slice(0, 3)}</span>
              </button>
            )
          })}
        </div>
        {activeDays > 0 && <p className="text-xs mt-4" style={{ color: '#A0AEC0' }}><span className="font-semibold text-white">{activeDays} dias</span> · capacidade de <span className="font-semibold text-white">{activeDays * perDay} visitas/semana</span></p>}
        {activeDays === 0 && <div className="flex items-center gap-2 mt-4 rounded-xl px-3 py-2.5" style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}><AlertTriangle size={13} style={{ color: '#FC8181' }} /><p className="text-xs" style={{ color: '#FC8181' }}>Selecione pelo menos um dia.</p></div>}
      </section>

      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-1"><MapPin size={16} style={{ color: '#0075FF' }} /><h2 className="font-bold text-white text-base">Prioridades de Visita</h2></div>
        <p className="text-sm mb-6" style={{ color: '#A0AEC0' }}>Intervalo em dias entre visitas por prioridade.</p>
        <div className="space-y-3">
          {PRIORITY_CONFIG.map((p, i) => (
            <div key={p.key} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ background: p.bg, border: `1px solid ${p.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold" style={{ background: p.color, color: '#ffffff' }}>P{p.key}</div>
              <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-white">{p.label}</p><p className="text-xs" style={{ color: '#A0AEC0' }}>{p.desc}</p></div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>a cada</p>
                <input type="number" min={1} max={365} value={daysMap[i]} onChange={e => setDay(i, parseInt(e.target.value) || 1)}
                  className="input-dark w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold" style={{ color: p.color }} />
                <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>dias</p>
              </div>
            </div>
          ))}
        </div>
        {(days.p1 >= days.p2 || days.p2 >= days.p3 || days.p3 >= days.p4) && (
          <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#FC8181' }} />
            <p className="text-xs" style={{ color: '#FC8181' }}>P1 deve ter menos dias que P2, P2 menos que P3 e assim por diante.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-1"><Users size={16} style={{ color: '#01B574' }} /><h2 className="font-bold text-white text-base">Capacidade de Visitas</h2></div>
        <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>Máximo de clientes por dia de visita.</p>
        <div className="flex items-center gap-4">
          <div className="flex-1"><p className="font-semibold text-sm text-white">Visitas por dia</p></div>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={50} value={perDay} onChange={e => setPerDay(parseInt(e.target.value) || 1)}
              className="input-dark w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold" style={{ color: '#01B574' }} />
            <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>por dia</p>
          </div>
        </div>
      </section>

      <Feedback erro={erro} sucesso={sucesso} />
      <SaveBtn saving={saving} disabled={loading} onClick={handleSalvar} label="Salvar configurações" />
    </div>
  )
}

// ── ABA EQUIPE ─────────────────────────────────────────────────
const MODULES: { key: keyof TeamMemberUpdate; label: string }[] = [
  { key: 'perm_clientes',     label: 'Clientes'       },
  { key: 'perm_orcamentos',   label: 'Orçamentos'     },
  { key: 'perm_pedidos',      label: 'Pedidos'        },
  { key: 'perm_comissoes',    label: 'Comissões'      },
  { key: 'perm_visitas',      label: 'Visitas'        },
  { key: 'perm_fornecedores', label: 'Fornecedores'   },
  { key: 'perm_assistencia',  label: 'Assist. Técnica'},
  { key: 'perm_relatorios',   label: 'Relatórios'     },
]

function MemberCard({ member, onSaved }: { member: TeamMember; onSaved: () => void }) {
  const { atualizar, remover } = useTeamMembersMutations()
  const [perms, setPerms] = useState<TeamMemberUpdate>({
    active:            member.active,
    perm_clientes:     member.perm_clientes,
    perm_orcamentos:   member.perm_orcamentos,
    perm_pedidos:      member.perm_pedidos,
    perm_comissoes:    member.perm_comissoes,
    perm_visitas:      member.perm_visitas,
    perm_fornecedores: member.perm_fornecedores,
    perm_assistencia:  member.perm_assistencia,
    perm_relatorios:   member.perm_relatorios,
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [erro,   setErro]   = useState('')

  function toggle(key: keyof TeamMemberUpdate) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  async function handleSalvar() {
    setSaving(true); setErro('')
    try {
      await atualizar(member.id, perms)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleRemover() {
    if (!confirm(`Remover ${member.name} da equipe?`)) return
    await remover(member.id)
    onSaved()
  }

  const initials = member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="rounded-2xl p-5 space-y-4" style={card}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4318FF 0%, #0075FF 100%)' }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm">{member.name}</p>
              <button onClick={() => toggle('active')} className="transition-all"
                title={perms.active ? 'Desativar' : 'Ativar'}>
                {perms.active
                  ? <ToggleRight size={20} style={{ color: '#01B574' }} />
                  : <ToggleLeft  size={20} style={{ color: '#56577A' }} />}
              </button>
            </div>
            <p className="text-xs" style={{ color: '#56577A' }}>{member.email}</p>
          </div>
        </div>
        <button onClick={handleRemover} className="p-1.5 rounded-lg transition-all"
          style={{ color: '#56577A' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FC8181')}
          onMouseLeave={e => (e.currentTarget.style.color = '#56577A')}>
          <Trash2 size={14} />
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#56577A' }}>
          Módulos com acesso
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODULES.map(mod => {
            const on = !!perms[mod.key]
            return (
              <button key={mod.key} onClick={() => toggle(mod.key)} disabled={!perms.active}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                style={on ? { background: 'rgba(0,117,255,0.12)', border: '1px solid rgba(0,117,255,0.3)', color: '#0075FF' }
                           : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#56577A' }}>
                <span>{mod.label}</span>
                <span className="font-bold">{on ? '✓' : '—'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {erro && <p className="text-xs" style={{ color: '#FC8181' }}>⚠ {erro}</p>}
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="flex items-center gap-1 text-xs" style={{ color: '#01B574' }}><CheckCircle size={12} /> Salvo</span>}
        <button onClick={handleSalvar} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
          <Save size={11} />{saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const { adicionar } = useTeamMembersMutations()
  const [form, setForm] = useState({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setErro('Nome e e-mail são obrigatórios'); return }
    setSaving(true); setErro('')
    try {
      await adicionar(form)
      setForm({ name: '', email: '' })
      onAdded()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(0,117,255,0.05)', border: '1px solid rgba(0,117,255,0.15)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#0075FF' }}>Adicionar usuário</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Nome" className="input-dark w-full px-3 py-2 rounded-xl text-sm" />
        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          placeholder="E-mail" className="input-dark w-full px-3 py-2 rounded-xl text-sm" />
      </div>
      {erro && <p className="text-xs" style={{ color: '#FC8181' }}>⚠ {erro}</p>}
      <button type="submit" disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
        <Plus size={11} />{saving ? 'Adicionando...' : 'Adicionar'}
      </button>
    </form>
  )
}

function TabEquipe() {
  const { members, loading, refetch } = useTeamMembers()

  if (loading) return <p className="text-sm" style={{ color: '#A0AEC0' }}>Carregando...</p>

  return (
    <div className="space-y-4">
      <section className="rounded-2xl p-6" style={card}>
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} style={{ color: '#9F7AEA' }} />
          <h2 className="font-bold text-white text-base">Gerenciar Equipe</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
          Adicione usuários e defina quais módulos cada um pode acessar.
        </p>
        <AddMemberForm onAdded={refetch} />
      </section>
      {members.length === 0
        ? <p className="text-sm text-center py-6" style={{ color: '#56577A' }}>Nenhum membro na equipe ainda.</p>
        : members.map(m => <MemberCard key={m.id} member={m} onSaved={refetch} />)
      }
    </div>
  )
}

// ── PAGE ───────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('perfil')

  return (
    <div className="max-w-3xl w-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,117,255,0.12)' }}>
          <Settings size={22} style={{ color: '#0075FF' }} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">CONFIGURAÇÕES</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Perfil, datas, metas, preferências e equipe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={tab === id ? { background: 'linear-gradient(135deg, rgba(0,117,255,0.3) 0%, rgba(67,24,255,0.3) 100%)', color: '#fff', border: '1px solid rgba(0,117,255,0.3)' } : { color: '#56577A' }}>
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'perfil'   && <TabPerfil />}
      {tab === 'datas'    && <TabDatas />}
      {tab === 'metas'    && <TabMetas />}
      {tab === 'whatsapp' && <TabWhatsApp />}
      {tab === 'sistema'  && <TabSistema />}
      {tab === 'equipe'   && <TabEquipe />}
    </div>
  )
}
