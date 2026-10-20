const store = require('../../store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, status, customStatus } = store.parseBody(req);
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const updated = store.updateUserStatus(userId, status, customStatus);
  res.status(200).json(updated || { id: userId, status, customStatus });
};
