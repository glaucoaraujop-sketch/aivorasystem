import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | Date) {
  // Datas "YYYY-MM-DD" (só data) viram meia-noite UTC e mostram o dia anterior
  // em fusos negativos — ancora ao meio-dia local pra evitar off-by-one.
  const d = typeof date === 'string' && date.length === 10 ? new Date(`${date}T12:00:00`) : new Date(date)
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return phone
}
