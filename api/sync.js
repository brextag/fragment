const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query || {};
  const channelId = query.channelId;
  const userId = query.userId;
  const since = query.since;

  const syncData = store.getSyncData(channelId, userId, since);
  res.status(200).json(syncData);
};
