'use client'

import { useState } from 'react'
import Image from 'next/image'
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
    <>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith(href)
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </>
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
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-gray-900 text-white shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Aivora" width={38} height={38} className="shrink-0 brightness-0 invert" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide leading-tight">Aivora</h1>
              <p className="text-[10px] text-gray-400 tracking-[0.25em] uppercase leading-tight">System</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center justify-between px-4 h-14 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Aivora" width={30} height={30} className="shrink-0 brightness-0 invert" />
          <div>
            <p className="text-base font-bold text-white tracking-wide leading-tight">Aivora</p>
            <p className="text-[10px] text-gray-400 tracking-[0.25em] uppercase leading-tight">System</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-gray-900 text-white flex flex-col h-full shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Aivora" width={30} height={30} className="shrink-0 brightness-0 invert" />
                <div>
                  <p className="text-base font-bold text-white tracking-wide leading-tight">Aivora</p>
                  <p className="text-[10px] text-gray-400 tracking-[0.25em] uppercase leading-tight">System</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLinks onClick={() => setOpen(false)} />
            </nav>
            <div className="px-3 py-4 border-t border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
