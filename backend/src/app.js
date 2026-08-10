const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const healthRoutes = require('./modules/health/health.routes');
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
app.use('/api/v1/health', healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
