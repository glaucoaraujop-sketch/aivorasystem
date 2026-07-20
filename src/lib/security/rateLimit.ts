// Rate limiting em memória (janela deslizante), por processo.
// Suficiente para conter loops abusivos (DoS/estouro de custo) num deploy de
// container único. Não é distribuído entre instâncias — se um dia houver várias,
// cada uma aplica o próprio teto (proteção mais frouxa, nunca ausente).

const baldes = new Map<string, number[]>()

export interface ResultadoRate {
  ok: boolean
  restante: number
  retryAfter: number // segundos até liberar (0 quando ok)
}

// Permite `max` requisições por `janelaMs` para uma `chave` (ex.: "ai/chat:<userId>").
export function rateLimit(chave: string, max: number, janelaMs: number): ResultadoRate {
  const agora = Date.now()
  const arr = (baldes.get(chave) ?? []).filter(t => agora - t < janelaMs)

  if (arr.length >= max) {
    const maisAntigo = arr[0] ?? agora
    baldes.set(chave, arr)
    return { ok: false, restante: 0, retryAfter: Math.max(1, Math.ceil((janelaMs - (agora - maisAntigo)) / 1000)) }
  }

  arr.push(agora)
  baldes.set(chave, arr)
  return { ok: true, restante: max - arr.length, retryAfter: 0 }
}
