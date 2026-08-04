function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
}

module.exports = { getHealth };
