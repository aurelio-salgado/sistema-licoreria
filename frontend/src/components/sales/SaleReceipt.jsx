import { formatDateTime, formatMoney, formatQuantity } from '../../utils/formatters'

function lineTotal(item) {
  return Number(item.subtotal) - Number(item.descuento) + Number(item.impuesto)
}

export function SaleReceipt({ sale }) {
  if (!sale || sale.estado !== 'completada') return null

  const customerName = sale.cliente?.nombre?.trim() || 'Consumidor final'
  const payments = sale.payments ?? []

  return (
    <section className="sale-receipt" aria-label="Comprobante de venta">
      <header className="sale-receipt__header">
        <h2>LIQUORIX</h2>
        <p>COMPROBANTE DE VENTA</p>
      </header>

      <dl className="sale-receipt__metadata">
        <div><dt>Comprobante:</dt><dd>{sale.numero_factura || sale.numero_venta}</dd></div>
        <div><dt>Fecha:</dt><dd>{formatDateTime(sale.fecha_venta)}</dd></div>
        <div><dt>Cliente:</dt><dd>{customerName}</dd></div>
      </dl>

      <div className="sale-receipt__items">
        <table>
          <thead><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Total</th></tr></thead>
          <tbody>
            {(sale.items ?? []).map((item) => (
              <tr key={item.id_detalle_venta}>
                <td>{item.producto?.nombre}</td>
                <td>{formatQuantity(item.cantidad, item.unidad?.permite_decimales)}</td>
                <td>{formatMoney(item.precio_unitario)}</td>
                <td>{formatMoney(lineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="sale-receipt__totals">
        <div><dt>Subtotal:</dt><dd>{formatMoney(sale.subtotal)}</dd></div>
        <div><dt>Descuento:</dt><dd>{formatMoney(sale.descuento)}</dd></div>
        <div><dt>Impuesto:</dt><dd>{formatMoney(sale.impuesto)}</dd></div>
        <div className="sale-receipt__grand-total"><dt>TOTAL:</dt><dd>{formatMoney(sale.total)}</dd></div>
      </dl>

      <section className="sale-receipt__payments" aria-label="Pagos">
        <h3>{payments.length > 1 ? 'Métodos de pago' : 'Método de pago'}</h3>
        {payments.map((payment) => (
          <dl key={payment.id_pago} className="sale-receipt__payment">
            <div><dt>{payment.method?.nombre || 'Método'}:</dt><dd>{formatMoney(payment.monto)}</dd></div>
            {payment.method?.es_efectivo && <>
              <div><dt>Recibido:</dt><dd>{formatMoney(payment.monto_recibido)}</dd></div>
              <div><dt>Vuelto:</dt><dd>{formatMoney(payment.cambio)}</dd></div>
            </>}
          </dl>
        ))}
      </section>

      <footer className="sale-receipt__footer">Gracias por su compra</footer>
    </section>
  )
}
