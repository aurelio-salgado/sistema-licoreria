function decimalUnits(value, scale) {
  const match = new RegExp(`^[0-9]+(?:[.][0-9]{1,${scale}})?$`).exec(String(value ?? '').trim())
  if (!match) return null
  const [integerPart, decimalPart = ''] = match[0].split('.')
  return BigInt(integerPart) * 10n ** BigInt(scale) + BigInt(decimalPart.padEnd(scale, '0'))
}

export function resolveSaleUnitPrice(item, selectedProduct, selectedProductId) {
  const itemProductId = item?.producto?.id_producto
  const editingSameProduct = itemProductId !== null && itemProductId !== undefined && String(itemProductId) === String(selectedProductId)
  if (editingSameProduct) return item?.precio_unitario ?? null
  return selectedProduct?.precio_venta ?? null
}

export function calculateMaxDiscount(unitPrice, quantityValue, percentValue) {
  return calculateDiscountAmount(unitPrice, quantityValue, percentValue)
}

export function calculateDiscountAmount(unitPrice, quantityValue, percentValue) {
  const priceCents = decimalUnits(unitPrice, 2)
  const quantityMillis = decimalUnits(quantityValue, 3)
  const percentHundredths = decimalUnits(percentValue, 2)
  if (priceCents === null || quantityMillis === null || percentHundredths === null) return null
  const subtotalCents = decimalUnits(calculateLineSubtotal(unitPrice, quantityValue), 2)
  const maximumCents = subtotalCents * percentHundredths / 10000n
  const digits = maximumCents.toString().padStart(3, '0')
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`
}

export function generateDiscountOptions(maxPercentValue) {
  const maximum = decimalUnits(maxPercentValue, 2)
  if (maximum === null) return []
  const options = [0n]
  for (let value = 500n; value < maximum; value += 500n) options.push(value)
  if (maximum > 0n) options.push(maximum)
  return [...new Set(options)].map((value) => {
    const digits = value.toString().padStart(3, '0')
    return `${digits.slice(0, -2)}.${digits.slice(-2)}`
  })
}

export function resolveDiscountPercent(storedDiscount, unitPrice, quantityValue, options) {
  const storedCents = decimalUnits(storedDiscount, 2)
  if (storedCents === null) return null
  return options.find((percent) => decimalUnits(calculateDiscountAmount(unitPrice, quantityValue, percent), 2) === storedCents) ?? 'current'
}

export function calculateLineSubtotal(unitPrice, quantityValue) {
  const priceCents = decimalUnits(unitPrice, 2)
  const quantityMillis = decimalUnits(quantityValue, 3)
  if (priceCents === null || quantityMillis === null) return null
  const subtotalCents = (quantityMillis * priceCents + 500n) / 1000n
  const digits = subtotalCents.toString().padStart(3, '0')
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`
}

export function exceedsMaxDiscount(discountValue, maximumValue) {
  const discountCents = decimalUnits(discountValue || '0', 2)
  const maximumCents = decimalUnits(maximumValue, 2)
  return discountCents !== null && maximumCents !== null && discountCents > maximumCents
}
