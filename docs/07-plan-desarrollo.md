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

Productos continúa fuera del alcance de esta fase.
