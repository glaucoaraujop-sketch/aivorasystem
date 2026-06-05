'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useMyPermissions } from '@/hooks/useMyPermissions'

const ROUTE_PERMS: Record<string, string> = {
  '/clientes':      'perm_clientes',
  '/produtos':      'perm_catalogo',
  '/orcamentos':    'perm_orcamentos',
  '/pedidos':       'perm_pedidos',
  '/comissoes':     'perm_comissoes',
  '/visitas':       'perm_visitas',
  '/fornecedores':  'perm_fornecedores',
  '/assistencia':   'perm_assistencia',
  '/relatorios':    'perm_relatorios',
  '/configuracoes': 'perm_configuracoes',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const perms    = useMyPermissions()

  useEffect(() => {
    if (!perms.loaded) return

    // Encontra a rota base (ex: /comissoes/123 → /comissoes)
    const base = Object.keys(ROUTE_PERMS).find(r => pathname.startsWith(r))
    if (!base) return

    const permKey = ROUTE_PERMS[base] as keyof typeof perms
    if (!perms[permKey]) {
      // Sem permissão: redireciona para o primeiro módulo permitido
      const first = Object.entries(ROUTE_PERMS).find(
        ([, k]) => perms[k as keyof typeof perms]
      )
      router.replace(first ? first[0] : '/login')
    }
  }, [perms, pathname])

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: 'linear-gradient(159.02deg, #0f123b 14.25%, #090d2e 56.45%, #020515 86.14%)',
      }}
    >
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 p-5 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-5xl md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
