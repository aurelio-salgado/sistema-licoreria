
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `sistema_licoreria` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `sistema_licoreria`;
DROP TABLE IF EXISTS `ajustes_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ajustes_inventario` (
  `id_ajuste` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_producto` bigint(20) unsigned NOT NULL,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `naturaleza` varchar(10) NOT NULL,
  `cantidad` decimal(12,3) NOT NULL,
  `existencia_anterior` decimal(12,3) NOT NULL,
  `existencia_posterior` decimal(12,3) NOT NULL,
  `motivo` varchar(500) NOT NULL,
  `fecha_ajuste` datetime NOT NULL,
  PRIMARY KEY (`id_ajuste`),
  KEY `idx_ajustes_inventario_producto_fecha` (`id_producto`,`fecha_ajuste`),
  KEY `idx_ajustes_inventario_usuario` (`id_usuario`),
  CONSTRAINT `fk_ajustes_inventario_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  CONSTRAINT `fk_ajustes_inventario_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_ajustes_inventario_naturaleza` CHECK (`naturaleza` in ('entrada','salida')),
  CONSTRAINT `chk_ajustes_inventario_cantidad` CHECK (`cantidad` > 0),
  CONSTRAINT `chk_ajustes_inventario_existencia_anterior` CHECK (`existencia_anterior` >= 0),
  CONSTRAINT `chk_ajustes_inventario_existencia_posterior` CHECK (`existencia_posterior` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ajustes_inventario` WRITE;
/*!40000 ALTER TABLE `ajustes_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `ajustes_inventario` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bitacora`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bitacora` (
  `id_bitacora` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint(20) unsigned DEFAULT NULL,
  `modulo` varchar(80) NOT NULL,
  `accion` varchar(100) NOT NULL,
  `entidad` varchar(80) DEFAULT NULL,
  `id_entidad` bigint(20) unsigned DEFAULT NULL,
  `datos_anteriores` longtext DEFAULT NULL,
  `datos_nuevos` longtext DEFAULT NULL,
  `direccion_ip` varchar(45) DEFAULT NULL,
  `resultado` varchar(30) NOT NULL,
  `fecha_evento` datetime NOT NULL,
  PRIMARY KEY (`id_bitacora`),
  KEY `idx_bitacora_fecha_evento` (`fecha_evento`),
  KEY `idx_bitacora_usuario_fecha` (`id_usuario`,`fecha_evento`),
  KEY `idx_bitacora_modulo_accion` (`modulo`,`accion`),
  KEY `idx_bitacora_entidad_id` (`entidad`,`id_entidad`),
  KEY `idx_bitacora_resultado` (`resultado`),
  CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=402 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bitacora` WRITE;
/*!40000 ALTER TABLE `bitacora` DISABLE KEYS */;
/*!40000 ALTER TABLE `bitacora` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cajas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cajas` (
  `id_caja` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `fecha_apertura` datetime NOT NULL,
  `monto_apertura` decimal(12,2) NOT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_cierre` decimal(12,2) DEFAULT NULL,
  `monto_esperado` decimal(12,2) DEFAULT NULL,
  `monto_contado` decimal(12,2) DEFAULT NULL,
  `diferencia` decimal(12,2) DEFAULT NULL,
  `estado` varchar(20) NOT NULL,
  `observacion` varchar(500) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_caja`),
  KEY `idx_cajas_usuario_estado` (`id_usuario`,`estado`),
  KEY `idx_cajas_fecha_apertura` (`fecha_apertura`),
  KEY `idx_cajas_fecha_cierre` (`fecha_cierre`),
  CONSTRAINT `fk_cajas_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_cajas_monto_apertura` CHECK (`monto_apertura` >= 0),
  CONSTRAINT `chk_cajas_fecha_cierre` CHECK (`fecha_cierre` is null or `fecha_cierre` >= `fecha_apertura`),
  CONSTRAINT `chk_cajas_monto_cierre` CHECK (`monto_cierre` is null or `monto_cierre` >= 0),
  CONSTRAINT `chk_cajas_monto_contado` CHECK (`monto_contado` is null or `monto_contado` >= 0),
  CONSTRAINT `chk_cajas_estado` CHECK (`estado` in ('abierta','cerrada'))
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cajas` WRITE;
/*!40000 ALTER TABLE `cajas` DISABLE KEYS */;
INSERT INTO `cajas` VALUES (14,9,'2026-07-25 08:00:00',1000.00,'2026-07-25 20:00:00',1368.00,1368.00,1368.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(15,9,'2026-07-27 08:00:00',1000.00,'2026-07-27 20:00:00',2012.00,2012.00,2012.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(16,9,'2026-07-29 08:00:00',1000.00,'2026-07-29 20:00:00',1575.00,1575.00,1575.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(17,9,'2026-07-31 08:00:00',1000.00,'2026-07-31 20:00:00',2345.50,2345.50,2345.50,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(18,9,'2026-08-02 08:00:00',1000.00,'2026-08-02 20:00:00',1666.43,1666.43,1666.43,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(19,9,'2026-08-04 08:00:00',1000.00,'2026-08-04 20:00:00',2023.50,2023.50,2023.50,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(20,9,'2026-08-06 08:00:00',1000.00,'2026-08-06 20:00:00',1144.90,1144.90,1144.90,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(21,9,'2026-08-08 08:00:00',1000.00,'2026-08-08 20:00:00',2081.00,2081.00,2081.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(22,9,'2026-08-10 08:00:00',1000.00,'2026-08-10 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(23,9,'2026-08-12 08:00:00',1000.00,'2026-08-12 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(24,9,'2026-08-14 08:00:00',1000.00,'2026-08-14 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(25,9,'2026-08-16 08:00:00',1000.00,'2026-08-16 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(26,9,'2026-08-18 08:00:00',1000.00,'2026-08-18 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(27,9,'2026-08-20 08:00:00',1000.00,'2026-08-20 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(28,9,'2026-08-23 08:00:00',1000.00,'2026-08-23 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(29,10,'2026-07-26 08:00:00',1000.00,'2026-07-26 20:00:00',1139.90,1144.90,1139.90,-5.00,'cerrada','Caja demo con diferencia historica controlada de C$ -5.00.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(30,10,'2026-07-28 08:00:00',1000.00,'2026-07-28 20:00:00',1637.10,1637.10,1637.10,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(31,10,'2026-07-30 08:00:00',1000.00,'2026-07-30 20:00:00',1200.10,1200.10,1200.10,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(32,10,'2026-08-01 08:00:00',1000.00,'2026-08-01 20:00:00',2115.50,2115.50,2115.50,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(33,10,'2026-08-03 08:00:00',1000.00,'2026-08-03 20:00:00',1425.50,1425.50,1425.50,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(34,10,'2026-08-05 08:00:00',1000.00,'2026-08-05 20:00:00',2736.50,2736.50,2736.50,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(35,10,'2026-08-07 08:00:00',1000.00,'2026-08-07 20:00:00',1517.50,1517.50,1517.50,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(36,10,'2026-08-09 08:00:00',1000.00,'2026-08-09 20:00:00',2633.00,2633.00,2633.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(37,10,'2026-08-11 08:00:00',1000.00,'2026-08-11 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(38,10,'2026-08-13 08:00:00',1000.00,'2026-08-13 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(39,10,'2026-08-15 08:00:00',1000.00,'2026-08-15 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(40,10,'2026-08-17 08:00:00',1000.00,'2026-08-17 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(41,10,'2026-08-23 08:00:00',1000.00,'2026-08-23 20:00:00',1000.00,1000.00,1000.00,0.00,'cerrada','Caja historica demostrativa.','2026-08-23 00:20:36','2026-08-23 00:20:36'),(45,9,'2026-08-26 10:18:25',1000.00,'2026-08-26 10:20:05',450.00,500.00,450.00,-50.00,'cerrada',NULL,'2026-08-26 10:18:25','2026-08-26 10:20:05');
/*!40000 ALTER TABLE `cajas` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias` (
  `id_categoria` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `uq_categorias_nombre` (`nombre`),
  KEY `idx_categorias_estado` (`estado`),
  CONSTRAINT `chk_categorias_estado` CHECK (`estado` in ('activo','inactivo'))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (19,'Rones','Selección de rones para demostración.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(20,'Whiskies','Selección de whiskies para demostración.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(21,'Vodkas','Selección de vodkas para demostración.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(22,'Tequilas','Selección de tequilas para demostración.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(23,'Cervezas','Cervezas nacionales e importadas.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(24,'Vinos','Vinos seleccionados para demostración.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(25,'Licores','Licores y especialidades.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(26,'Bebidas sin alcohol','Bebidas complementarias sin alcohol.','activo','2026-08-20 22:14:01','2026-08-20 22:14:01');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clientes` (
  `id_cliente` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `identificacion` varchar(50) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `es_consumidor_final` tinyint(1) NOT NULL DEFAULT 0,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `uq_clientes_identificacion` (`identificacion`),
  KEY `idx_clientes_nombre` (`nombre`),
  KEY `idx_clientes_estado` (`estado`),
  CONSTRAINT `chk_clientes_es_consumidor_final` CHECK (`es_consumidor_final` in (0,1)),
  CONSTRAINT `chk_clientes_estado` CHECK (`estado` in ('activo','inactivo'))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,'Consumidor final',NULL,NULL,NULL,NULL,1,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(6,'Carlos Hernández','DEMO-CLI-001','+505 0000-0101','carlos.hernandez@example.invalid','Dirección ficticia para demo',0,'activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(7,'María González','DEMO-CLI-002','+505 0000-0102','maria.gonzalez@example.invalid','Dirección ficticia para demo',0,'activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(8,'José Martínez','DEMO-CLI-003','+505 0000-0103','jose.martinez@example.invalid','Dirección ficticia para demo',0,'activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(9,'Ana López','DEMO-CLI-004','+505 0000-0104','ana.lopez@example.invalid','Dirección ficticia para demo',0,'activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(10,'Roberto Castillo','DEMO-CLI-005','+505 0000-0105','roberto.castillo@example.invalid','Dirección ficticia para demo',0,'activo','2026-08-20 22:14:01','2026-08-20 22:14:01');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `compras` (
  `id_compra` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_compra` varchar(50) NOT NULL,
  `numero_documento_proveedor` varchar(80) DEFAULT NULL,
  `id_proveedor` bigint(20) unsigned NOT NULL,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `fecha_compra` datetime NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `descuento` decimal(12,2) NOT NULL,
  `impuesto` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `observacion` text DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_compra`),
  UNIQUE KEY `uq_compras_numero_compra` (`numero_compra`),
  KEY `idx_compras_numero_documento_proveedor` (`numero_documento_proveedor`),
  KEY `idx_compras_fecha_compra` (`fecha_compra`),
  KEY `idx_compras_estado` (`estado`),
  KEY `idx_compras_proveedor_fecha` (`id_proveedor`,`fecha_compra`),
  KEY `idx_compras_usuario` (`id_usuario`),
  CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  CONSTRAINT `fk_compras_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_compras_subtotal` CHECK (`subtotal` >= 0),
  CONSTRAINT `chk_compras_descuento` CHECK (`descuento` >= 0),
  CONSTRAINT `chk_compras_impuesto` CHECK (`impuesto` >= 0),
  CONSTRAINT `chk_compras_total` CHECK (`total` >= 0),
  CONSTRAINT `chk_compras_estado` CHECK (`estado` in ('borrador','recibida','anulada'))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `compras` WRITE;
/*!40000 ALTER TABLE `compras` DISABLE KEYS */;
INSERT INTO `compras` VALUES (21,'DEMO-COM-006','DEMO-PRV-006',18,1,'2026-07-31 09:00:00',3610.00,0.00,541.50,4151.50,'anulada','Compra demo.\n[ANULACIÓN] Anulación demostrativa de compra.','2026-08-20 22:14:01','2026-08-20 22:14:01'),(22,'DEMO-COM-003','DEMO-PRV-003',18,1,'2026-07-26 09:00:00',19030.00,0.00,2854.50,21884.50,'recibida','Compra demostrativa recibida.','2026-08-20 22:14:01','2026-08-20 22:14:01'),(23,'DEMO-COM-004','DEMO-PRV-004',19,1,'2026-07-28 09:00:00',11748.00,0.00,1762.20,13510.20,'recibida','Compra demostrativa recibida.','2026-08-20 22:14:01','2026-08-20 22:14:01'),(24,'DEMO-COM-005','DEMO-PRV-005',17,1,'2026-07-30 09:00:00',4375.00,0.00,656.25,5031.25,'recibida','Compra demostrativa recibida.','2026-08-20 22:14:01','2026-08-20 22:14:01'),(25,'DEMO-COM-001','DEMO-PRV-001',17,1,'2026-07-22 09:00:00',21225.00,0.00,3183.75,24408.75,'recibida','Compra demostrativa recibida.','2026-08-20 22:14:01','2026-08-20 22:14:01'),(26,'DEMO-COM-002','DEMO-PRV-002',20,1,'2026-07-24 09:00:00',32170.00,0.00,4825.50,36995.50,'recibida','Compra demostrativa recibida.','2026-08-20 22:14:01','2026-08-20 22:14:01');
/*!40000 ALTER TABLE `compras` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion` (
  `id_configuracion` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(120) NOT NULL,
  `valor` text NOT NULL,
  `tipo_dato` varchar(30) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `es_critica` tinyint(1) NOT NULL,
  `id_usuario_actualizacion` bigint(20) unsigned DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_configuracion`),
  UNIQUE KEY `uq_configuracion_clave` (`clave`),
  KEY `idx_configuracion_es_critica` (`es_critica`),
  KEY `idx_configuracion_usuario_actualizacion` (`id_usuario_actualizacion`),
  CONSTRAINT `fk_configuracion_usuario_actualizacion` FOREIGN KEY (`id_usuario_actualizacion`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_configuracion_es_critica` CHECK (`es_critica` in (0,1))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (1,'nombre_negocio','Liquorix Demo','texto','Nombre mostrado del negocio.',0,1,'2026-08-07 20:03:16','2026-08-18 15:55:01'),(2,'impuesto_activo','true','logico','Indica si se aplica impuesto a operaciones nuevas.',1,1,'2026-08-07 20:03:16','2026-08-15 15:25:20'),(3,'tasa_impuesto','15.00','decimal','Tasa configurable de impuesto.',1,1,'2026-08-07 20:03:16','2026-08-15 15:25:20'),(4,'descuento_maximo','10.00','decimal','Descuento m├íximo configurable.',1,1,'2026-08-07 20:03:16','2026-08-18 16:13:32'),(5,'control_caja_activo','true','logico','Activa el requisito de caja abierta para vender.',1,NULL,'2026-08-07 20:03:16','2026-08-13 09:44:45'),(6,'serie_comprobante','COMP','texto','Serie configurable para comprobantes internos.',1,1,'2026-08-07 20:03:16','2026-09-21 20:30:30'),(7,'siguiente_numero_comprobante','31','entero','Siguiente n├║mero configurable de comprobante.',1,1,'2026-08-07 20:03:16','2026-09-21 20:30:30'),(15,'jwt_session_epoch','020c1284-45eb-4d59-bcc0-c8ce8080b54d','uuid','Version interna global de sesiones JWT.',1,NULL,'2026-08-20 16:33:05','2026-09-21 20:30:30');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `detalle_compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_compras` (
  `id_detalle_compra` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_compra` bigint(20) unsigned NOT NULL,
  `id_producto` bigint(20) unsigned NOT NULL,
  `cantidad` decimal(12,3) NOT NULL,
  `costo_unitario` decimal(12,2) NOT NULL,
  `descuento` decimal(12,2) NOT NULL,
  `impuesto` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_detalle_compra`),
  KEY `idx_detalle_compras_compra` (`id_compra`),
  KEY `idx_detalle_compras_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_compras_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`),
  CONSTRAINT `fk_detalle_compras_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  CONSTRAINT `chk_detalle_compras_cantidad` CHECK (`cantidad` > 0),
  CONSTRAINT `chk_detalle_compras_costo_unitario` CHECK (`costo_unitario` >= 0),
  CONSTRAINT `chk_detalle_compras_descuento` CHECK (`descuento` >= 0),
  CONSTRAINT `chk_detalle_compras_impuesto` CHECK (`impuesto` >= 0),
  CONSTRAINT `chk_detalle_compras_subtotal` CHECK (`subtotal` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `detalle_compras` WRITE;
/*!40000 ALTER TABLE `detalle_compras` DISABLE KEYS */;
INSERT INTO `detalle_compras` VALUES (16,25,30,5.000,1300.00,0.00,975.00,6500.00,'2026-08-20 22:14:01'),(17,25,31,1.000,1100.00,0.00,165.00,1100.00,'2026-08-20 22:14:01'),(18,25,32,7.000,620.00,0.00,651.00,4340.00,'2026-08-20 22:14:01'),(19,25,33,9.000,350.00,0.00,472.50,3150.00,'2026-08-20 22:14:01'),(20,25,34,11.000,285.00,0.00,470.25,3135.00,'2026-08-20 22:14:01'),(21,25,35,12.000,250.00,0.00,450.00,3000.00,'2026-08-20 22:14:01'),(22,26,43,7.000,760.00,0.00,798.00,5320.00,'2026-08-20 22:14:01'),(23,26,44,8.000,930.00,0.00,1116.00,7440.00,'2026-08-20 22:14:01'),(24,26,45,7.000,1050.00,0.00,1102.50,7350.00,'2026-08-20 22:14:01'),(25,26,46,7.000,980.00,0.00,1029.00,6860.00,'2026-08-20 22:14:01'),(26,26,47,10.000,520.00,0.00,780.00,5200.00,'2026-08-20 22:14:01'),(27,22,29,7.000,650.00,0.00,682.50,4550.00,'2026-08-20 22:14:01'),(28,22,36,1.000,1200.00,0.00,180.00,1200.00,'2026-08-20 22:14:01'),(29,22,37,7.000,560.00,0.00,588.00,3920.00,'2026-08-20 22:14:01'),(30,22,41,12.000,340.00,0.00,612.00,4080.00,'2026-08-20 22:14:01'),(31,22,42,11.000,480.00,0.00,792.00,5280.00,'2026-08-20 22:14:01'),(32,23,39,9.000,390.00,0.00,526.50,3510.00,'2026-08-20 22:14:01'),(33,23,40,9.000,390.00,0.00,526.50,3510.00,'2026-08-20 22:14:01'),(34,23,25,38.000,42.00,0.00,239.40,1596.00,'2026-08-20 22:14:01'),(35,23,26,54.000,28.00,0.00,226.80,1512.00,'2026-08-20 22:14:01'),(36,23,27,54.000,30.00,0.00,243.00,1620.00,'2026-08-20 22:14:01'),(37,24,23,32.000,15.00,0.00,72.00,480.00,'2026-08-20 22:14:01'),(38,24,24,25.000,55.00,0.00,206.25,1375.00,'2026-08-20 22:14:01'),(39,24,38,9.000,280.00,0.00,378.00,2520.00,'2026-08-20 22:14:01'),(40,21,28,3.000,690.00,0.00,310.50,2070.00,'2026-08-20 22:14:01'),(41,21,47,2.000,520.00,0.00,156.00,1040.00,'2026-08-20 22:14:01'),(42,21,35,2.000,250.00,0.00,75.00,500.00,'2026-08-20 22:14:01');
/*!40000 ALTER TABLE `detalle_compras` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `detalle_ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_ventas` (
  `id_detalle_venta` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_venta` bigint(20) unsigned NOT NULL,
  `id_producto` bigint(20) unsigned NOT NULL,
  `cantidad` decimal(12,3) NOT NULL,
  `costo_unitario_historico` decimal(12,2) NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `descuento` decimal(12,2) NOT NULL,
  `impuesto` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_detalle_venta`),
  KEY `idx_detalle_ventas_venta` (`id_venta`),
  KEY `idx_detalle_ventas_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_ventas_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  CONSTRAINT `fk_detalle_ventas_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`),
  CONSTRAINT `chk_detalle_ventas_cantidad` CHECK (`cantidad` > 0),
  CONSTRAINT `chk_detalle_ventas_costo_historico` CHECK (`costo_unitario_historico` >= 0),
  CONSTRAINT `chk_detalle_ventas_precio_unitario` CHECK (`precio_unitario` > 0),
  CONSTRAINT `chk_detalle_ventas_descuento` CHECK (`descuento` >= 0),
  CONSTRAINT `chk_detalle_ventas_impuesto` CHECK (`impuesto` >= 0),
  CONSTRAINT `chk_detalle_ventas_subtotal` CHECK (`subtotal` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `detalle_ventas` WRITE;
/*!40000 ALTER TABLE `detalle_ventas` DISABLE KEYS */;
INSERT INTO `detalle_ventas` VALUES (22,24,35,1.000,250.00,320.00,0.00,48.00,320.00,'2026-08-23 00:20:36'),(23,29,34,1.000,285.00,360.00,0.00,54.00,360.00,'2026-08-23 00:20:36'),(24,29,40,1.000,390.00,520.00,0.00,78.00,520.00,'2026-08-23 00:20:36'),(25,34,33,1.000,350.00,450.00,0.00,67.50,450.00,'2026-08-23 00:20:36'),(26,34,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(27,39,39,1.000,390.00,520.00,0.00,78.00,520.00,'2026-08-23 00:20:36'),(28,39,47,1.000,520.00,650.00,0.00,97.50,650.00,'2026-08-23 00:20:36'),(29,44,42,1.000,480.00,610.00,30.50,86.93,610.00,'2026-08-23 00:20:36'),(30,49,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(31,49,38,1.000,280.00,390.00,0.00,58.50,390.00,'2026-08-23 00:20:36'),(32,49,41,1.000,340.00,450.00,0.00,67.50,450.00,'2026-08-23 00:20:36'),(33,25,27,3.000,30.00,42.00,0.00,18.90,126.00,'2026-08-23 00:20:36'),(34,30,26,3.000,28.00,40.00,0.00,18.00,120.00,'2026-08-23 00:20:36'),(35,30,29,1.000,650.00,820.00,0.00,123.00,820.00,'2026-08-23 00:20:36'),(36,35,25,3.000,42.00,58.00,0.00,26.10,174.00,'2026-08-23 00:20:36'),(37,35,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(38,40,24,2.000,55.00,75.00,0.00,22.50,150.00,'2026-08-23 00:20:36'),(39,40,44,1.000,930.00,1150.00,0.00,172.50,1150.00,'2026-08-23 00:20:36'),(40,45,35,1.000,250.00,320.00,0.00,48.00,320.00,'2026-08-23 00:20:36'),(41,50,34,1.000,285.00,360.00,0.00,54.00,360.00,'2026-08-23 00:20:36'),(42,50,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(43,50,37,1.000,560.00,720.00,0.00,108.00,720.00,'2026-08-23 00:20:36'),(44,26,33,1.000,350.00,450.00,0.00,67.50,450.00,'2026-08-23 00:20:36'),(45,31,40,1.000,390.00,520.00,0.00,78.00,520.00,'2026-08-23 00:20:36'),(46,31,47,1.000,520.00,650.00,0.00,97.50,650.00,'2026-08-23 00:20:36'),(47,36,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(48,36,42,1.000,480.00,610.00,0.00,91.50,610.00,'2026-08-23 00:20:36'),(49,41,39,1.000,390.00,520.00,0.00,78.00,520.00,'2026-08-23 00:20:36'),(50,41,41,1.000,340.00,450.00,0.00,67.50,450.00,'2026-08-23 00:20:36'),(51,46,27,3.000,30.00,42.00,0.00,18.90,126.00,'2026-08-23 00:20:36'),(52,51,26,3.000,28.00,40.00,6.00,17.10,120.00,'2026-08-23 00:20:36'),(53,51,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(54,51,38,1.000,280.00,390.00,0.00,58.50,390.00,'2026-08-23 00:20:36'),(55,27,25,3.000,42.00,58.00,0.00,26.10,174.00,'2026-08-23 00:20:36'),(56,32,29,1.000,650.00,820.00,0.00,123.00,820.00,'2026-08-23 00:20:36'),(57,32,24,2.000,55.00,75.00,0.00,22.50,150.00,'2026-08-23 00:20:36'),(58,37,35,1.000,250.00,320.00,0.00,48.00,320.00,'2026-08-23 00:20:36'),(59,37,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(60,42,34,1.000,285.00,360.00,0.00,54.00,360.00,'2026-08-23 00:20:36'),(61,42,44,1.000,930.00,1150.00,0.00,172.50,1150.00,'2026-08-23 00:20:36'),(62,47,33,1.000,350.00,450.00,0.00,67.50,450.00,'2026-08-23 00:20:36'),(63,52,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(64,52,37,1.000,560.00,720.00,0.00,108.00,720.00,'2026-08-23 00:20:36'),(65,52,47,1.000,520.00,650.00,0.00,97.50,650.00,'2026-08-23 00:20:36'),(66,28,42,1.000,480.00,610.00,0.00,91.50,610.00,'2026-08-23 00:20:36'),(67,33,40,1.000,390.00,520.00,0.00,78.00,520.00,'2026-08-23 00:20:36'),(68,33,41,1.000,340.00,450.00,0.00,67.50,450.00,'2026-08-23 00:20:36'),(69,38,27,3.000,30.00,42.00,6.30,17.96,126.00,'2026-08-23 00:20:36'),(70,38,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(71,43,26,3.000,28.00,40.00,0.00,18.00,120.00,'2026-08-23 00:20:36'),(72,43,39,1.000,390.00,520.00,0.00,78.00,520.00,'2026-08-23 00:20:36'),(73,48,25,3.000,42.00,58.00,0.00,26.10,174.00,'2026-08-23 00:20:36'),(74,53,23,2.000,15.00,25.00,0.00,7.50,50.00,'2026-08-23 00:20:36'),(75,53,24,2.000,55.00,75.00,0.00,22.50,150.00,'2026-08-23 00:20:36'),(76,53,38,1.000,280.00,390.00,0.00,58.50,390.00,'2026-08-23 00:20:36');
/*!40000 ALTER TABLE `detalle_ventas` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `marcas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `marcas` (
  `id_marca` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `imagen_referencia` varchar(255) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_marca`),
  UNIQUE KEY `uq_marcas_nombre` (`nombre`),
  KEY `idx_marcas_estado` (`estado`),
  CONSTRAINT `chk_marcas_estado` CHECK (`estado` in ('activo','inactivo')),
  CONSTRAINT `chk_marcas_imagen_referencia` CHECK (`imagen_referencia` is null or `imagen_referencia` regexp '^[0-9a-f-]{36}[.](jpe?g|png|webp)$')
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `marcas` WRITE;
/*!40000 ALTER TABLE `marcas` DISABLE KEYS */;
INSERT INTO `marcas` VALUES (21,'Flor de Caña','Marca incluida en el catálogo demostrativo.','96e45bc6-cac3-4234-ac59-7abda2dd098f.png','activo','2026-08-20 22:14:01','2026-08-22 22:03:22'),(22,'Zacapa','Marca incluida en el catálogo demostrativo.','0158295d-35e9-4acb-918d-8515dc09bb19.png','activo','2026-08-20 22:14:01','2026-08-22 22:06:07'),(23,'Johnnie Walker','Marca incluida en el catálogo demostrativo.','33da1ad7-c721-4cb6-8fe3-3a00e2aa05bf.png','activo','2026-08-20 22:14:01','2026-08-22 22:04:30'),(24,'Buchanan\'s','Marca incluida en el catálogo demostrativo.','9e04cf29-7243-4137-95b0-81bf89e7bda2.png','activo','2026-08-20 22:14:01','2026-08-22 22:00:56'),(25,'Chivas Regal','Marca incluida en el catálogo demostrativo.','68a47a00-6066-42d9-b96e-da15eb56dce4.png','activo','2026-08-20 22:14:01','2026-08-22 22:02:11'),(26,'Jack Daniel\'s','Marca incluida en el catálogo demostrativo.','e9e31ae8-3128-4fbf-87e1-ccb41e1df136.png','activo','2026-08-20 22:14:01','2026-08-22 22:03:51'),(27,'Absolut','Marca incluida en el catálogo demostrativo.','ee9bf399-1480-43de-a1e6-fd15dee2ca98.png','activo','2026-08-20 22:14:01','2026-08-22 22:00:17'),(28,'Smirnoff','Marca incluida en el catálogo demostrativo.','8451b00c-c6d0-4222-9648-91d203e1f476.png','activo','2026-08-20 22:14:01','2026-08-22 22:05:35'),(29,'José Cuervo','Marca incluida en el catálogo demostrativo.','4828ed49-b3d9-4768-aa06-ebb36f2fbe40.png','activo','2026-08-20 22:14:01','2026-08-22 22:05:07'),(30,'Don Julio','Marca incluida en el catálogo demostrativo.','cbf68142-a708-4a9c-ab7f-2c720c54cc17.png','activo','2026-08-20 22:14:01','2026-08-22 22:03:04'),(31,'Baileys','Marca incluida en el catálogo demostrativo.','45d1a158-ffe4-4b09-98bd-0dae067dc84d.png','activo','2026-08-20 22:14:01','2026-08-22 22:00:43'),(32,'Jägermeister','Marca incluida en el catálogo demostrativo.','0ff44042-23af-48ad-8049-f38de13e09a4.png','activo','2026-08-20 22:14:01','2026-08-22 22:04:13'),(33,'Toña','Marca incluida en el catálogo demostrativo.','c4700498-1d41-4bfd-b0ed-cc991d02fa84.png','activo','2026-08-20 22:14:01','2026-08-22 22:05:47'),(34,'Victoria Clásica','Marca incluida en el catálogo demostrativo.','e48da47b-a9f3-4c29-a6a5-2a88f792da40.png','activo','2026-08-20 22:14:01','2026-08-22 22:05:56'),(35,'Heineken','Marca incluida en el catálogo demostrativo.','38362f6b-3841-4894-92d6-f3e877aa247c.png','activo','2026-08-20 22:14:01','2026-08-22 22:03:33'),(36,'Casillero del Diablo','Marca incluida en el catálogo demostrativo.','4051e85a-8184-4580-bdc0-7d7a1faa03c0.png','activo','2026-08-20 22:14:01','2026-08-22 22:01:55'),(37,'Concha y Toro','Marca incluida en el catálogo demostrativo.','1e100184-ded0-4ac3-a276-58e4bf16e0c7.png','activo','2026-08-20 22:14:01','2026-08-22 22:02:52'),(38,'Coca-Cola','Marca incluida en el catálogo demostrativo.','6336d5fb-e97d-4271-a867-519f6debfe7d.png','activo','2026-08-20 22:14:01','2026-08-22 22:02:26');
/*!40000 ALTER TABLE `marcas` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `metodos_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metodos_pago` (
  `id_metodo_pago` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `requiere_referencia` tinyint(1) NOT NULL,
  `es_efectivo` tinyint(1) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_metodo_pago`),
  UNIQUE KEY `uq_metodos_pago_nombre` (`nombre`),
  KEY `idx_metodos_pago_estado` (`estado`),
  CONSTRAINT `chk_metodos_pago_requiere_referencia` CHECK (`requiere_referencia` in (0,1)),
  CONSTRAINT `chk_metodos_pago_es_efectivo` CHECK (`es_efectivo` in (0,1)),
  CONSTRAINT `chk_metodos_pago_estado` CHECK (`estado` in ('activo','inactivo'))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `metodos_pago` WRITE;
/*!40000 ALTER TABLE `metodos_pago` DISABLE KEYS */;
INSERT INTO `metodos_pago` VALUES (1,'Efectivo',0,1,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(2,'Tarjeta',1,0,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(3,'Transferencia',1,0,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16');
/*!40000 ALTER TABLE `metodos_pago` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `movimientos_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos_caja` (
  `id_movimiento_caja` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_caja` bigint(20) unsigned NOT NULL,
  `id_venta` bigint(20) unsigned DEFAULT NULL,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `tipo_movimiento` varchar(30) NOT NULL,
  `naturaleza` varchar(10) NOT NULL,
  `afecta_efectivo` tinyint(1) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `concepto` varchar(255) NOT NULL,
  `fecha_movimiento` datetime NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_movimiento_caja`),
  KEY `idx_movimientos_caja_caja_fecha` (`id_caja`,`fecha_movimiento`),
  KEY `idx_movimientos_caja_venta` (`id_venta`),
  KEY `idx_movimientos_caja_usuario` (`id_usuario`),
  KEY `idx_movimientos_caja_tipo` (`tipo_movimiento`),
  KEY `idx_movimientos_caja_afecta_efectivo` (`afecta_efectivo`),
  CONSTRAINT `fk_movimientos_caja_caja` FOREIGN KEY (`id_caja`) REFERENCES `cajas` (`id_caja`),
  CONSTRAINT `fk_movimientos_caja_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_movimientos_caja_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`),
  CONSTRAINT `chk_movimientos_caja_tipo` CHECK (`tipo_movimiento` in ('venta','ingreso','egreso','devolucion','anulacion')),
  CONSTRAINT `chk_movimientos_caja_naturaleza` CHECK (`naturaleza` in ('entrada','salida')),
  CONSTRAINT `chk_movimientos_caja_afecta_efectivo` CHECK (`afecta_efectivo` in (0,1)),
  CONSTRAINT `chk_movimientos_caja_monto` CHECK (`monto` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `movimientos_caja` WRITE;
/*!40000 ALTER TABLE `movimientos_caja` DISABLE KEYS */;
INSERT INTO `movimientos_caja` VALUES (21,14,24,9,'venta','entrada',1,368.00,'Venta en efectivo','2026-07-25 10:00:00','2026-08-23 00:20:36'),(22,15,29,9,'venta','entrada',1,1012.00,'Venta en efectivo','2026-07-27 15:00:00','2026-08-23 00:20:36'),(23,16,34,9,'venta','entrada',1,575.00,'Venta en efectivo','2026-07-29 11:00:00','2026-08-23 00:20:36'),(24,17,39,9,'venta','entrada',1,1345.50,'Venta en efectivo','2026-07-31 17:00:00','2026-08-23 00:20:36'),(25,18,44,9,'venta','entrada',1,666.43,'Venta en efectivo','2026-08-02 12:00:00','2026-08-23 00:20:36'),(26,19,49,9,'venta','entrada',1,1023.50,'Venta en efectivo','2026-08-04 18:00:00','2026-08-23 00:20:36'),(27,20,25,9,'venta','entrada',1,144.90,'Venta en efectivo','2026-08-06 11:00:00','2026-08-23 00:20:36'),(28,21,30,9,'venta','entrada',1,1081.00,'Venta en efectivo','2026-08-08 16:00:00','2026-08-23 00:20:36'),(29,29,46,10,'venta','entrada',1,144.90,'Venta en efectivo','2026-07-26 10:00:00','2026-08-23 00:20:36'),(30,30,51,10,'venta','entrada',1,637.10,'Venta en efectivo','2026-07-28 16:00:00','2026-08-23 00:20:36'),(31,31,27,10,'venta','entrada',1,200.10,'Venta en efectivo','2026-07-30 11:00:00','2026-08-23 00:20:36'),(32,32,32,10,'venta','entrada',1,1115.50,'Venta en efectivo','2026-08-01 18:00:00','2026-08-23 00:20:36'),(33,33,37,10,'venta','entrada',1,425.50,'Venta en efectivo','2026-08-03 12:00:00','2026-08-23 00:20:36'),(34,34,42,10,'venta','entrada',1,1736.50,'Venta en efectivo','2026-08-05 17:00:00','2026-08-23 00:20:36'),(35,35,47,10,'venta','entrada',1,517.50,'Venta en efectivo','2026-08-07 10:00:00','2026-08-23 00:20:36'),(36,36,52,10,'venta','entrada',1,1633.00,'Venta en efectivo','2026-08-09 15:00:00','2026-08-23 00:20:36'),(52,45,NULL,9,'egreso','salida',1,500.00,'retiro administrativo','2026-08-26 10:19:24','2026-08-26 10:19:24');
/*!40000 ALTER TABLE `movimientos_caja` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos_inventario` (
  `id_movimiento_inventario` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_producto` bigint(20) unsigned NOT NULL,
  `tipo_movimiento` varchar(40) NOT NULL,
  `naturaleza` varchar(10) NOT NULL,
  `cantidad` decimal(12,3) NOT NULL,
  `existencia_anterior` decimal(12,3) NOT NULL,
  `existencia_posterior` decimal(12,3) NOT NULL,
  `tipo_referencia` varchar(40) NOT NULL,
  `id_referencia` bigint(20) unsigned NOT NULL,
  `motivo` varchar(500) DEFAULT NULL,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `fecha_movimiento` datetime NOT NULL,
  PRIMARY KEY (`id_movimiento_inventario`),
  KEY `idx_movimientos_inventario_producto_fecha` (`id_producto`,`fecha_movimiento`),
  KEY `idx_movimientos_inventario_tipo_referencia` (`tipo_referencia`,`id_referencia`),
  KEY `idx_movimientos_inventario_tipo_movimiento` (`tipo_movimiento`),
  KEY `idx_movimientos_inventario_usuario` (`id_usuario`),
  CONSTRAINT `fk_movimientos_inventario_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  CONSTRAINT `fk_movimientos_inventario_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_movimientos_inventario_naturaleza` CHECK (`naturaleza` in ('entrada','salida')),
  CONSTRAINT `chk_movimientos_inventario_cantidad` CHECK (`cantidad` > 0),
  CONSTRAINT `chk_movimientos_inventario_existencia_anterior` CHECK (`existencia_anterior` >= 0),
  CONSTRAINT `chk_movimientos_inventario_existencia_posterior` CHECK (`existencia_posterior` >= 0),
  CONSTRAINT `chk_movimientos_inventario_id_referencia` CHECK (`id_referencia` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `movimientos_inventario` WRITE;
/*!40000 ALTER TABLE `movimientos_inventario` DISABLE KEYS */;
INSERT INTO `movimientos_inventario` VALUES (38,29,'compra','entrada',7.000,0.000,7.000,'compra',22,'Recepción de compra',1,'2026-07-26 10:00:00'),(39,36,'compra','entrada',1.000,0.000,1.000,'compra',22,'Recepción de compra',1,'2026-07-26 10:00:00'),(40,37,'compra','entrada',7.000,0.000,7.000,'compra',22,'Recepción de compra',1,'2026-07-26 10:00:00'),(41,41,'compra','entrada',12.000,0.000,12.000,'compra',22,'Recepción de compra',1,'2026-07-26 10:00:00'),(42,42,'compra','entrada',11.000,0.000,11.000,'compra',22,'Recepción de compra',1,'2026-07-26 10:00:00'),(43,39,'compra','entrada',9.000,0.000,9.000,'compra',23,'Recepción de compra',1,'2026-07-28 10:00:00'),(44,40,'compra','entrada',9.000,0.000,9.000,'compra',23,'Recepción de compra',1,'2026-07-28 10:00:00'),(45,25,'compra','entrada',38.000,0.000,38.000,'compra',23,'Recepción de compra',1,'2026-07-28 10:00:00'),(46,26,'compra','entrada',54.000,0.000,54.000,'compra',23,'Recepción de compra',1,'2026-07-28 10:00:00'),(47,27,'compra','entrada',54.000,0.000,54.000,'compra',23,'Recepción de compra',1,'2026-07-28 10:00:00'),(48,23,'compra','entrada',32.000,0.000,32.000,'compra',24,'Recepción de compra',1,'2026-07-30 10:00:00'),(49,24,'compra','entrada',25.000,0.000,25.000,'compra',24,'Recepción de compra',1,'2026-07-30 10:00:00'),(50,38,'compra','entrada',9.000,0.000,9.000,'compra',24,'Recepción de compra',1,'2026-07-30 10:00:00'),(51,30,'compra','entrada',5.000,0.000,5.000,'compra',25,'Recepción de compra',1,'2026-07-22 10:00:00'),(52,31,'compra','entrada',1.000,0.000,1.000,'compra',25,'Recepción de compra',1,'2026-07-22 10:00:00'),(53,32,'compra','entrada',7.000,0.000,7.000,'compra',25,'Recepción de compra',1,'2026-07-22 10:00:00'),(54,33,'compra','entrada',9.000,0.000,9.000,'compra',25,'Recepción de compra',1,'2026-07-22 10:00:00'),(55,34,'compra','entrada',11.000,0.000,11.000,'compra',25,'Recepción de compra',1,'2026-07-22 10:00:00'),(56,35,'compra','entrada',12.000,0.000,12.000,'compra',25,'Recepción de compra',1,'2026-07-22 10:00:00'),(57,43,'compra','entrada',7.000,0.000,7.000,'compra',26,'Recepción de compra',1,'2026-07-24 10:00:00'),(58,44,'compra','entrada',8.000,0.000,8.000,'compra',26,'Recepción de compra',1,'2026-07-24 10:00:00'),(59,45,'compra','entrada',7.000,0.000,7.000,'compra',26,'Recepción de compra',1,'2026-07-24 10:00:00'),(60,46,'compra','entrada',7.000,0.000,7.000,'compra',26,'Recepción de compra',1,'2026-07-24 10:00:00'),(61,47,'compra','entrada',10.000,0.000,10.000,'compra',26,'Recepción de compra',1,'2026-07-24 10:00:00'),(69,28,'compra','entrada',3.000,0.000,3.000,'compra',21,'Recepción de compra',1,'2026-07-31 10:00:00'),(70,47,'compra','entrada',2.000,10.000,12.000,'compra',21,'Recepción de compra',1,'2026-07-31 10:00:00'),(71,35,'compra','entrada',2.000,12.000,14.000,'compra',21,'Recepción de compra',1,'2026-07-31 10:00:00'),(72,28,'anulacion_compra','salida',3.000,3.000,0.000,'compra',21,'Anulación de compra',1,'2026-07-31 11:00:00'),(73,47,'anulacion_compra','salida',2.000,12.000,10.000,'compra',21,'Anulación de compra',1,'2026-07-31 11:00:00'),(74,35,'anulacion_compra','salida',2.000,14.000,12.000,'compra',21,'Anulación de compra',1,'2026-07-31 11:00:00'),(75,23,'venta','salida',2.000,32.000,30.000,'venta',51,'Venta confirmada',10,'2026-07-28 16:00:00'),(76,23,'venta','salida',2.000,30.000,28.000,'venta',34,'Venta confirmada',9,'2026-07-29 11:00:00'),(77,23,'venta','salida',2.000,28.000,26.000,'venta',37,'Venta confirmada',10,'2026-08-03 12:00:00'),(78,23,'venta','salida',2.000,26.000,24.000,'venta',49,'Venta confirmada',9,'2026-08-04 18:00:00'),(79,23,'venta','salida',2.000,24.000,22.000,'venta',52,'Venta confirmada',10,'2026-08-09 15:00:00'),(80,23,'venta','salida',2.000,22.000,20.000,'venta',35,'Venta confirmada',9,'2026-08-10 10:00:00'),(81,23,'venta','salida',2.000,20.000,18.000,'venta',38,'Venta confirmada',10,'2026-08-15 12:00:00'),(82,23,'venta','salida',2.000,18.000,16.000,'venta',50,'Venta confirmada',9,'2026-08-16 12:00:00'),(83,23,'venta','salida',2.000,16.000,14.000,'venta',36,'Venta confirmada',9,'2026-08-23 10:00:00'),(84,23,'venta','salida',2.000,14.000,12.000,'venta',53,'Venta confirmada',10,'2026-08-23 18:00:00'),(85,24,'venta','salida',2.000,25.000,23.000,'venta',32,'Venta confirmada',10,'2026-08-01 18:00:00'),(86,24,'venta','salida',2.000,23.000,21.000,'venta',40,'Venta confirmada',9,'2026-08-12 14:00:00'),(87,24,'venta','salida',2.000,21.000,19.000,'venta',53,'Venta confirmada',10,'2026-08-23 18:00:00'),(88,25,'venta','salida',3.000,38.000,35.000,'venta',27,'Venta confirmada',10,'2026-07-30 11:00:00'),(89,25,'venta','salida',3.000,35.000,32.000,'venta',35,'Venta confirmada',9,'2026-08-10 10:00:00'),(90,25,'venta','salida',3.000,32.000,29.000,'venta',48,'Venta confirmada',10,'2026-08-23 11:00:00'),(91,26,'venta','salida',3.000,54.000,51.000,'venta',51,'Venta confirmada',10,'2026-07-28 16:00:00'),(92,26,'venta','salida',3.000,51.000,48.000,'venta',30,'Venta confirmada',9,'2026-08-08 16:00:00'),(93,26,'venta','salida',3.000,48.000,45.000,'venta',43,'Venta confirmada',10,'2026-08-17 18:00:00'),(94,27,'venta','salida',3.000,54.000,51.000,'venta',46,'Venta confirmada',10,'2026-07-26 10:00:00'),(95,27,'venta','salida',3.000,51.000,48.000,'venta',25,'Venta confirmada',9,'2026-08-06 11:00:00'),(96,27,'venta','salida',3.000,48.000,45.000,'venta',38,'Venta confirmada',10,'2026-08-15 12:00:00'),(97,29,'venta','salida',1.000,7.000,6.000,'venta',32,'Venta confirmada',10,'2026-08-01 18:00:00'),(98,29,'venta','salida',1.000,6.000,5.000,'venta',30,'Venta confirmada',9,'2026-08-08 16:00:00'),(99,33,'venta','salida',1.000,9.000,8.000,'venta',34,'Venta confirmada',9,'2026-07-29 11:00:00'),(100,33,'venta','salida',1.000,8.000,7.000,'venta',47,'Venta confirmada',10,'2026-08-07 10:00:00'),(101,33,'venta','salida',1.000,7.000,6.000,'venta',26,'Venta confirmada',9,'2026-08-18 16:00:00'),(102,34,'venta','salida',1.000,11.000,10.000,'venta',29,'Venta confirmada',9,'2026-07-27 15:00:00'),(103,34,'venta','salida',1.000,10.000,9.000,'venta',42,'Venta confirmada',10,'2026-08-05 17:00:00'),(104,34,'venta','salida',1.000,9.000,8.000,'venta',50,'Venta confirmada',9,'2026-08-16 12:00:00'),(105,35,'venta','salida',1.000,12.000,11.000,'venta',24,'Venta confirmada',9,'2026-07-25 10:00:00'),(106,35,'venta','salida',1.000,11.000,10.000,'venta',37,'Venta confirmada',10,'2026-08-03 12:00:00'),(107,35,'venta','salida',1.000,10.000,9.000,'venta',45,'Venta confirmada',9,'2026-08-14 18:00:00'),(108,37,'venta','salida',1.000,7.000,6.000,'venta',52,'Venta confirmada',10,'2026-08-09 15:00:00'),(109,37,'venta','salida',1.000,6.000,5.000,'venta',50,'Venta confirmada',9,'2026-08-16 12:00:00'),(110,38,'venta','salida',1.000,9.000,8.000,'venta',51,'Venta confirmada',10,'2026-07-28 16:00:00'),(111,38,'venta','salida',1.000,8.000,7.000,'venta',49,'Venta confirmada',9,'2026-08-04 18:00:00'),(112,38,'venta','salida',1.000,7.000,6.000,'venta',53,'Venta confirmada',10,'2026-08-23 18:00:00'),(113,39,'venta','salida',1.000,9.000,8.000,'venta',39,'Venta confirmada',9,'2026-07-31 17:00:00'),(114,39,'venta','salida',1.000,8.000,7.000,'venta',43,'Venta confirmada',10,'2026-08-17 18:00:00'),(115,39,'venta','salida',1.000,7.000,6.000,'venta',41,'Venta confirmada',9,'2026-08-23 17:00:00'),(116,40,'venta','salida',1.000,9.000,8.000,'venta',29,'Venta confirmada',9,'2026-07-27 15:00:00'),(117,40,'venta','salida',1.000,8.000,7.000,'venta',33,'Venta confirmada',10,'2026-08-13 16:00:00'),(118,40,'venta','salida',1.000,7.000,6.000,'venta',31,'Venta confirmada',9,'2026-08-20 13:00:00'),(119,40,'anulacion_venta','entrada',1.000,6.000,7.000,'venta',31,'Anulación demostrativa por corrección de operación',1,'2026-08-20 13:30:00'),(120,41,'venta','salida',1.000,12.000,11.000,'venta',49,'Venta confirmada',9,'2026-08-04 18:00:00'),(121,41,'venta','salida',1.000,11.000,10.000,'venta',33,'Venta confirmada',10,'2026-08-13 16:00:00'),(122,41,'venta','salida',1.000,10.000,9.000,'venta',41,'Venta confirmada',9,'2026-08-23 17:00:00'),(123,42,'venta','salida',1.000,11.000,10.000,'venta',44,'Venta confirmada',9,'2026-08-02 12:00:00'),(124,42,'venta','salida',1.000,10.000,9.000,'venta',28,'Venta confirmada',10,'2026-08-11 11:00:00'),(125,42,'venta','salida',1.000,9.000,8.000,'venta',36,'Venta confirmada',9,'2026-08-23 10:00:00'),(126,44,'venta','salida',1.000,8.000,7.000,'venta',42,'Venta confirmada',10,'2026-08-05 17:00:00'),(127,44,'venta','salida',1.000,7.000,6.000,'venta',40,'Venta confirmada',9,'2026-08-12 14:00:00'),(128,47,'venta','salida',1.000,10.000,9.000,'venta',39,'Venta confirmada',9,'2026-07-31 17:00:00'),(129,47,'venta','salida',1.000,9.000,8.000,'venta',52,'Venta confirmada',10,'2026-08-09 15:00:00'),(130,47,'venta','salida',1.000,8.000,7.000,'venta',31,'Venta confirmada',9,'2026-08-20 13:00:00'),(131,47,'anulacion_venta','entrada',1.000,7.000,8.000,'venta',31,'Anulación demostrativa por corrección de operación',1,'2026-08-20 13:30:00');
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `pagos_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pagos_venta` (
  `id_pago` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_venta` bigint(20) unsigned NOT NULL,
  `id_metodo_pago` bigint(20) unsigned NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `referencia` varchar(120) DEFAULT NULL,
  `monto_recibido` decimal(12,2) DEFAULT NULL,
  `cambio` decimal(12,2) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_pago`),
  KEY `idx_pagos_venta_venta` (`id_venta`),
  KEY `idx_pagos_venta_metodo` (`id_metodo_pago`),
  CONSTRAINT `fk_pagos_venta_metodo` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`),
  CONSTRAINT `fk_pagos_venta_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`),
  CONSTRAINT `chk_pagos_venta_monto` CHECK (`monto` > 0),
  CONSTRAINT `chk_pagos_venta_monto_recibido` CHECK (`monto_recibido` is null or `monto_recibido` >= `monto`),
  CONSTRAINT `chk_pagos_venta_cambio` CHECK (`cambio` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `pagos_venta` WRITE;
/*!40000 ALTER TABLE `pagos_venta` DISABLE KEYS */;
INSERT INTO `pagos_venta` VALUES (23,24,1,368.00,NULL,400.00,32.00,'2026-08-23 00:20:36'),(24,29,1,1012.00,NULL,1100.00,88.00,'2026-08-23 00:20:36'),(25,34,1,575.00,NULL,600.00,25.00,'2026-08-23 00:20:36'),(26,39,1,1345.50,NULL,1400.00,54.50,'2026-08-23 00:20:36'),(27,44,1,666.43,NULL,700.00,33.57,'2026-08-23 00:20:36'),(28,49,1,1023.50,NULL,1100.00,76.50,'2026-08-23 00:20:36'),(29,25,1,144.90,NULL,200.00,55.10,'2026-08-23 00:20:36'),(30,30,1,1081.00,NULL,1100.00,19.00,'2026-08-23 00:20:36'),(31,35,2,257.60,'DEMO-TAR-0009',NULL,0.00,'2026-08-23 00:20:36'),(32,40,2,1495.00,'DEMO-TAR-0010',NULL,0.00,'2026-08-23 00:20:36'),(33,45,2,368.00,'DEMO-TAR-0011',NULL,0.00,'2026-08-23 00:20:36'),(34,50,2,1299.50,'DEMO-TAR-0012',NULL,0.00,'2026-08-23 00:20:36'),(35,26,2,517.50,'DEMO-TAR-0013',NULL,0.00,'2026-08-23 00:20:36'),(36,31,2,1345.50,'DEMO-TAR-0014',NULL,0.00,'2026-08-23 00:20:36'),(37,36,3,759.00,'DEMO-TRF-0015',NULL,0.00,'2026-08-23 00:20:36'),(38,41,3,1115.50,'DEMO-TRF-0016',NULL,0.00,'2026-08-23 00:20:36'),(39,46,1,144.90,NULL,200.00,55.10,'2026-08-23 00:20:36'),(40,51,1,637.10,NULL,700.00,62.90,'2026-08-23 00:20:36'),(41,27,1,200.10,NULL,300.00,99.90,'2026-08-23 00:20:36'),(42,32,1,1115.50,NULL,1200.00,84.50,'2026-08-23 00:20:36'),(43,37,1,425.50,NULL,500.00,74.50,'2026-08-23 00:20:36'),(44,42,1,1736.50,NULL,1800.00,63.50,'2026-08-23 00:20:36'),(45,47,1,517.50,NULL,600.00,82.50,'2026-08-23 00:20:36'),(46,52,1,1633.00,NULL,1700.00,67.00,'2026-08-23 00:20:36'),(47,28,2,701.50,'DEMO-TAR-0025',NULL,0.00,'2026-08-23 00:20:36'),(48,33,2,1115.50,'DEMO-TAR-0026',NULL,0.00,'2026-08-23 00:20:36'),(49,38,2,195.16,'DEMO-TAR-0027',NULL,0.00,'2026-08-23 00:20:36'),(50,43,2,736.00,'DEMO-TAR-0028',NULL,0.00,'2026-08-23 00:20:36'),(51,48,2,200.10,'DEMO-TAR-0029',NULL,0.00,'2026-08-23 00:20:36'),(52,53,3,678.50,'DEMO-TRF-0030',NULL,0.00,'2026-08-23 00:20:36');
/*!40000 ALTER TABLE `pagos_venta` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permisos` (
  `id_permiso` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(100) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `modulo` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `uq_permisos_codigo` (`codigo`),
  KEY `idx_permisos_modulo` (`modulo`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'usuarios.ver','Ver usuarios','usuarios','Consultar usuarios autorizados.','2026-08-07 20:03:16'),(2,'usuarios.crear','Crear usuarios','usuarios','Registrar usuarios.','2026-08-07 20:03:16'),(3,'usuarios.editar','Editar usuarios','usuarios','Modificar usuarios.','2026-08-07 20:03:16'),(4,'usuarios.desactivar','Desactivar usuarios','usuarios','Desactivar usuarios sin eliminar su historial.','2026-08-07 20:03:16'),(5,'roles.ver','Ver roles','roles','Consultar roles y permisos.','2026-08-07 20:03:16'),(6,'roles.administrar','Administrar roles','roles','Gestionar permisos asignados a roles.','2026-08-07 20:03:16'),(7,'productos.ver','Ver productos','productos','Consultar productos.','2026-08-07 20:03:16'),(8,'productos.crear','Crear productos','productos','Registrar productos.','2026-08-07 20:03:16'),(9,'productos.editar','Editar productos','productos','Modificar productos.','2026-08-07 20:03:16'),(10,'productos.desactivar','Desactivar productos','productos','Desactivar productos sin eliminar su historial.','2026-08-07 20:03:16'),(11,'clientes.ver','Ver clientes','clientes','Consultar clientes.','2026-08-07 20:03:16'),(12,'clientes.crear','Crear clientes','clientes','Registrar clientes.','2026-08-07 20:03:16'),(13,'clientes.editar','Editar clientes','clientes','Modificar clientes.','2026-08-07 20:03:16'),(14,'proveedores.ver','Ver proveedores','proveedores','Consultar proveedores.','2026-08-07 20:03:16'),(15,'proveedores.crear','Crear proveedores','proveedores','Registrar proveedores.','2026-08-07 20:03:16'),(16,'proveedores.editar','Editar proveedores','proveedores','Modificar proveedores.','2026-08-07 20:03:16'),(17,'compras.ver','Ver compras','compras','Consultar compras.','2026-08-07 20:03:16'),(18,'compras.crear','Crear compras','compras','Registrar compras en borrador.','2026-08-07 20:03:16'),(19,'compras.confirmar','Confirmar compras','compras','Confirmar compras de forma transaccional.','2026-08-07 20:03:16'),(20,'compras.anular','Anular compras','compras','Anular compras autorizadas.','2026-08-07 20:03:16'),(21,'inventario.ver','Ver inventario','inventario','Consultar existencias y movimientos.','2026-08-07 20:03:16'),(22,'inventario.ajustar','Ajustar inventario','inventario','Registrar ajustes autorizados de inventario.','2026-08-07 20:03:16'),(23,'ventas.ver','Ver ventas','ventas','Consultar ventas.','2026-08-07 20:03:16'),(24,'ventas.crear','Crear ventas','ventas','Registrar y confirmar ventas autorizadas.','2026-08-07 20:03:16'),(25,'ventas.anular','Anular ventas','ventas','Anular ventas autorizadas.','2026-08-07 20:03:16'),(26,'caja.abrir','Abrir caja','caja','Abrir una sesi├│n de caja.','2026-08-07 20:03:16'),(27,'caja.cerrar','Cerrar caja','caja','Cerrar una sesi├│n de caja.','2026-08-07 20:03:16'),(28,'caja.movimientos','Gestionar movimientos de caja','caja','Registrar y consultar movimientos autorizados de caja.','2026-08-07 20:03:16'),(29,'reportes.ver','Ver reportes','reportes','Consultar reportes autorizados.','2026-08-07 20:03:16'),(30,'reportes.exportar','Exportar reportes','reportes','Exportar reportes autorizados.','2026-08-07 20:03:16'),(31,'dashboard.ver','Ver dashboard','dashboard','Consultar indicadores y gr├íficos autorizados.','2026-08-07 20:03:16'),(32,'bitacora.ver','Ver bit├ícora','bitacora','Consultar la bit├ícora.','2026-08-07 20:03:16'),(33,'respaldos.crear','Crear respaldos','respaldos','Crear respaldos autorizados.','2026-08-07 20:03:16'),(34,'respaldos.restaurar','Restaurar respaldos','respaldos','Ejecutar restauraciones autorizadas.','2026-08-07 20:03:16'),(35,'respaldos.ver','Ver respaldos','respaldos','Consultar metadatos de respaldos y restauraciones.','2026-08-07 20:03:16'),(36,'configuracion.ver','Ver configuraci├│n','configuracion','Consultar la configuraci├│n general.','2026-08-07 20:03:16'),(37,'configuracion.editar','Editar configuraci├│n','configuracion','Modificar par├ímetros autorizados de configuraci├│n.','2026-08-07 20:03:16'),(75,'dashboard.graficos','Ver gráficos del dashboard','dashboard','Permite consultar los gráficos analíticos del dashboard.','2026-08-18 17:29:24'),(76,'caja.supervisar','Supervisar cierres de caja','caja','Consultar cierres históricos de todos los usuarios.','2026-08-26 10:58:00'),(77,'ventas.supervisar','Supervisar ventas','ventas','Consultar ventas de todos los vendedores.','2026-08-26 10:58:13');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `productos` (
  `id_producto` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(60) NOT NULL,
  `codigo_barras` varchar(80) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen_referencia` varchar(255) DEFAULT NULL,
  `id_categoria` bigint(20) unsigned NOT NULL,
  `id_marca` bigint(20) unsigned NOT NULL,
  `id_unidad` bigint(20) unsigned NOT NULL,
  `costo_promedio` decimal(12,2) NOT NULL DEFAULT 0.00,
  `precio_venta` decimal(12,2) NOT NULL,
  `existencia` decimal(12,3) NOT NULL DEFAULT 0.000,
  `existencia_minima` decimal(12,3) NOT NULL DEFAULT 0.000,
  `porcentaje_impuesto` decimal(5,2) NOT NULL DEFAULT 0.00,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `uq_productos_codigo` (`codigo`),
  UNIQUE KEY `uq_productos_codigo_barras` (`codigo_barras`),
  KEY `idx_productos_nombre` (`nombre`),
  KEY `idx_productos_categoria` (`id_categoria`),
  KEY `idx_productos_marca` (`id_marca`),
  KEY `idx_productos_unidad` (`id_unidad`),
  KEY `idx_productos_estado` (`estado`),
  CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  CONSTRAINT `fk_productos_marca` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id_marca`),
  CONSTRAINT `fk_productos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades_medida` (`id_unidad`),
  CONSTRAINT `chk_productos_costo_promedio` CHECK (`costo_promedio` >= 0),
  CONSTRAINT `chk_productos_precio_venta` CHECK (`precio_venta` > 0),
  CONSTRAINT `chk_productos_existencia` CHECK (`existencia` >= 0),
  CONSTRAINT `chk_productos_existencia_minima` CHECK (`existencia_minima` >= 0),
  CONSTRAINT `chk_productos_porcentaje_impuesto` CHECK (`porcentaje_impuesto` >= 0),
  CONSTRAINT `chk_productos_estado` CHECK (`estado` in ('activo','inactivo')),
  CONSTRAINT `chk_productos_imagen_referencia` CHECK (`imagen_referencia` is null or `imagen_referencia` regexp '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpe?g|png|webp)$')
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (23,'SAL-AGU-060','9900000000025','Agua Mineral 600 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','7974fb46-2526-4064-a2c0-84602720777d.png',26,38,1,15.00,25.00,12.000,12.000,15.00,'activo','2026-08-20 22:14:01','2026-09-21 20:30:29'),(24,'SAL-COC-2L','9900000000024','Coca-Cola 2 L','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','fd69e1f5-5e0d-4aae-897e-58344266c03b.webp',26,38,1,55.00,75.00,19.000,10.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(25,'CER-HEI-UND','9900000000020','Heineken','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','070ff746-244d-4b87-89e3-60770f5ed9cb.png',23,35,1,42.00,58.00,29.000,18.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(26,'CER-VIC-UND','9900000000019','Victoria Clásica','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','b344a140-96e9-46f1-b6cb-386aaf6c4699.png',23,34,1,28.00,40.00,45.000,24.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(27,'CER-TON-UND','9900000000018','Toña','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','15f2c952-f350-4b80-8ba5-b3750b6fd8aa.png',23,33,1,30.00,42.00,45.000,24.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(28,'LIC-JAG-070','9900000000017','Jägermeister 700 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','8766dbb5-8257-4ebf-9e54-f00137cb064b.png',25,32,1,690.00,860.00,0.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 22:54:47'),(29,'LIC-BAI-075','9900000000016','Baileys Original 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','66650eb4-4e00-4f66-9155-a24f3e1ba130.png',25,31,1,650.00,820.00,5.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(30,'RON-ZAC-23','9900000000006','Zacapa 23 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','e31d1068-9846-4471-9ea5-395e8be90f3a.webp',19,22,1,1300.00,1590.00,5.000,2.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 23:03:02'),(31,'RON-FDC-18','9900000000005','Flor de Caña 18 Años 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','65e04397-c0da-4fa6-9f92-b308ec06306c.png',19,21,1,1100.00,1390.00,1.000,2.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 22:58:53'),(32,'RON-FDC-12','9900000000004','Flor de Caña 12 Años 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','db0ef7ba-3971-418a-ae49-80f2cab6f4c5.png',19,21,1,620.00,780.00,7.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 22:59:14'),(33,'RON-FDC-07','9900000000003','Flor de Caña 7 Gran Reserva 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','9bce2da6-8ac9-463f-9e01-9a68994ef6c6.png',19,21,1,350.00,450.00,6.000,4.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(34,'RON-FDC-05','9900000000002','Flor de Caña 5 Años 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','a7bf8ded-0235-47b0-a403-dd7a734e1745.png',19,21,1,285.00,360.00,8.000,5.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(35,'RON-FDC-04','9900000000001','Flor de Caña 4 Extra Seco 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','89e025e0-c221-45b7-96bb-8a97b5ca3f69.png',19,21,1,250.00,320.00,9.000,5.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(36,'TEQ-DJB-075','9900000000015','Don Julio Blanco 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','e6c742a5-4594-48cf-bb35-2c15ded45fe6.webp',22,30,1,1200.00,1490.00,1.000,2.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 23:05:59'),(37,'TEQ-JCE-075','9900000000014','José Cuervo Especial 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','af8fc603-91b8-4e82-ba6e-fecbc29bb9f1.png',22,29,1,560.00,720.00,5.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(38,'VIN-CYT-RES','9900000000023','Concha y Toro Reservado 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','f24cd7a9-28e5-43cc-aef7-81b68912a3ab.png',24,37,1,280.00,390.00,6.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(39,'VIN-CDT-MER','9900000000022','Casillero del Diablo Merlot 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','c06c7fac-9f3e-40a5-8f17-016f840df721.png',24,36,1,390.00,520.00,6.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(40,'VIN-CDT-CAB','9900000000021','Casillero del Diablo Cabernet Sauvignon 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','6207e8f6-d258-421b-9774-3f86cca0a770.png',24,36,1,390.00,520.00,7.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(41,'VOD-SMI-021','9900000000013','Smirnoff No. 21 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','23ce232b-f773-41c0-85d2-f61d6162bb56.png',21,28,1,340.00,450.00,9.000,4.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(42,'VOD-ABS-075','9900000000012','Absolut Original 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','033e52a3-68ae-4b86-b38f-75a93bfed02e.webp',21,27,1,480.00,610.00,8.000,4.000,15.00,'activo','2026-08-20 22:14:01','2026-09-21 20:30:29'),(43,'WHI-JDO-075','9900000000011','Jack Daniel\'s Old No. 7 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','3f9d51ea-cb55-41d3-b706-ef87405cc2b6.png',20,26,1,760.00,950.00,7.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 22:55:25'),(44,'WHI-CHI-12','9900000000010','Chivas Regal 12 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','f8a0c130-ebe7-4239-ae0a-b864ea2d0b55.png',20,25,1,930.00,1150.00,6.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36'),(45,'WHI-BUC-12','9900000000009','Buchanan\'s Deluxe 12 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','665682dc-ee9a-428f-b511-b1cd90f9f977.png',20,24,1,1050.00,1280.00,7.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 22:51:12'),(46,'WHI-JWB-075','9900000000008','Johnnie Walker Black Label 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','a39e0aa0-72b8-4fd0-aedc-4fda4efc1b83.png',20,23,1,980.00,1190.00,7.000,3.000,15.00,'activo','2026-08-20 22:14:01','2026-08-22 22:54:25'),(47,'WHI-JWR-075','9900000000007','Johnnie Walker Red Label 750 ml','Producto demostrativo; costos y precios no representan valores comerciales oficiales.','760fb0f7-38f9-4a4e-be8b-175210fda667.png',20,23,1,520.00,650.00,8.000,4.000,15.00,'activo','2026-08-20 22:14:01','2026-08-23 00:20:36');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `proveedores` (
  `id_proveedor` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `identificacion_fiscal` varchar(50) DEFAULT NULL,
  `contacto` varchar(150) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `uq_proveedores_identificacion_fiscal` (`identificacion_fiscal`),
  KEY `idx_proveedores_nombre` (`nombre`),
  KEY `idx_proveedores_estado` (`estado`),
  CONSTRAINT `chk_proveedores_estado` CHECK (`estado` in ('activo','inactivo'))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `proveedores` WRITE;
/*!40000 ALTER TABLE `proveedores` DISABLE KEYS */;
INSERT INTO `proveedores` VALUES (17,'Distribuidora Central de Nicaragua','DEMO-RUC-001','Equipo comercial demo','+505 0000-0001','central@example.invalid','Dirección ficticia, Managua','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(18,'Comercializadora del Pacífico','DEMO-RUC-002','Equipo comercial demo','+505 0000-0002','pacifico@example.invalid','Dirección ficticia, Masaya','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(19,'Distribuciones León','DEMO-RUC-003','Equipo comercial demo','+505 0000-0003','leon@example.invalid','Dirección ficticia, León','activo','2026-08-20 22:14:01','2026-08-20 22:14:01'),(20,'Importadora Premium Nicaragua','DEMO-RUC-004','Equipo comercial demo','+505 0000-0004','premium@example.invalid','Dirección ficticia, Managua','activo','2026-08-20 22:14:01','2026-08-20 22:14:01');
/*!40000 ALTER TABLE `proveedores` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `respaldos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `respaldos` (
  `id_respaldo` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre_archivo` varchar(255) NOT NULL,
  `ruta_segura` varchar(500) NOT NULL,
  `tamano_bytes` bigint(20) unsigned DEFAULT NULL,
  `tipo` varchar(30) NOT NULL,
  `operacion` varchar(20) NOT NULL,
  `estado` varchar(30) NOT NULL,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `mensaje_resultado` text DEFAULT NULL,
  `fecha_operacion` datetime NOT NULL,
  `fecha_finalizacion` datetime DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `formato_version` varchar(30) DEFAULT NULL,
  `archivo_disponible` tinyint(1) NOT NULL DEFAULT 0,
  `id_respaldo_origen` bigint(20) unsigned DEFAULT NULL,
  `id_respaldo_preventivo` bigint(20) unsigned DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_respaldo`),
  KEY `idx_respaldos_nombre_archivo` (`nombre_archivo`),
  KEY `idx_respaldos_tipo` (`tipo`),
  KEY `idx_respaldos_operacion` (`operacion`),
  KEY `idx_respaldos_estado` (`estado`),
  KEY `idx_respaldos_fecha_operacion` (`fecha_operacion`),
  KEY `idx_respaldos_usuario_fecha` (`id_usuario`,`fecha_operacion`),
  KEY `fk_respaldos_origen` (`id_respaldo_origen`),
  KEY `fk_respaldos_preventivo` (`id_respaldo_preventivo`),
  KEY `idx_respaldos_retencion` (`tipo`,`operacion`,`estado`,`archivo_disponible`,`fecha_finalizacion`),
  CONSTRAINT `fk_respaldos_origen` FOREIGN KEY (`id_respaldo_origen`) REFERENCES `respaldos` (`id_respaldo`),
  CONSTRAINT `fk_respaldos_preventivo` FOREIGN KEY (`id_respaldo_preventivo`) REFERENCES `respaldos` (`id_respaldo`),
  CONSTRAINT `fk_respaldos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_respaldos_tamano_bytes` CHECK (`tamano_bytes` is null or `tamano_bytes` >= 0),
  CONSTRAINT `chk_respaldos_operacion` CHECK (`operacion` in ('respaldo','restauracion')),
  CONSTRAINT `chk_respaldos_estado` CHECK (`estado` in ('en_proceso','exitoso','fallido')),
  CONSTRAINT `chk_respaldos_checksum` CHECK (`checksum_sha256` is null or `checksum_sha256` regexp '^[0-9a-f]{64}$'),
  CONSTRAINT `chk_respaldos_archivo_disponible` CHECK (`archivo_disponible` in (0,1))
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `respaldos` WRITE;
/*!40000 ALTER TABLE `respaldos` DISABLE KEYS */;
/*!40000 ALTER TABLE `respaldos` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `rol_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rol_permisos` (
  `id_rol` bigint(20) unsigned NOT NULL,
  `id_permiso` bigint(20) unsigned NOT NULL,
  `concedido_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_rol`,`id_permiso`),
  KEY `idx_rol_permisos_permiso_rol` (`id_permiso`,`id_rol`),
  CONSTRAINT `fk_rol_permisos_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permisos` (`id_permiso`),
  CONSTRAINT `fk_rol_permisos_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `rol_permisos` WRITE;
/*!40000 ALTER TABLE `rol_permisos` DISABLE KEYS */;
INSERT INTO `rol_permisos` VALUES (1,1,'2026-08-07 20:03:16'),(1,2,'2026-08-07 20:03:16'),(1,3,'2026-08-07 20:03:16'),(1,4,'2026-08-07 20:03:16'),(1,5,'2026-08-07 20:03:16'),(1,6,'2026-08-07 20:03:16'),(1,7,'2026-08-07 20:03:16'),(1,8,'2026-08-07 20:03:16'),(1,9,'2026-08-07 20:03:16'),(1,10,'2026-08-07 20:03:16'),(1,11,'2026-08-07 20:03:16'),(1,12,'2026-08-07 20:03:16'),(1,13,'2026-08-07 20:03:16'),(1,14,'2026-08-07 20:03:16'),(1,15,'2026-08-07 20:03:16'),(1,16,'2026-08-07 20:03:16'),(1,17,'2026-08-07 20:03:16'),(1,18,'2026-08-07 20:03:16'),(1,19,'2026-08-07 20:03:16'),(1,20,'2026-08-07 20:03:16'),(1,21,'2026-08-07 20:03:16'),(1,22,'2026-08-07 20:03:16'),(1,23,'2026-08-07 20:03:16'),(1,24,'2026-08-07 20:03:16'),(1,25,'2026-08-07 20:03:16'),(1,26,'2026-08-07 20:03:16'),(1,27,'2026-08-07 20:03:16'),(1,28,'2026-08-07 20:03:16'),(1,29,'2026-08-07 20:03:16'),(1,30,'2026-08-07 20:03:16'),(1,31,'2026-08-07 20:03:16'),(1,32,'2026-08-07 20:03:16'),(1,33,'2026-08-07 20:03:16'),(1,34,'2026-08-07 20:03:16'),(1,35,'2026-08-07 20:03:16'),(1,36,'2026-08-07 20:03:16'),(1,37,'2026-08-07 20:03:16'),(1,75,'2026-08-18 17:29:24'),(1,76,'2026-08-26 10:58:00'),(1,77,'2026-08-26 10:58:13'),(2,7,'2026-08-07 20:03:16'),(2,11,'2026-08-07 20:03:16'),(2,12,'2026-08-07 20:03:16'),(2,13,'2026-08-07 20:03:16'),(2,21,'2026-08-07 20:03:16'),(2,23,'2026-08-07 20:03:16'),(2,24,'2026-08-07 20:03:16'),(2,26,'2026-08-07 20:03:16'),(2,27,'2026-08-07 20:03:16'),(2,28,'2026-08-07 20:03:16'),(2,31,'2026-08-07 20:03:16'),(3,7,'2026-08-07 20:03:16'),(3,11,'2026-08-07 20:03:16'),(3,21,'2026-08-07 20:03:16'),(3,23,'2026-08-07 20:03:16'),(3,29,'2026-08-07 20:03:16'),(3,31,'2026-08-07 20:03:16'),(3,75,'2026-08-18 17:29:24'),(3,77,'2026-08-26 10:58:13');
/*!40000 ALTER TABLE `rol_permisos` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id_rol` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT 0,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uq_roles_nombre` (`nombre`),
  KEY `idx_roles_estado` (`estado`),
  CONSTRAINT `chk_roles_estado` CHECK (`estado` in ('activo','inactivo'))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrador','Acceso administrativo seg├║n permisos asignados.',1,'activo','2026-08-07 20:03:15','2026-08-07 20:03:15'),(2,'Vendedor','Operaci├│n comercial y de caja seg├║n permisos asignados.',1,'activo','2026-08-07 20:03:15','2026-08-07 20:03:15'),(3,'Consulta','Consulta de informaci├│n autorizada sin operaciones de escritura.',1,'activo','2026-08-07 20:03:15','2026-08-07 20:03:15');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `unidades_medida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `unidades_medida` (
  `id_unidad` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `abreviatura` varchar(20) NOT NULL,
  `permite_decimales` tinyint(1) NOT NULL DEFAULT 0,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_unidad`),
  UNIQUE KEY `uq_unidades_medida_nombre` (`nombre`),
  UNIQUE KEY `uq_unidades_medida_abreviatura` (`abreviatura`),
  KEY `idx_unidades_medida_estado` (`estado`),
  CONSTRAINT `chk_unidades_medida_permite_decimales` CHECK (`permite_decimales` in (0,1)),
  CONSTRAINT `chk_unidades_medida_estado` CHECK (`estado` in ('activo','inactivo'))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `unidades_medida` WRITE;
/*!40000 ALTER TABLE `unidades_medida` DISABLE KEYS */;
INSERT INTO `unidades_medida` VALUES (1,'Unidad','UND',0,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(2,'Caja','CAJ',0,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(3,'Paquete','PAQ',0,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(4,'Litro','L',1,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16'),(5,'Mililitro','ML',1,'activo','2026-08-07 20:03:16','2026-08-07 20:03:16');
/*!40000 ALTER TABLE `unidades_medida` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `usuario_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario_roles` (
  `id_usuario` bigint(20) unsigned NOT NULL,
  `id_rol` bigint(20) unsigned NOT NULL,
  `asignado_por` bigint(20) unsigned DEFAULT NULL,
  `asignado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`,`id_rol`),
  KEY `idx_usuario_roles_rol_usuario` (`id_rol`,`id_usuario`),
  KEY `idx_usuario_roles_asignado_por` (`asignado_por`),
  CONSTRAINT `fk_usuario_roles_asignado_por` FOREIGN KEY (`asignado_por`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_usuario_roles_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  CONSTRAINT `fk_usuario_roles_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `usuario_roles` WRITE;
/*!40000 ALTER TABLE `usuario_roles` DISABLE KEYS */;
INSERT INTO `usuario_roles` VALUES (1,1,NULL,'2026-08-10 09:55:16'),(9,2,1,'2026-08-22 23:45:08'),(10,2,1,'2026-08-22 23:46:10'),(11,3,1,'2026-08-22 23:47:22');
/*!40000 ALTER TABLE `usuario_roles` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id_usuario` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `nombre_usuario` varchar(80) NOT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `intentos_fallidos` int(10) unsigned NOT NULL DEFAULT 0,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uq_usuarios_nombre_usuario` (`nombre_usuario`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  KEY `idx_usuarios_estado` (`estado`),
  KEY `idx_usuarios_bloqueado_hasta` (`bloqueado_hasta`),
  CONSTRAINT `chk_usuarios_estado` CHECK (`estado` in ('activo','inactivo')),
  CONSTRAINT `chk_usuarios_intentos_fallidos` CHECK (`intentos_fallidos` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Administrador','LIQUORIX','administrador','admin@liquorix.demo','$2b$12$n.ma6mHuuAx2bq5db8nkseHC3EBszIOk0FOnyjZnF/RDRTvRiCh/C','activo',0,NULL,'2026-09-21 19:58:42','2026-08-10 09:55:16','2026-09-21 20:30:30'),(9,'Carlos','Mendoza','carlos.mendoza','carlos.mendoza@liquorix.demo','$2b$12$.EfFz1F4kjNWGe1nQ4WBOeImmVW6a0Wf6oiax9Z5mMtQY2z4346i2','activo',0,NULL,'2026-08-26 11:01:44','2026-08-22 23:45:08','2026-09-21 20:30:30'),(10,'Sofía','Rojas','sofia.rojas','sofia.rojas@liquorix.demo','$2b$12$w9nHPheEKQ9aGZ1WS5085.ggQSRioiHMq66E0I3IveD5DiOJj/LP6','activo',0,NULL,NULL,'2026-08-22 23:46:10','2026-09-21 20:30:30'),(11,'Daniel','López','daniel.lopez','daniel.lopez@liquorix.demo','$2b$12$fOUlMjwQFTUJM.kgX9lnaunm.3giE4QC.1rwkA87aox1becmO4sFu','activo',0,NULL,NULL,'2026-08-22 23:47:22','2026-09-21 20:30:30');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ventas` (
  `id_venta` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_venta` varchar(50) NOT NULL,
  `numero_factura` varchar(50) DEFAULT NULL,
  `id_cliente` bigint(20) unsigned NOT NULL,
  `id_usuario` bigint(20) unsigned NOT NULL,
  `id_caja` bigint(20) unsigned DEFAULT NULL,
  `fecha_venta` datetime NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `descuento` decimal(12,2) NOT NULL,
  `impuesto` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `motivo_anulacion` varchar(500) DEFAULT NULL,
  `anulada_por` bigint(20) unsigned DEFAULT NULL,
  `anulada_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_venta`),
  UNIQUE KEY `uq_ventas_numero_venta` (`numero_venta`),
  UNIQUE KEY `uq_ventas_numero_factura` (`numero_factura`),
  KEY `idx_ventas_fecha_venta` (`fecha_venta`),
  KEY `idx_ventas_estado` (`estado`),
  KEY `idx_ventas_usuario_fecha` (`id_usuario`,`fecha_venta`),
  KEY `idx_ventas_cliente` (`id_cliente`),
  KEY `idx_ventas_caja` (`id_caja`),
  KEY `idx_ventas_anulada_por` (`anulada_por`),
  CONSTRAINT `fk_ventas_anulada_por` FOREIGN KEY (`anulada_por`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_ventas_caja` FOREIGN KEY (`id_caja`) REFERENCES `cajas` (`id_caja`),
  CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_ventas_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_ventas_subtotal` CHECK (`subtotal` >= 0),
  CONSTRAINT `chk_ventas_descuento` CHECK (`descuento` >= 0),
  CONSTRAINT `chk_ventas_impuesto` CHECK (`impuesto` >= 0),
  CONSTRAINT `chk_ventas_total` CHECK (`total` >= 0),
  CONSTRAINT `chk_ventas_estado` CHECK (`estado` in ('preparacion','completada','anulada'))
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
INSERT INTO `ventas` VALUES (24,'DEMO-VEN-0001','DEMO-FAC-0001',1,9,14,'2026-07-25 10:00:00',320.00,0.00,48.00,368.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(25,'DEMO-VEN-0007','DEMO-FAC-0007',1,9,20,'2026-08-06 11:00:00',126.00,0.00,18.90,144.90,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(26,'DEMO-VEN-0013','DEMO-FAC-0013',1,9,26,'2026-08-18 16:00:00',450.00,0.00,67.50,517.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(27,'DEMO-VEN-0019','DEMO-FAC-0019',1,10,31,'2026-07-30 11:00:00',174.00,0.00,26.10,200.10,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(28,'DEMO-VEN-0025','DEMO-FAC-0025',1,10,37,'2026-08-11 11:00:00',610.00,0.00,91.50,701.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(29,'DEMO-VEN-0002','DEMO-FAC-0002',6,9,15,'2026-07-27 15:00:00',880.00,0.00,132.00,1012.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(30,'DEMO-VEN-0008','DEMO-FAC-0008',6,9,21,'2026-08-08 16:00:00',940.00,0.00,141.00,1081.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(31,'DEMO-VEN-0014','DEMO-FAC-0014',6,9,27,'2026-08-20 13:00:00',1170.00,0.00,175.50,1345.50,'anulada','Anulación demostrativa por corrección de operación',1,'2026-08-20 13:30:00','2026-08-23 00:20:36'),(32,'DEMO-VEN-0020','DEMO-FAC-0020',6,10,32,'2026-08-01 18:00:00',970.00,0.00,145.50,1115.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(33,'DEMO-VEN-0026','DEMO-FAC-0026',6,10,38,'2026-08-13 16:00:00',970.00,0.00,145.50,1115.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(34,'DEMO-VEN-0003','DEMO-FAC-0003',7,9,16,'2026-07-29 11:00:00',500.00,0.00,75.00,575.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(35,'DEMO-VEN-0009','DEMO-FAC-0009',7,9,22,'2026-08-10 10:00:00',224.00,0.00,33.60,257.60,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(36,'DEMO-VEN-0015','DEMO-FAC-0015',7,9,28,'2026-08-23 10:00:00',660.00,0.00,99.00,759.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(37,'DEMO-VEN-0021','DEMO-FAC-0021',7,10,33,'2026-08-03 12:00:00',370.00,0.00,55.50,425.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(38,'DEMO-VEN-0027','DEMO-FAC-0027',7,10,39,'2026-08-15 12:00:00',176.00,6.30,25.46,195.16,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(39,'DEMO-VEN-0004','DEMO-FAC-0004',8,9,17,'2026-07-31 17:00:00',1170.00,0.00,175.50,1345.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(40,'DEMO-VEN-0010','DEMO-FAC-0010',8,9,23,'2026-08-12 14:00:00',1300.00,0.00,195.00,1495.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(41,'DEMO-VEN-0016','DEMO-FAC-0016',8,9,28,'2026-08-23 17:00:00',970.00,0.00,145.50,1115.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(42,'DEMO-VEN-0022','DEMO-FAC-0022',8,10,34,'2026-08-05 17:00:00',1510.00,0.00,226.50,1736.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(43,'DEMO-VEN-0028','DEMO-FAC-0028',8,10,40,'2026-08-17 18:00:00',640.00,0.00,96.00,736.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(44,'DEMO-VEN-0005','DEMO-FAC-0005',9,9,18,'2026-08-02 12:00:00',610.00,30.50,86.93,666.43,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(45,'DEMO-VEN-0011','DEMO-FAC-0011',9,9,24,'2026-08-14 18:00:00',320.00,0.00,48.00,368.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(46,'DEMO-VEN-0017','DEMO-FAC-0017',9,10,29,'2026-07-26 10:00:00',126.00,0.00,18.90,144.90,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(47,'DEMO-VEN-0023','DEMO-FAC-0023',9,10,35,'2026-08-07 10:00:00',450.00,0.00,67.50,517.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(48,'DEMO-VEN-0029','DEMO-FAC-0029',9,10,41,'2026-08-23 11:00:00',174.00,0.00,26.10,200.10,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(49,'DEMO-VEN-0006','DEMO-FAC-0006',10,9,19,'2026-08-04 18:00:00',890.00,0.00,133.50,1023.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(50,'DEMO-VEN-0012','DEMO-FAC-0012',10,9,25,'2026-08-16 12:00:00',1130.00,0.00,169.50,1299.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(51,'DEMO-VEN-0018','DEMO-FAC-0018',10,10,30,'2026-07-28 16:00:00',560.00,6.00,83.10,637.10,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(52,'DEMO-VEN-0024','DEMO-FAC-0024',10,10,36,'2026-08-09 15:00:00',1420.00,0.00,213.00,1633.00,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36'),(53,'DEMO-VEN-0030','DEMO-FAC-0030',10,10,41,'2026-08-23 18:00:00',590.00,0.00,88.50,678.50,'completada',NULL,NULL,NULL,'2026-08-23 00:20:36');
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

