'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, Package, FileText, ShoppingCart,
  DollarSign, MapPin, BarChart2, Truck, Wrench, LogOut, Menu, X, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function useCurrentUserName() {
  const [name, setName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca nome na tabela de membros da equipe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('team_members') as any)
        .select('name')
        .eq('email', user.email)
        .maybeSingle()

      if (data?.name) {
        setName(data.name)
      } else {
        // Dono do sistema: usa a parte antes do @ ou "Glauco"
        const emailName = user.email?.split('@')[0] ?? ''
        setName(emailName === 'glaucoaraujop' ? 'Glauco' : emailName)
      }
    }
    load()
  }, [])

  return name
}

const nav = [
  { href: '/clientes',     label: 'Clientes',        icon: Users },
  { href: '/produtos',     label: 'Catálogo',         icon: Package },
  { href: '/orcamentos',   label: 'Orçamentos',       icon: FileText },
  { href: '/pedidos',      label: 'Pedidos',          icon: ShoppingCart },
  { href: '/comissoes',    label: 'Comissões',        icon: DollarSign },
  { href: '/visitas',      label: 'Visitas',          icon: MapPin },
  { href: '/fornecedores', label: 'Fornecedores',     icon: Truck },
  { href: '/assistencia',  label: 'Assist. Técnica',  icon: Wrench },
  { href: '/relatorios',   label: 'Relatórios',       icon: BarChart2 },
  { href: '/configuracoes', label: 'Configurações',   icon: Settings  },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              active
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
            )}
            style={active ? {
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 2px 12px rgba(0, 117, 255, 0.15)',
            } : undefined}
          >
            <Icon
              size={17}
              style={active ? { color: '#0075FF' } : undefined}
            />
            {label}
          </Link>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const userName = useCurrentUserName()

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
            style={{ mixBlendMode: 'lighten', filter: 'invert(1) hue-rotate(180deg)' }}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5">
          <NavLinks />
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
            style={{ objectFit: 'contain', objectPosition: 'left center', mixBlendMode: 'lighten', filter: 'invert(1) hue-rotate(180deg)' }}
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
                style={{ mixBlendMode: 'lighten', filter: 'invert(1) hue-rotate(180deg)' }}
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
              <NavLinks onClick={() => setOpen(false)} />
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
    </>
  )
}
