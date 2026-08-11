const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const brandRoutes = require('./modules/brands/brand.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const clientRoutes = require('./modules/clients/client.routes');
const healthRoutes = require('./modules/health/health.routes');
const productRoutes = require('./modules/products/product.routes');
const purchaseRoutes = require('./modules/purchases/purchase.routes');
const saleRoutes = require('./modules/sales/sale.routes');
const supplierRoutes = require('./modules/suppliers/supplier.routes');
const unitRoutes = require('./modules/units/unit.routes');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

const corsOptions = {
  origin: env.corsOrigin,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/units', unitRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
