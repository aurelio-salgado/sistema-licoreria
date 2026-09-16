export function filterInventoryByProductName(items, search) {
  const term = search.trim().toLocaleLowerCase('es')
  if (!term) return items

  return items.filter((item) => item.nombre.toLocaleLowerCase('es').includes(term))
}
