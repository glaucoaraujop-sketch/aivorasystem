'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, Package, FileText, ShoppingCart,
  DollarSign, MapPin, BarChart2, Truck, Wrench, LogOut, Menu, X, Settings,
  Home, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useMyPermissions, type UserPermissions } from '@/hooks/useMyPermissions'
import { useCurrentUserName } from '@/hooks/useCurrentUserName'
import { AivaChat } from '@/components/ai/AivaChat'

const ALL_NAV = [
  { href: '/clientes',      label: 'Clientes',       icon: Users,        perm: 'perm_clientes'     },
  { href: '/orcamentos',    label: 'Orçamentos',      icon: FileText,     perm: 'perm_orcamentos'   },
  { href: '/pedidos',       label: 'Pedidos',         icon: ShoppingCart, perm: 'perm_pedidos'      },
  { href: '/comissoes',     label: 'Comissões',       icon: DollarSign,   perm: 'perm_comissoes'    },
  { href: '/visitas',       label: 'Visitas',         icon: MapPin,       perm: 'perm_visitas'      },
  { href: '/fornecedores',  label: 'Fornecedores',    icon: Truck,        perm: 'perm_fornecedores' },
  { href: '/assistencia',   label: 'Assist. Técnica', icon: Wrench,       perm: 'perm_assistencia'  },
  { href: '/relatorios',    label: 'Relatórios',      icon: BarChart2,    perm: 'perm_relatorios'   },
  { href: '/configuracoes', label: 'Configurações',   icon: Settings,     perm: 'perm_configuracoes'},
] as const

function NavLinks({ onClick, perms, onAiva }: { onClick?: () => void; perms: UserPermissions; onAiva: () => void }) {
  const pathname = usePathname()
  const nav = ALL_NAV.filter(item => perms[item.perm as keyof UserPermissions])
  const inicioActive = pathname === '/inicio' || pathname === '/'
  return (
    <div className="space-y-1">
      {/* AIVA — topo, sempre visível */}
      <button
        onClick={() => { onClick?.(); onAiva() }}
        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left transition-all hover:opacity-90 active:scale-[0.99]"
        style={{
          background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)',
          boxShadow: '0 6px 24px rgba(109,40,217,0.45)',
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.18)' }}>
          <Sparkles size={15} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Fale com a AIVA</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Sua assistente de IA</p>
        </div>
      </button>

      {/* Início — sempre visível */}
      <Link
        href="/inicio"
        onClick={onClick}
        className={cn('flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          inicioActive ? 'text-white' : 'text-slate-400 hover:text-white')}
        style={inicioActive ? { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 12px rgba(0,117,255,0.15)' } : undefined}
      >
        <Home size={17} style={inicioActive ? { color: '#0075FF' } : undefined} />
        Início
      </Link>

      <div className="pt-1 pb-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              active ? 'text-white' : 'text-slate-400 hover:text-white'
            )}
            style={active ? {
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 2px 12px rgba(0, 117, 255, 0.15)',
            } : undefined}
          >
            <Icon size={17} style={active ? { color: '#0075FF' } : undefined} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen]         = useState(false)
  const [aivaOpen, setAivaOpen] = useState(false)
  const [aivaContext, setAivaContext] = useState<string | undefined>(undefined)
  const router = useRouter()
  const supabase = createClient()
  const { name: userName } = useCurrentUserName()
  const perms = useMyPermissions()

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('clients').select('id', { count: 'exact', head: true }).eq('active', true),
      sb.from('orders').select('id', { count: 'exact', head: true }).not('status', 'in', '("entregue","cancelado")'),
      sb.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'enviado'),
      sb.from('visits')
        .select('id', { count: 'exact', head: true })
        .in('status', ['agendada', 'reagendada'])
        .gte('scheduled_at', new Date().toISOString().split('T')[0]),
    ]).then(([clients, orders, quotes, visits]) => {
      const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
      setAivaContext(
        `Data atual: ${hoje}\n` +
        `Clientes ativos: ${clients.count ?? 0}\n` +
        `Pedidos em andamento: ${orders.count ?? 0}\n` +
        `Orçamentos aguardando resposta: ${quotes.count ?? 0}\n` +
        `Visitas agendadas a partir de hoje: ${visits.count ?? 0}`
      )
    }).catch(() => undefined)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarStyle = {
    background: 'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
    backdropFilter: 'blur(42px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-64 min-h-screen text-white shrink-0"
        style={sidebarStyle}
      >
        {/* Brand */}
        <div className="px-6 py-5 flex items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Image
            src="/logo-aivora.png"
            alt="Aivora System"
            width={160}
            height={56}
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5">
          <NavLinks perms={perms} onAiva={() => setAivaOpen(true)} />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {userName && (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4318FF 0%, #0075FF 100%)' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: '#56577A' }}>Logado como</p>
                <p className="text-sm font-semibold text-white truncate">{userName}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#A0AEC0' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#A0AEC0')}
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 text-white flex items-center justify-between px-5 overflow-hidden"
        style={{
          height: '56px',
          background: 'rgba(6, 11, 40, 0.95)',
          backdropFilter: 'blur(42px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ width: 110, height: 36, position: 'relative', flexShrink: 0 }}>
          <Image
            src="/logo-aivora.png"
            alt="Aivora System"
            fill
            priority
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
          />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl transition-colors flex-shrink-0"
          style={{ color: '#A0AEC0' }}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-72 max-w-[85vw] text-white flex flex-col h-full shadow-2xl animate-slide-in"
            style={sidebarStyle}
          >
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Image
                src="/logo-aivora.png"
                alt="Aivora System"
                width={130}
                height={46}
                style={{ objectFit: 'contain' }}
              />
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl transition-colors"
                style={{ color: '#A0AEC0' }}
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-5 overflow-y-auto">
              <NavLinks perms={perms} onClick={() => setOpen(false)} onAiva={() => { setOpen(false); setAivaOpen(true) }} />
            </nav>
            <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {userName && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4318FF 0%, #0075FF 100%)' }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: '#56577A' }}>Logado como</p>
                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: '#A0AEC0' }}
              >
                <LogOut size={17} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <AivaChat
        open={aivaOpen}
        onClose={() => setAivaOpen(false)}
        userName={userName ?? undefined}
        context={aivaContext}
      />
    </>
  )
}
