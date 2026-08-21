const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const accessRoutes = require('./modules/access/access.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const backupRoutes = require('./modules/backups/backup.routes');
const authRoutes = require('./modules/auth/auth.routes');
const brandRoutes = require('./modules/brands/brand.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const clientRoutes = require('./modules/clients/client.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const healthRoutes = require('./modules/health/health.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const productRoutes = require('./modules/products/product.routes');
const publicCatalogRoutes = require('./modules/publicCatalog/publicCatalog.routes');
const purchaseRoutes = require('./modules/purchases/purchase.routes');
const reportRoutes = require('./modules/reports/report.routes');
const saleRoutes = require('./modules/sales/sale.routes');
const settingRoutes = require('./modules/settings/setting.routes');
const supplierRoutes = require('./modules/suppliers/supplier.routes');
const unitRoutes = require('./modules/units/unit.routes');
const userRoutes = require('./modules/users/user.routes');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');
const { maintenanceMiddleware } = require('./services/operationCoordinator');

const app = express();

const corsOptions = {
  origin: env.corsOrigin,
  exposedHeaders: ['Content-Disposition'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(maintenanceMiddleware);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/backups', backupRoutes);
app.use('/api/v1/roles', accessRoutes.roleRouter);
app.use('/api/v1/permissions', accessRoutes.permissionRouter);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/cash', cashRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/public/catalog', publicCatalogRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/units', unitRoutes);
app.use('/api/v1/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
