const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.port, () => {
  console.log(`Servidor ejecutándose en el puerto ${env.port}`);
});

module.exports = server;
