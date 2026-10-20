const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    status: 'ok',
    service: 'Fragment Serverless API',
    timestamp: new Date().toISOString()
  });
};
