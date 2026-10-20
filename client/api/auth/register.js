const store = require('../store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, displayName, avatar, color } = store.parseBody(req);
    const result = store.registerUser({ username, password, displayName, avatar, color });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
};
