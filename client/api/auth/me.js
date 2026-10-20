const store = require('../store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = store.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  res.status(200).json({ user });
};
