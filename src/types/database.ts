export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ClientType = 'loja' | 'outros'
export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado'
export type OrderStatus = 'pendente' | 'confirmado' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
export type CommissionStatus = 'prevista' | 'aprovada' | 'paga' | 'cancelada'
export type VisitStatus = 'agendada' | 'realizada' | 'cancelada' | 'reagendada'
export type ContactChannel = 'whatsapp' | 'telefone' | 'email' | 'visita' | 'outro'

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          company_name: string | null
          razao_social: string | null
          inscricao_estadual: string | null
          type: ClientType
          email: string | null
          phone: string | null
          whatsapp: string | null
          cpf_cnpj: string | null
          price_table_id: string | null
          region: string | null
          city: string | null
          state: string | null
          address: string | null
          cep: string | null
          endereco_entrega: string | null
          cep_entrega: string | null
          area_restrita: boolean | null
          num_lojas: number | null
          email_compras: string | null
          telefone_compras: string | null
          email_assistencia: string | null
          telefone_assistencia: string | null
          email_financeiro: string | null
          telefone_financeiro: string | null
          email_deposito: string | null
          telefone_deposito: string | null
          email_agendamento: string | null
          telefone_agendamento: string | null
          email_comunicado: string | null
          notes: string | null
          active: boolean
          priority: number | null
          last_order_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          company_name?: string | null
          razao_social?: string | null
          inscricao_estadual?: string | null
          type?: ClientType
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          cpf_cnpj?: string | null
          price_table_id?: string | null
          region?: string | null
          city?: string | null
          state?: string | null
          address?: string | null
          cep?: string | null
          endereco_entrega?: string | null
          cep_entrega?: string | null
          area_restrita?: boolean | null
          num_lojas?: number | null
          email_compras?: string | null
          telefone_compras?: string | null
          email_assistencia?: string | null
          telefone_assistencia?: string | null
          email_financeiro?: string | null
          telefone_financeiro?: string | null
          email_deposito?: string | null
          telefone_deposito?: string | null
          email_agendamento?: string | null
          telefone_agendamento?: string | null
          email_comunicado?: string | null
          notes?: string | null
          active?: boolean
          priority?: number | null
        }
        Update: {
          name?: string
          company_name?: string | null
          razao_social?: string | null
          inscricao_estadual?: string | null
          type?: ClientType
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          cpf_cnpj?: string | null
          price_table_id?: string | null
          region?: string | null
          city?: string | null
          state?: string | null
          address?: string | null
          cep?: string | null
          endereco_entrega?: string | null
          cep_entrega?: string | null
          area_restrita?: boolean | null
          num_lojas?: number | null
          email_compras?: string | null
          telefone_compras?: string | null
          email_assistencia?: string | null
          telefone_assistencia?: string | null
          email_financeiro?: string | null
          telefone_financeiro?: string | null
          email_deposito?: string | null
          telefone_deposito?: string | null
          email_agendamento?: string | null
          telefone_agendamento?: string | null
          email_comunicado?: string | null
          notes?: string | null
          active?: boolean
          priority?: number | null
        }
      }
      products: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          category_id: string | null
          brand: string | null
          unit: string
          weight_kg: number | null
          dimensions: string | null
          image_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          description?: string | null
          category_id?: string | null
          brand?: string | null
          unit?: string
          weight_kg?: number | null
          dimensions?: string | null
          image_url?: string | null
          active?: boolean
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
          category_id?: string | null
          brand?: string | null
          unit?: string
          weight_kg?: number | null
          dimensions?: string | null
          image_url?: string | null
          active?: boolean
        }
      }
      quotes: {
        Row: {
          id: string
          user_id: string
          client_id: string
          number: string | null
          status: QuoteStatus
          price_table_id: string | null
          discount_pct: number
          subtotal: number
          total: number
          valid_until: string | null
          notes: string | null
          sent_at: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>
      }
      orders: {
        Row: {
          id: string
          user_id: string
          client_id: string
          quote_id: string | null
          number: string | null
          status: OrderStatus
          subtotal: number
          discount_pct: number
          total: number
          commission_pct: number | null
          commission_value: number | null
          payment_terms: string | null
          delivery_date: string | null
          notes: string | null
          confirmed_at: string | null
          delivered_at: string | null
          supplier_id: string | null
          finalidade: 'mostruario' | 'venda' | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      commissions: {
        Row: {
          id: string
          user_id: string
          order_id: string
          value: number
          pct: number
          status: CommissionStatus
          due_date: string | null
          paid_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['commissions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['commissions']['Insert']>
      }
      visits: {
        Row: {
          id: string
          user_id: string
          client_id: string
          scheduled_at: string
          completed_at: string | null
          status: VisitStatus
          objective: string | null
          notes: string | null
          result: string | null
          next_action: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['visits']['Insert']>
      }
    }
    Views: {
      vw_sales_summary: { Row: Record<string, unknown> }
      vw_top_clients: { Row: Record<string, unknown> }
      vw_commissions_summary: { Row: Record<string, unknown> }
      vw_quote_pipeline: { Row: Record<string, unknown> }
      vw_upcoming_visits: { Row: Record<string, unknown> }
    }
  }
}
