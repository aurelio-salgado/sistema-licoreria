export function calculateCashSummary(cash) {
  const movements = cash?.movements ?? []
  const entries = movements.filter((movement) => movement.afecta_efectivo && movement.naturaleza === 'entrada').reduce((sum, movement) => sum + Number(movement.monto), 0)
  const exits = movements.filter((movement) => movement.afecta_efectivo && movement.naturaleza === 'salida').reduce((sum, movement) => sum + Number(movement.monto), 0)
  return { entries, exits, expected: Number(cash?.monto_apertura ?? 0) + entries - exits }
}
