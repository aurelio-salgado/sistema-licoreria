# Contexto del proyecto

## Nombre del proyecto

Sistema web de control de inventario y facturación para una licorería.

## Responsable

Aurelio José Salgado Bucardo  
Carné: 18-01523-0

## Descripción general

El proyecto consiste en una aplicación web que administra las operaciones principales de una licorería.

El sistema permite gestionar:

- Productos.
- Categorías.
- Marcas.
- Unidades de medida.
- Proveedores.
- Clientes.
- Compras.
- Ventas.
- Facturación.
- Inventario.
- Caja.
- Usuarios.
- Roles.
- Permisos.
- Reportes.
- Dashboard.
- Bitácora.
- Respaldos.

## Problema que resuelve

La administración manual de inventario y ventas puede provocar:

- Errores en los cálculos.
- Pérdida de información.
- Desconocimiento de existencias.
- Falta de control sobre compras y ventas.
- Dificultad para consultar información histórica.
- Poca trazabilidad de las acciones de los usuarios.
- Falta de reportes para tomar decisiones.

El sistema centraliza la información y automatiza estos procesos.

## Objetivo general

Desarrollar una aplicación web segura y modular que permita controlar el inventario, las compras, las ventas, la facturación y las operaciones administrativas de una licorería.

## Tecnologías principales

### Frontend

- React.
- Vite.
- React Router.
- Axios o Fetch.
- Librería de formularios y validaciones.
- Librería de gráficos.

### Backend

- Node.js.
- Express.
- API REST.
- JWT.
- bcrypt.
- mysql2.
- Middlewares de autenticación, autorización y validación.

### Base de datos

- MariaDB/MySQL de XAMPP.
- Motor InnoDB.
- Codificación utf8mb4.
- Claves primarias y foráneas.
- Transacciones.

## Arquitectura

El proyecto está dividido en:

```text
sistema-licoreria/
├── backend/
├── frontend/
├── database/
├── docs/
├── AGENTS.md
├── PROJECT_CONTEXT.md
├── TASKS.md
├── README.md
└── .gitignore
