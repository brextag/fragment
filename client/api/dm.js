const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query || {};

  if (req.method === 'GET') {
    const { userA, userB } = query;
    if (!userA || !userB) {
      return res.status(400).json({ error: 'userA and userB are required' });
    }
    const dm = store.getDirectMessages(userA, userB);
    return res.status(200).json(dm);
  }

  if (req.method === 'POST') {
    const { dmId, userId, recipientId, content, attachments } = store.parseBody(req);
    let targetDmId = dmId;
    if (!targetDmId && userId && recipientId) {
      const dm = store.getDirectMessages(userId, recipientId);
      targetDmId = dm.id;
    }

    if (!targetDmId || !userId) {
      return res.status(400).json({ error: 'dmId (or recipientId) and userId are required' });
    }

    const result = store.addDirectMessage(targetDmId, userId, content, attachments);
    return res.status(200).json(result);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
