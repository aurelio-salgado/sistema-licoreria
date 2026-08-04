function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
  });
}

module.exports = notFoundHandler;
