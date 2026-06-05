'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, AlertTriangle, Calendar, MapPin, Users, UserCog, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useTeamMembers, useTeamMembersMutations, type TeamMember, type TeamMemberUpdate } from '@/hooks/useTeamMembers'

type VisitDays = {
  visit_sun: boolean; visit_mon: boolean; visit_tue: boolean
  visit_wed: boolean; visit_thu: boolean; visit_fri: boolean; visit_sat: boolean
}

const PRIORITY_CONFIG = [
  { key: 1, label: 'P1 VIP',    desc: 'Visita mais frequente',  color: '#0075FF', bg: 'rgba(0,117,255,0.12)',   border: 'rgba(0,117,255,0.25)'   },
  { key: 2, label: 'P2 Ouro',   desc: 'Cadência regular',       color: '#01B574', bg: 'rgba(1,181,116,0.12)',   border: 'rgba(1,181,116,0.25)'   },
  { key: 3, label: 'P3 Prata',  desc: 'Em desenvolvimento',     color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  border: 'rgba(246,173,85,0.25)'  },
  { key: 4, label: 'P4 Bronze', desc: 'Baixa frequência',       color: '#A0AEC0', bg: 'rgba(160,174,192,0.12)', border: 'rgba(160,174,192,0.2)'  },
]

const WEEK_DAYS: { key: keyof VisitDays; label: string; short: string }[] = [
  { key: 'visit_sun', label: 'Domingo',  short: 'D' },
  { key: 'visit_mon', label: 'Segunda',  short: 'S' },
  { key: 'visit_tue', label: 'Terça',    short: 'T' },
  { key: 'visit_wed', label: 'Quarta',   short: 'Q' },
  { key: 'visit_thu', label: 'Quinta',   short: 'Q' },
  { key: 'visit_fri', label: 'Sexta',    short: 'S' },
  { key: 'visit_sat', label: 'Sábado',   short: 'S' },
]

const MODULES: { key: keyof TeamMemberUpdate; label: string }[] = [
  { key: 'perm_clientes',     label: 'Clientes' },
  { key: 'perm_catalogo',     label: 'Catálogo' },
  { key: 'perm_orcamentos',   label: 'Orçamentos' },
  { key: 'perm_pedidos',      label: 'Pedidos' },
  { key: 'perm_comissoes',    label: 'Comissões' },
  { key: 'perm_visitas',      label: 'Visitas' },
  { key: 'perm_fornecedores', label: 'Fornecedores' },
  { key: 'perm_assistencia',  label: 'Assist. Técnica' },
  { key: 'perm_relatorios',   label: 'Relatórios' },
]

function MemberCard({ member, onSaved }: { member: TeamMember; onSaved: () => void }) {
  const { atualizar, remover } = useTeamMembersMutations()
  const [perms, setPerms] = useState<TeamMemberUpdate>({
    active:            member.active,
    perm_clientes:     member.perm_clientes,
    perm_catalogo:     member.perm_catalogo,
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
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Header do usuário */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4318FF 0%, #0075FF 100%)' }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm">{member.name}</p>
              <button
                onClick={() => toggle('active')}
                className="transition-all"
                title={perms.active ? 'Desativar usuário' : 'Ativar usuário'}
              >
                {perms.active
                  ? <ToggleRight size={20} style={{ color: '#01B574' }} />
                  : <ToggleLeft  size={20} style={{ color: '#56577A' }} />}
              </button>
            </div>
            <p className="text-xs" style={{ color: '#56577A' }}>{member.email}</p>
          </div>
        </div>
        <button onClick={handleRemover}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: '#56577A' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FC8181')}
          onMouseLeave={e => (e.currentTarget.style.color = '#56577A')}
          title="Remover usuário">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Permissões */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#56577A' }}>
          Módulos com acesso
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MODULES.map(mod => {
            const on = !!perms[mod.key]
            return (
              <button
                key={mod.key}
                onClick={() => toggle(mod.key)}
                disabled={!perms.active}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                style={on ? {
                  background: 'rgba(0,117,255,0.12)',
                  border: '1px solid rgba(0,117,255,0.3)',
                  color: '#0075FF',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#56577A',
                }}
              >
                <span>{mod.label}</span>
                <span className="font-bold">{on ? '✓' : '—'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Ações */}
      {erro && <p className="text-xs" style={{ color: '#FC8181' }}>⚠ {erro}</p>}
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#01B574' }}>
            <CheckCircle size={12} /> Salvo
          </span>
        )}
        <button
          onClick={handleSalvar}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
          <Save size={11} />
          {saving ? 'Salvando...' : 'Salvar'}
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

  async function handleSubmit(e: React.FormEvent) {
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
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#0075FF' }}>
        Adicionar usuário
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Nome"
          className="input-dark w-full px-3 py-2 rounded-xl text-sm"
        />
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          placeholder="E-mail"
          className="input-dark w-full px-3 py-2 rounded-xl text-sm"
        />
      </div>
      {erro && <p className="text-xs" style={{ color: '#FC8181' }}>⚠ {erro}</p>}
      <button type="submit" disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
        <Plus size={11} />
        {saving ? 'Adicionando...' : 'Adicionar'}
      </button>
    </form>
  )
}

const cardStyle = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function ConfiguracoesPage() {
  const { settings, loading, salvar } = useSystemSettings()
  const { members, loading: loadingMembers, refetch: refetchMembers } = useTeamMembers()
  const [showAddMember, setShowAddMember] = useState(false)

  const [days,       setDays]     = useState({ p1: 15, p2: 30, p3: 45, p4: 60 })
  const [perDay,     setPerDay]   = useState(5)
  const [visitDays, setVisitDays] = useState<VisitDays>({
    visit_sun: false, visit_mon: true, visit_tue: true,
    visit_wed: true,  visit_thu: true, visit_fri: true, visit_sat: false,
  })
  const [area,       setArea]     = useState('')
  const [savingArea, setSavingArea] = useState(false)
  const [areaOk,     setAreaOk]   = useState(false)
  const [saving,     setSaving]   = useState(false)
  const [sucesso,    setSucesso]  = useState(false)
  const [erro,       setErro]     = useState('')

  useEffect(() => {
    if (!loading) {
      setDays({
        p1: settings.priority_1_days,
        p2: settings.priority_2_days,
        p3: settings.priority_3_days,
        p4: settings.priority_4_days,
      })
      setPerDay(settings.clients_per_day)
      setVisitDays({
        visit_sun: settings.visit_sun,
        visit_mon: settings.visit_mon,
        visit_tue: settings.visit_tue,
        visit_wed: settings.visit_wed,
        visit_thu: settings.visit_thu,
        visit_fri: settings.visit_fri,
        visit_sat: settings.visit_sat,
      })
      setArea(settings.area_atuacao ?? '')
    }
  }, [loading, settings])

  async function handleSalvarArea() {
    setSavingArea(true)
    try {
      await salvar({ area_atuacao: area.trim() || null })
      setAreaOk(true)
      setTimeout(() => setAreaOk(false), 3000)
    } catch {
      // silently ignore
    } finally {
      setSavingArea(false)
    }
  }

  const activeDays = WEEK_DAYS.filter(d => visitDays[d.key]).length

  async function handleSalvar() {
    if (activeDays === 0) {
      setErro('Selecione pelo menos um dia de visita.')
      return
    }
    setSaving(true); setErro(''); setSucesso(false)
    try {
      await salvar({
        priority_1_days: days.p1,
        priority_2_days: days.p2,
        priority_3_days: days.p3,
        priority_4_days: days.p4,
        clients_per_day: perDay,
        ...visitDays,
      })
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const daysMap = [days.p1, days.p2, days.p3, days.p4]
  const setDay  = (i: number, v: number) =>
    setDays(prev => ({ ...prev, [(['p1','p2','p3','p4'] as const)[i]]: v }))

  function toggleDay(key: keyof VisitDays) {
    setVisitDays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,117,255,0.12)' }}>
          <Settings size={22} style={{ color: '#0075FF' }} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Configurações</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Preferências do sistema de representação</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Área de Atuação */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} style={{ color: '#A78BFA' }} />
            <h2 className="font-bold text-white text-base">Área de Atuação</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Informe a cidade ou região onde você atua. A AIRA usará essa informação para trazer clima e contexto personalizado na tela inicial.
          </p>
          <div className="flex gap-3">
            <input
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="ex: São Paulo, SP · Zona Sul de SP · Grande ABC"
              className="input-dark flex-1 px-3 py-2.5 rounded-xl text-sm"
            />
            <button
              onClick={handleSalvarArea}
              disabled={savingArea}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #0075FF 100%)' }}
            >
              {savingArea ? 'Salvando…' : areaOk ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar</>}
            </button>
          </div>
        </section>

        {/* Dias de visita */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} style={{ color: '#9F7AEA' }} />
            <h2 className="font-bold text-white text-base">Dias de Visita</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Selecione os dias da semana em que você realiza visitas a clientes.
            O sistema usará esses dias para calcular a próxima visita de cada prioridade.
          </p>

          <div className="flex gap-2 flex-wrap">
            {WEEK_DAYS.map(d => {
              const active = !!visitDays[d.key]
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className="flex flex-col items-center gap-1 w-[calc(14.28%-8px)] min-w-[52px] py-3 rounded-xl font-semibold transition-all"
                  style={active ? {
                    background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(0,117,255,0.35)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    color: '#56577A',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-base font-semibold">{d.short}</span>
                  <span className="text-xs font-medium hidden sm:block"
                    style={{ color: active ? 'rgba(255,255,255,0.8)' : '#56577A' }}>
                    {d.label.slice(0, 3)}
                  </span>
                </button>
              )
            })}
          </div>

          {activeDays > 0 && (
            <p className="text-xs mt-4" style={{ color: '#A0AEC0' }}>
              <span className="font-semibold text-white">{activeDays} dias</span> selecionados ·{' '}
              capacidade semanal de{' '}
              <span className="font-semibold text-white">{activeDays * perDay} visitas</span>
            </p>
          )}

          {activeDays === 0 && (
            <div className="flex items-center gap-2 mt-4 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <AlertTriangle size={13} style={{ color: '#FC8181' }} />
              <p className="text-xs" style={{ color: '#FC8181' }}>Selecione pelo menos um dia.</p>
            </div>
          )}
        </section>

        {/* Prioridades de visita */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} style={{ color: '#0075FF' }} />
            <h2 className="font-bold text-white text-base">Prioridades de Visita</h2>
          </div>
          <p className="text-sm mb-6" style={{ color: '#A0AEC0' }}>
            Intervalo em dias entre visitas para cada nível de prioridade.
          </p>

          <div className="space-y-3">
            {PRIORITY_CONFIG.map((p, i) => (
              <div key={p.key} className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                  style={{ background: p.color, color: '#ffffff' }}>
                  P{p.key}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">{p.label}</p>
                  <p className="text-xs" style={{ color: '#A0AEC0' }}>{p.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>a cada</p>
                  <input
                    type="number" min={1} max={365}
                    value={daysMap[i]}
                    onChange={e => setDay(i, parseInt(e.target.value) || 1)}
                    className="input-dark w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold"
                    style={{ color: p.color }}
                  />
                  <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>dias</p>
                </div>
              </div>
            ))}
          </div>

          {(days.p1 >= days.p2 || days.p2 >= days.p3 || days.p3 >= days.p4) && (
            <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3"
              style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#FC8181' }} />
              <p className="text-xs" style={{ color: '#FC8181' }}>
                P1 deve ter menos dias que P2, P2 menos que P3 e assim por diante.
              </p>
            </div>
          )}
        </section>

        {/* Capacidade diária */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} style={{ color: '#01B574' }} />
            <h2 className="font-bold text-white text-base">Capacidade de Visitas</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Quantos clientes você consegue visitar por dia. Usado para alertas de sobrecarga.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Visitas por dia</p>
              <p className="text-xs" style={{ color: '#A0AEC0' }}>Máximo de clientes por dia de visita</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="number" min={1} max={50}
                value={perDay}
                onChange={e => setPerDay(parseInt(e.target.value) || 1)}
                className="input-dark w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold"
                style={{ color: '#01B574' }}
              />
              <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>por dia</p>
            </div>
          </div>
        </section>

        {/* Feedback */}
        {erro && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
            <AlertTriangle size={15} style={{ color: '#FC8181' }} />
            <p className="text-sm" style={{ color: '#FC8181' }}>{erro}</p>
          </div>
        )}
        {sucesso && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: 'rgba(1,181,116,0.1)', border: '1px solid rgba(1,181,116,0.25)' }}>
            <CheckCircle size={15} style={{ color: '#01B574' }} />
            <p className="text-sm" style={{ color: '#01B574' }}>Configurações salvas com sucesso!</p>
          </div>
        )}

        <button
          onClick={handleSalvar}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
          <Save size={15} />
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>

        {/* Gerenciar Usuários */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <UserCog size={16} style={{ color: '#9F7AEA' }} />
              <h2 className="font-bold text-white text-base">Gerenciar Usuários</h2>
            </div>
            <button
              onClick={() => setShowAddMember(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(159,122,234,0.12)', color: '#9F7AEA', border: '1px solid rgba(159,122,234,0.25)' }}>
              <Plus size={12} />
              Novo usuário
            </button>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Defina o que cada membro da equipe pode acessar no sistema.
          </p>

          {showAddMember && (
            <div className="mb-4">
              <AddMemberForm onAdded={() => { refetchMembers(); setShowAddMember(false) }} />
            </div>
          )}

          {loadingMembers ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#56577A' }}>
              Nenhum usuário na equipe. Clique em "Novo usuário" para adicionar.
            </p>
          ) : (
            <div className="space-y-4">
              {members.map(m => (
                <MemberCard key={m.id} member={m} onSaved={refetchMembers} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
