const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, icon, ownerId } = store.parseBody(req);
  if (!name || !ownerId) {
    return res.status(400).json({ error: 'name and ownerId are required' });
  }

  const newServer = store.createServer(name, icon, ownerId);
  res.status(200).json(newServer);
};
