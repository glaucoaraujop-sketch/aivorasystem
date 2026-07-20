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
} as const
