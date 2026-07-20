// Designação de modelo por tarefa (Fase 2 — model tiering).
//
// Princípio: a assertividade dos DADOS vem das ferramentas SQL (views/RPCs que
// devolvem JSON já agregado), NÃO do modelo. Logo, tarefas de pura geração de
// texto usam o modelo mais barato (Haiku), e as que exigem raciocínio para
// escolher a ferramenta certa usam o mais capaz (Sonnet 5). Trocar o modelo de
// um "agente" é mudar UMA linha aqui.
export const MODELOS = {
  // Loop do agente (chat + consultor/WhatsApp): decide qual ferramenta chamar,
  // com quais parâmetros, e redige. É onde o modelo mais forte melhora a
  // assertividade da orquestração. Custo ~igual ao Sonnet 4.6.
  agente: 'claude-sonnet-5',
  // Extração de documento (imagem/PDF/texto) → pedido estruturado. Crítico para
  // a assertividade; pipeline atual validado no Sonnet 4.6.
  extracao: 'claude-sonnet-4-6',
  // Análises single-shot sobre dados JÁ calculados (recebidos no prompt).
  analise: 'claude-sonnet-4-6',
  // Geração de texto curto / saudação. Trivial → modelo mais barato (~67% menor).
  redacao: 'claude-haiku-4-5',
  // Roteador de intenção (Fase 3): classifica a mensagem antes do agente.
  // Chamada curtíssima → o modelo mais barato e rápido.
  roteador: 'claude-haiku-4-5',
  // Análise ESTRATÉGICA pesada (comparativo ano-a-ano, concentração de carteira,
  // reativação, recomendações). Único bucket que custa mais, de propósito, pela
  // qualidade do raciocínio. Trocar por 'claude-sonnet-5' se quiser máximo corte.
  estrategia: 'claude-opus-4-8',
} as const

// Mapa intenção → modelo do agente (o roteador escolhe; as ferramentas seguem
// SEMPRE completas, então errar a intenção nunca tira uma ferramenta do agente).
export type Intencao = 'conversa' | 'consulta' | 'estrategia'
export const MODELO_POR_INTENCAO: Record<Intencao, string> = {
  conversa: MODELOS.redacao,    // papo/saudação sem dado → Haiku
  consulta: MODELOS.agente,     // consulta/ação de dados → Sonnet 5 (padrão)
  estrategia: MODELOS.estrategia, // análise pesada → Opus 4.8
}
