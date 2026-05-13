/** Remove tudo que não for dígito e limita ao máximo de caracteres */
function digits(raw: string, max: number) {
  return raw.replace(/\D/g, '').slice(0, max)
}

/** CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) — detecta pelo comprimento */
export function maskCpfCnpj(raw: string): string {
  const d = digits(raw, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3}\.\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2})$/, '$1-$2')
}

/** Telefone fixo (00) 0000-0000 ou celular (00) 00000-0000 — detecta pelo comprimento */
export function maskPhone(raw: string): string {
  const d = digits(raw, 11)
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

/** CEP 00000-000 */
export function maskCep(raw: string): string {
  return digits(raw, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}
