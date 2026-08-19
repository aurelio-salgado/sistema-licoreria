async function overview(db) {
  const [[sales], [low], [recent]] = await Promise.all([
    db.execute("SELECT COALESCE(SUM(total),0) sales_total,COUNT(*) sales_count FROM ventas WHERE estado='completada' AND fecha_venta>=CURDATE() AND fecha_venta<DATE_ADD(CURDATE(),INTERVAL 1 DAY)"),
    db.execute("SELECT COUNT(*) low_stock_count FROM productos WHERE estado='activo' AND existencia<=existencia_minima"),
    db.execute("SELECT v.id_venta,v.numero_venta,v.numero_factura,v.fecha_venta,v.total,c.nombre cliente FROM ventas v INNER JOIN clientes c ON c.id_cliente=v.id_cliente WHERE v.estado='completada' ORDER BY v.fecha_venta DESC,v.id_venta DESC LIMIT 5"),
  ]);
  return { sales_total: sales[0].sales_total, sales_count: Number(sales[0].sales_count), low_stock_count: Number(low[0].low_stock_count), recent_sales: recent };
}
async function charts(db, filters) {
  const range = [`${filters.dateFrom} 00:00:00`, `${filters.dateTo} 00:00:00`], sellerClause = filters.seller ? ' AND v.id_usuario=?' : '', values = filters.seller ? [...range, filters.seller] : range;
  const [[period], [products], [categories], [sellers]] = await Promise.all([
    db.execute(`SELECT DATE(v.fecha_venta) date,COALESCE(SUM(v.total),0) total,COUNT(*) sales_count FROM ventas v WHERE v.estado='completada' AND v.fecha_venta>=? AND v.fecha_venta<DATE_ADD(?,INTERVAL 1 DAY)${sellerClause} GROUP BY DATE(v.fecha_venta) ORDER BY date`, values),
    db.execute(`SELECT p.id_producto,p.codigo,p.nombre product,SUM(dv.cantidad) quantity_sold,SUM((dv.precio_unitario*dv.cantidad)-dv.descuento) net_amount FROM detalle_ventas dv INNER JOIN ventas v ON v.id_venta=dv.id_venta INNER JOIN productos p ON p.id_producto=dv.id_producto WHERE v.estado='completada' AND v.fecha_venta>=? AND v.fecha_venta<DATE_ADD(?,INTERVAL 1 DAY)${sellerClause} GROUP BY p.id_producto,p.codigo,p.nombre ORDER BY quantity_sold DESC,p.nombre LIMIT 10`, values),
    db.execute(`SELECT c.id_categoria,c.nombre category,SUM((dv.precio_unitario*dv.cantidad)-dv.descuento) net_amount FROM detalle_ventas dv INNER JOIN ventas v ON v.id_venta=dv.id_venta INNER JOIN productos p ON p.id_producto=dv.id_producto INNER JOIN categorias c ON c.id_categoria=p.id_categoria WHERE v.estado='completada' AND v.fecha_venta>=? AND v.fecha_venta<DATE_ADD(?,INTERVAL 1 DAY)${sellerClause} GROUP BY c.id_categoria,c.nombre ORDER BY net_amount DESC,c.nombre`, values),
    db.execute("SELECT DISTINCT u.id_usuario,CONCAT(u.nombre,' ',u.apellido) nombre FROM usuarios u INNER JOIN ventas v ON v.id_usuario=u.id_usuario WHERE v.estado='completada' ORDER BY nombre,u.id_usuario"),
  ]);
  return { sales_by_period: period, top_products: products, sales_by_category: categories, sellers };
}
module.exports = { charts, overview };
