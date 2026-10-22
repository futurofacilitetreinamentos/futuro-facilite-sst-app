// CPF: máscara e validação dos dígitos verificadores (gravamos só os dígitos no banco)

export const onlyDigits = (v: string | null | undefined) => String(v ?? '').replace(/\D/g, '')

/** Máscara 000.000.000-00 (aceita valor parcial, para usar enquanto digita). */
export function formatCpf(v: string | null | undefined) {
  const d = onlyDigits(v).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

/** true se o CPF tem 11 dígitos e os verificadores conferem (rejeita 000.000.000-00, 111… etc.). */
export function validCpf(v: string | null | undefined) {
  const d = onlyDigits(v)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const nums = [...d].map(Number)
  for (const len of [9, 10]) {
    let sum = 0
    for (let i = 0; i < len; i++) sum += nums[i] * (len + 1 - i)
    const dv = ((sum * 10) % 11) % 10
    if (dv !== nums[len]) return false
  }
  return true
}

/** Mensagem de erro para exibir no formulário ('' = ok ou vazio). */
export function cpfError(v: string | null | undefined) {
  const d = onlyDigits(v)
  if (!d) return ''
  if (d.length < 11) return 'CPF incompleto (11 dígitos).'
  return validCpf(d) ? '' : 'CPF inválido: confira os dígitos.'
}
