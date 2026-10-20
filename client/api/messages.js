const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query || {};
  const channelId = query.channelId;

  if (req.method === 'GET') {
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }
    const msgs = store.getMessages(channelId);
    return res.status(200).json(msgs);
  }

  if (req.method === 'POST') {
    const body = store.parseBody(req);
    const action = query.action || body.action;

    if (action === 'react') {
      const { messageId, userId, emoji } = body;
      const updated = store.toggleReaction(messageId, userId, emoji);
      return res.status(200).json(updated);
    }

    const { channelId: postChannelId, userId, content, attachments, replyToId } = body;
    const targetChannel = postChannelId || channelId;
    if (!targetChannel || !userId) {
      return res.status(400).json({ error: 'channelId and userId are required' });
    }

    const newMsg = store.addMessage({
      channelId: targetChannel,
      userId,
      content,
      attachments,
      replyToId
    });

    return res.status(200).json(newMsg);
  }

  if (req.method === 'PATCH') {
    const { messageId, userId, newContent } = store.parseBody(req);
    const updated = store.editMessage(messageId, userId, newContent);
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    const body = store.parseBody(req);
    const messageId = body.messageId || query.messageId;
    const userId = body.userId || query.userId;
    const deleted = store.deleteMessage(messageId, userId);
    return res.status(200).json({ success: deleted });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
