const moneyFormatter = new Intl.NumberFormat('es-NI', {
  style: 'currency',
  currency: 'NIO',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? moneyFormatter.format(amount) : '—'
}

export function formatQuantity(value, allowsDecimals = true) {
  const quantity = Number(value)
  if (!Number.isFinite(quantity)) return '—'
  return new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: allowsDecimals ? 0 : 0,
    maximumFractionDigits: allowsDecimals ? 3 : 0,
  }).format(quantity)
}

export function formatDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(value ?? ''))
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : '—'
}
