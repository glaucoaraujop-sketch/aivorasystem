// Comparação de segredos em tempo constante (evita timing attack).
// Faz hash de ambos os lados para tamanho fixo antes do timingSafeEqual — assim
// a comparação não vaza o comprimento do segredo nem quebra com tamanhos
// diferentes. Defense-in-depth para tokens de cron/painel/consultor.
import { createHash, timingSafeEqual } from 'crypto'

export function segredoConfere(enviado: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!enviado || !esperado) return false
  const a = createHash('sha256').update(enviado).digest()
  const b = createHash('sha256').update(esperado).digest()
  return timingSafeEqual(a, b)
}
