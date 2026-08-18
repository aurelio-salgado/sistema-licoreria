export function formatInventoryQuantity(value, allowsDecimals = true) {
  const quantity = Number(value)
  if (!Number.isFinite(quantity)) return '—'
  return new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: allowsDecimals ? 3 : 0,
    maximumFractionDigits: allowsDecimals ? 3 : 0,
  }).format(quantity)
}

export function quantityWithUnit(value, item) {
  const abbreviation = item.abreviatura || ''
  return `${formatInventoryQuantity(value, item.permite_decimales)}${abbreviation ? ` ${abbreviation}` : ''}`
}
