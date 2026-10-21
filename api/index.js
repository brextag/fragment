import store from '../lib/store.js';

export default async function handler(req, res) {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname.replace(/\/$/, ''); // Remove trailing slash
  const query = req.query || {};

  // If rewritten via path parameter (e.g. ?path=auth/register)
  if (query.path) {
    const rawPath = Array.isArray(query.path) ? query.path.join('/') : query.path;
    if (!rawPath.startsWith('/api')) {
      pathname = '/api/' + rawPath;
    } else {
      pathname = rawPath;
    }
  }

  // 1. Health
  if (pathname === '/api/health') {
    return res.status(200).json({
      status: 'ok',
      service: 'Fragment Unified Serverless API',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Auth: Register
  if (pathname === '/api/auth/register') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const { username, password, displayName, avatar, banner, color } = store.parseBody(req);
      const result = store.registerUser({ username, password, displayName, avatar, banner, color });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Registration failed.' });
    }
  }

  // 3. Auth: Login
  if (pathname === '/api/auth/login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const { username, password, clientVaultUser } = store.parseBody(req);
      const result = store.loginUser({ username, password, clientVaultUser });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Login failed.' });
    }
  }

  // 4. Auth: Me
  if (pathname === '/api/auth/me') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const user = store.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    return res.status(200).json({ user });
  }

  // 5. Auth: Logout
  if (pathname === '/api/auth/logout') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      store.logoutUser(token);
    }
    return res.status(200).json({ success: true });
  }

  // 6. Initial Data
  if (pathname === '/api/initial-data') {
    return res.status(200).json({
      users: store.getUsers(),
      servers: store.getServers(),
      voiceRooms: store.getVoiceState()
    });
  }

  // 7. Messages: /api/messages or /api/messages/:channelId
  if (pathname.startsWith('/api/messages')) {
    const parts = pathname.split('/');
    const pathChannelId = parts.length > 3 ? parts[3] : null;
    const channelId = pathChannelId || query.channelId;

    if (req.method === 'GET') {
      if (!channelId) return res.status(400).json({ error: 'channelId is required' });
      return res.status(200).json(store.getMessages(channelId));
    }

    if (req.method === 'POST') {
      const body = store.parseBody(req);
      const action = query.action || body.action;

      if (action === 'react') {
        const { messageId, userId, emoji } = body;
        const updated = store.toggleReaction(messageId, userId, emoji);
        return res.status(200).json(updated);
      }

      const targetChannel = body.channelId || channelId;
      if (!targetChannel || !body.userId) {
        return res.status(400).json({ error: 'channelId and userId are required' });
      }

      const newMsg = store.addMessage({
        channelId: targetChannel,
        userId: body.userId,
        content: body.content,
        attachments: body.attachments,
        replyToId: body.replyToId
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

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 8. Direct Messages: /api/dm or /api/dm/:userA/:userB
  if (pathname.startsWith('/api/dm')) {
    const parts = pathname.split('/');
    let userA = parts.length > 4 ? parts[3] : query.userA;
    let userB = parts.length > 4 ? parts[4] : query.userB;

    if (req.method === 'GET') {
      if (!userA || !userB) return res.status(400).json({ error: 'userA and userB are required' });
      return res.status(200).json(store.getDirectMessages(userA, userB));
    }

    if (req.method === 'POST') {
      const { dmId, userId, recipientId, content, attachments } = store.parseBody(req);
      let targetDmId = dmId;
      if (!targetDmId && userId && recipientId) {
        const dm = store.getDirectMessages(userId, recipientId);
        targetDmId = dm.id;
      }
      if (!targetDmId || !userId) {
        return res.status(400).json({ error: 'dmId and userId are required' });
      }
      const result = store.addDirectMessage(targetDmId, userId, content, attachments);
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 9. Servers: /api/servers
  if (pathname === '/api/servers') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { name, icon, ownerId } = store.parseBody(req);
    if (!name || !ownerId) return res.status(400).json({ error: 'name and ownerId are required' });
    const newServer = store.createServer(name, icon, ownerId);
    return res.status(200).json(newServer);
  }

  // 10. Channels: /api/channels
  if (pathname === '/api/channels') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { serverId, name, type, category } = store.parseBody(req);
    if (!serverId || !name || !type) return res.status(400).json({ error: 'serverId, name, and type are required' });
    const newChannel = store.createChannel(serverId, name, type, category);
    if (!newChannel) return res.status(404).json({ error: 'Server not found' });
    return res.status(200).json(newChannel);
  }

  // 11. User Profile: /api/users/profile
  if (pathname === '/api/users/profile') {
    if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
    const { userId, displayName, avatar, banner, color, customStatus, bio, status } = store.parseBody(req);
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const result = store.updateUserProfile(userId, { displayName, avatar, banner, color, customStatus, bio, status });
    if (!result) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json(result);
  }

  // 12. User Status: /api/users/status
  if (pathname === '/api/users/status') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { userId, status, customStatus } = store.parseBody(req);
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const updated = store.updateUserStatus(userId, status, customStatus);
    return res.status(200).json(updated || { id: userId, status, customStatus });
  }

  // 13. Smart Sync: /api/sync
  if (pathname === '/api/sync') {
    const channelId = query.channelId || url.searchParams.get('channelId');
    const userId = query.userId || url.searchParams.get('userId');
    const since = query.since || url.searchParams.get('since');
    const voiceChannelId = query.voiceChannelId || url.searchParams.get('voiceChannelId');
    let voiceHeartbeat = null;
    if (voiceChannelId && userId) {
      voiceHeartbeat = {
        channelId: voiceChannelId,
        userId,
        username: query.username || url.searchParams.get('username') || 'User',
        displayName: query.displayName || url.searchParams.get('displayName') || 'User',
        avatar: query.avatar || url.searchParams.get('avatar') || '',
        isMuted: (query.isMuted || url.searchParams.get('isMuted')) === 'true',
        isDeafened: (query.isDeafened || url.searchParams.get('isDeafened')) === 'true',
        isSpeaking: (query.isSpeaking || url.searchParams.get('isSpeaking')) === 'true'
      };
    }
    const syncData = store.getSyncData(channelId, userId, since, voiceHeartbeat);
    return res.status(200).json(syncData);
  }

  // 14. Voice: /api/voice
  if (pathname === '/api/voice') {
    if (req.method === 'GET') {
      const userId = query.userId || url.searchParams.get('userId');
      return res.status(200).json({
        voiceRooms: store.getVoiceState(),
        voiceSignals: userId ? store.popVoiceSignals(userId) : []
      });
    }
    if (req.method === 'POST') {
      const { action, channelId, userId, user, changes, toUserId, fromUserId, signal } = store.parseBody(req);
      if (action === 'join' && channelId && user) {
        const voiceUser = {
          userId: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar,
          banner: user.banner,
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
        store.updateVoiceUser(userId, changes, channelId);
        return res.status(200).json({ voiceRooms: store.getVoiceState() });
      }
      if (action === 'signal' && toUserId && fromUserId && signal) {
        store.addVoiceSignal({ toUserId, fromUserId, channelId, signal });
        return res.status(200).json({ ok: true, voiceSignals: store.popVoiceSignals(fromUserId) });
      }
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 15. Upload: /api/upload
  if (pathname === '/api/upload') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const body = store.parseBody(req);
      if (body.data) {
        return res.status(200).json({
          url: body.data,
          name: body.name || 'attachment',
          size: body.size || body.data.length,
          mimetype: body.type || 'image/png'
        });
      }
      return res.status(200).json({
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
        name: 'uploaded-file.jpg',
        size: 1024,
        mimetype: 'image/jpeg'
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Endpoint not found: ' + pathname });
}
