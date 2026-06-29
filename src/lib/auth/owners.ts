// Donos do sistema Aivora — acesso TOTAL (inclui Configurações).
// Demais usuários só entram se forem membros ativos (tabela team_members).
// Qualquer login fora desta lista e que não seja membro ativo é BLOQUEADO.
//
// Para adicionar um novo dono, inclua o e-mail (em minúsculas) abaixo.
export const OWNER_EMAILS = [
  'glaucoaraujop@gmail.com',                 // Glauco (dono)
  'alexvieira@avieirarepresentacoes.com',    // Alex (co-dono)
]

export function isOwnerEmail(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.trim().toLowerCase())
}
