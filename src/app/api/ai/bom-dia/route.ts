import { withObservability } from '@/lib/observability/api'
import { anthropic } from '@/lib/anthropic'
import { MODELOS } from '@/lib/ai/modelos'
import { guardaIA } from '@/lib/security/guardaIA'

async function fetchWeather(city: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(city)
    const res = await fetch(`https://wttr.in/${encoded}?format=j1`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 },
    })
    if (!res.ok) return ''
    const data = await res.json()
    const current = data?.current_condition?.[0]
    if (!current) return ''
    const desc = current.lang_pt?.[0]?.value ?? current.weatherDesc?.[0]?.value ?? ''
    const temp = current.temp_C ?? ''
    const feels = current.FeelsLikeC ?? ''
    const humidity = current.humidity ?? ''
    return `Clima em ${city}: ${desc}, ${temp}°C (sensação ${feels}°C), umidade ${humidity}%`
  } catch {
    return ''
  }
}

function buildPrompt(body: {
  userName: string
  area: string
  weatherInfo: string
  hora: number
  diaSemana: string
}) {
  const { userName, area, weatherInfo, hora, diaSemana } = body

  const periodo = hora < 12 ? 'manhã' : hora < 18 ? 'tarde' : 'noite'
  const tipicamenteMovimentado = [8, 9, 17, 18, 19].includes(hora)

  return `Você é AIVA, a inteligência artificial da Aivora Tecnologia, assistente estratégica de ${userName}.
Gere uma mensagem de boas-vindas breve e prática para o início do dia de trabalho.

CONTEXTO:
- Representante: ${userName}
- Área de atuação: ${area}
- Horário: ${hora}h de ${diaSemana} (${periodo})
- ${weatherInfo || `Clima em ${area}: informação indisponível`}
- Trânsito típico: ${tipicamenteMovimentado ? 'horário de pico — trânsito intenso esperado' : 'fora do horário de pico'}

Escreva 2-3 frases curtas em português brasileiro:
1. Uma nota sobre o clima e/ou trânsito de forma útil para quem vai visitar clientes
2. Uma dica ou motivação prática para o dia de hoje

Tom: amigável, direto, como uma assistente pessoal. NÃO use saudações (isso vem antes). NÃO invente dados de clima que não foram fornecidos. Máximo 60 palavras.`
}

export const POST = withObservability('ai/bom-dia', async (req) => {
  const g = await guardaIA(req, 'ai/bom-dia')
  if (!g.ok) return g.resposta
  const body = await req.json()
  const { area } = body

  const weatherInfo = area ? await fetchWeather(area) : ''
  const prompt = buildPrompt({ ...body, weatherInfo })

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: MODELOS.redacao,
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        })
        for await (const event of aiStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
})
