'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserPermissions {
  isOwner: boolean
  perm_clientes: boolean
  perm_catalogo: boolean
  perm_orcamentos: boolean
  perm_pedidos: boolean
  perm_comissoes: boolean
  perm_visitas: boolean
  perm_fornecedores: boolean
  perm_assistencia: boolean
  perm_relatorios: boolean
  perm_configuracoes: boolean
  loaded: boolean
}

const FULL_ACCESS: UserPermissions = {
  isOwner: true,
  perm_clientes: true, perm_catalogo: true, perm_orcamentos: true,
  perm_pedidos: true, perm_comissoes: true, perm_visitas: true,
  perm_fornecedores: true, perm_assistencia: true, perm_relatorios: true,
  perm_configuracoes: true,
  loaded: true,
}

export function useMyPermissions(): UserPermissions {
  const [perms, setPerms] = useState<UserPermissions>({ ...FULL_ACCESS, loaded: false })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('team_members') as any)
        .select('active,perm_clientes,perm_catalogo,perm_orcamentos,perm_pedidos,perm_comissoes,perm_visitas,perm_fornecedores,perm_assistencia,perm_relatorios')
        .eq('member_user_id', user.id)
        .maybeSingle()

      if (!data) {
        // Usuário não está na tabela de membros → é o dono → acesso total
        setPerms(FULL_ACCESS)
      } else {
        setPerms({
          isOwner: false,
          perm_clientes:     data.active && data.perm_clientes,
          perm_catalogo:     data.active && data.perm_catalogo,
          perm_orcamentos:   data.active && data.perm_orcamentos,
          perm_pedidos:      data.active && data.perm_pedidos,
          perm_comissoes:    data.active && data.perm_comissoes,
          perm_visitas:      data.active && data.perm_visitas,
          perm_fornecedores: data.active && data.perm_fornecedores,
          perm_assistencia:  data.active && data.perm_assistencia,
          perm_relatorios:   data.active && data.perm_relatorios,
          perm_configuracoes: false, // membros nunca acessam configurações
          loaded: true,
        })
      }
    }
    load()
  }, [])

  return perms
}
