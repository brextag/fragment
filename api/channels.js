const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { serverId, name, type, category } = store.parseBody(req);
  if (!serverId || !name || !type) {
    return res.status(400).json({ error: 'serverId, name, and type are required' });
  }

  const newChannel = store.createChannel(serverId, name, type, category);
  if (!newChannel) {
    return res.status(404).json({ error: 'Server not found' });
  }

  res.status(200).json(newChannel);
};
