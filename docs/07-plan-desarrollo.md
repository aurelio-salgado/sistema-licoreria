# Estado de implementación del frontend

## Catálogos de productos

El frontend dispone de pantallas funcionales y protegidas por `productos.ver` para:

- `/categories`: categorías.
- `/brands`: marcas.
- `/units`: unidades de medida.

Las acciones visibles respetan `productos.crear`, `productos.editar` y
`productos.desactivar`. Los listados usan búsqueda, estado y paginación del backend;
las altas y ediciones se realizan en formularios modales, y los cambios de estado
requieren confirmación y usan `PATCH /:id/status`. No existe eliminación física.

## Productos

La ruta `/products` ofrece listado paginado, búsqueda y filtros remotos por estado,
categoría y marca. Permite crear, editar, desactivar y reactivar según los permisos
`productos.crear`, `productos.editar` y `productos.desactivar`.

El formulario no modifica la existencia. El costo promedio se omite del `PUT` cuando
hay inventario y queda como solo lectura; los catálogos seleccionables se limitan a
categorías, marcas y unidades activas.
