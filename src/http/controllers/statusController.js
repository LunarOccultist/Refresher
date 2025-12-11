async function getStatus(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getStatus,
};