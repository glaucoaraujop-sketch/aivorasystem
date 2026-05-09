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
    <div className="space-y-0.5">
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
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon size={17} className={active ? 'text-blue-400' : ''} />
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

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-gray-900 text-white shrink-0 border-r border-white/5">
        {/* Brand */}
        <div className="px-6 py-7 border-b border-white/5">
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Aivora</h1>
          <p className="text-[11px] text-slate-500 tracking-[0.3em] uppercase mt-1.5">System</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5">
          <NavLinks />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 text-white flex items-center justify-between px-5 h-14 border-b border-white/5">
        <div>
          <span className="text-xl font-black tracking-tight">Aivora</span>
          <span className="text-[10px] text-slate-500 ml-2 tracking-[0.25em] uppercase">System</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-gradient-to-b from-slate-900 to-gray-900 text-white flex flex-col h-full shadow-2xl animate-slide-in border-r border-white/5">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div>
                <p className="text-xl font-black text-white tracking-tight">Aivora</p>
                <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase mt-0.5">System</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-5 overflow-y-auto">
              <NavLinks onClick={() => setOpen(false)} />
            </nav>
            <div className="px-3 py-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
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
