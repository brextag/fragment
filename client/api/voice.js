const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json(store.getVoiceState());
  }

  if (req.method === 'POST') {
    const { action, channelId, userId, user, changes } = store.parseBody(req);

    if (action === 'join' && channelId && user) {
      const voiceUser = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        ...changes
      };
      const room = store.joinVoiceRoom(channelId, voiceUser);
      return res.status(200).json({ voiceRooms: store.getVoiceState(), room });
    }

    if (action === 'leave' && userId) {
      store.leaveVoiceRoom(userId);
      return res.status(200).json({ voiceRooms: store.getVoiceState() });
    }

    if (action === 'update' && userId && changes) {
      store.updateVoiceUser(userId, changes);
      return res.status(200).json({ voiceRooms: store.getVoiceState() });
    }

    return res.status(400).json({ error: 'Invalid action or parameters' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
