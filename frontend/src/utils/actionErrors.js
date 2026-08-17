export function createActionError(error, title, fallbackMessage) {
  if (error?.status === 401) return null
  return {
    title,
    message: error?.message || fallbackMessage || 'No fue posible completar la operación.',
  }
}
