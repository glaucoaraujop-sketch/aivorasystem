'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, Package, FileText, ShoppingCart,
  DollarSign, MapPin, BarChart2, Truck, Wrench, LogOut, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
        <div className="px-6 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h1
            className="text-3xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(90deg, #ffffff 70%, rgba(117,122,140,0) 140%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Aivora
          </h1>
          <p className="text-[11px] tracking-[0.3em] uppercase mt-1.5" style={{ color: '#56577A' }}>
            System
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5">
          <NavLinks />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
        className="md:hidden fixed top-0 left-0 right-0 z-40 text-white flex items-center justify-between px-5 h-14"
        style={{
          background: 'rgba(6, 11, 40, 0.95)',
          backdropFilter: 'blur(42px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <span
            className="text-xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #ffffff 70%, rgba(117,122,140,0) 140%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Aivora
          </span>
          <span className="text-[10px] ml-2 tracking-[0.25em] uppercase" style={{ color: '#56577A' }}>
            System
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl transition-colors"
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
              <div>
                <p
                  className="text-xl font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(90deg, #ffffff 70%, rgba(117,122,140,0) 140%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Aivora
                </p>
                <p className="text-[10px] tracking-[0.3em] uppercase mt-0.5" style={{ color: '#56577A' }}>System</p>
              </div>
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
            <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
