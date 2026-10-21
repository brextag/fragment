import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine storage path based on environment
let DATA_FILE = path.join(__dirname, '../../server/data.json');
if (process.env.VERCEL || !fs.existsSync(path.dirname(DATA_FILE))) {
  DATA_FILE = path.join('/tmp', 'fragment_data.json');
}

const SECRET = process.env.SESSION_SECRET || 'fragment_jwt_secret_2026_super_secure';

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop';

const INITIAL_DATA = {
  users: [],
  sessions: {},
  servers: [
    {
      id: 's_main',
      name: 'General Community',
      icon: '💬',
      banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop',
      ownerId: null,
      channels: [
        { id: 'c_general', serverId: 's_main', name: 'general', type: 'text', category: 'TEXT CHANNELS', topic: 'Welcome to General Chat! Send a message to start chatting.' },
        { id: 'c_announcements', serverId: 's_main', name: 'announcements', type: 'text', category: 'TEXT CHANNELS', topic: 'Community announcements & updates' },
        { id: 'c_voice_lounge', serverId: 's_main', name: 'Voice Lounge', type: 'voice', category: 'VOICE CHANNELS', topic: 'Hang out and voice chat' },
        { id: 'c_gaming_voice', serverId: 's_main', name: 'Gaming Voice', type: 'voice', category: 'VOICE CHANNELS', topic: 'Voice chat for games' }
      ],
      members: []
    }
  ],
  messages: [],
  directMessages: [],
  voiceRooms: {}
};

class Store {
  constructor() {
    this.data = this.load();
    this.kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || null;
    this.kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || null;

    if (this.kvUrl && this.kvToken) {
      this.initKV();
    }
  }

  async initKV() {
    try {
      const res = await fetch(`${this.kvUrl}/get/fragment_data`, {
        headers: { Authorization: `Bearer ${this.kvToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.result) {
          const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
          this.data = { ...this.data, ...parsed };
        }
      }
    } catch (err) {
      console.warn('Could not load from KV storage:', err.message);
    }
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to read DATA_FILE, initializing defaults:', err.message);
    }
    const clone = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.save(clone);
    return clone;
  }

  save(data = this.data) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save to disk:', err.message);
    }

    if (this.kvUrl && this.kvToken) {
      try {
        fetch(`${this.kvUrl}/set/fragment_data`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.kvToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }).catch(err => console.warn('Async KV save failed:', err.message));
      } catch (e) {
        // Ignore async save error
      }
    }
  }

  // Stateless Token Generator (JWT-style HMAC-SHA256 signature)
  createToken(user) {
    const payload = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      discriminator: user.discriminator || '0001',
      avatar: user.avatar,
      banner: user.banner || DEFAULT_BANNER,
      color: user.color || '#5865F2',
      role: user.role || 'Member',
      time: Date.now()
    })).toString('base64url');

    const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  // Password Hashing
  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
  }

  verifyPassword(password, salt, hash) {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return testHash === hash;
  }

  getPublicUser(user) {
    if (!user) return null;
    const { salt, passwordHash, ...publicData } = user;
    if (!publicData.banner) publicData.banner = DEFAULT_BANNER;
    return publicData;
  }

  getUsers() {
    return (this.data.users || []).map(u => this.getPublicUser(u));
  }

  getUser(userId) {
    const u = (this.data.users || []).find(user => user.id === userId);
    return this.getPublicUser(u);
  }

  getUserByUsername(username) {
    const lower = (username || '').trim().toLowerCase();
    return (this.data.users || []).find(u => u.username.toLowerCase() === lower);
  }

  getUserByToken(token) {
    if (!token) return null;

    // 1. First check stateless signed token (permanent across serverless cold starts!)
    if (token.includes('.')) {
      const [payloadStr, sig] = token.split('.');
      const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url');
      if (sig === expectedSig) {
        try {
          const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
          let user = this.getUser(payload.userId);
          if (!user) {
            // Rehydrate user in memory for cold serverless lambdas!
            const newUser = {
              id: payload.userId,
              username: payload.username,
              displayName: payload.displayName || payload.username,
              discriminator: payload.discriminator || '0001',
              avatar: payload.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(payload.username)}`,
              banner: payload.banner || DEFAULT_BANNER,
              color: payload.color || '#5865F2',
              role: payload.role || 'Member',
              status: 'online',
              customStatus: '',
              bio: '',
              createdAt: new Date().toISOString()
            };
            if (!this.data.users) this.data.users = [];
            this.data.users.push(newUser);
            this.save();
            user = this.getPublicUser(newUser);
          }
          return user;
        } catch (e) {
          // Fall through to session check
        }
      }
    }

    // 2. Legacy session map check
    const userId = (this.data.sessions || {})[token];
    if (!userId) return null;
    return this.getUser(userId);
  }

  registerUser({ username, password, displayName, avatar, banner, color }) {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error('Username must be at least 2 characters.');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    if (this.getUserByUsername(cleanUsername)) {
      throw new Error('Username already exists. Please choose a different username.');
    }

    const salt = crypto.createHmac('sha256', SECRET).update('salt:' + cleanUsername.toLowerCase()).digest('hex').slice(0, 32);
    const { hash } = this.hashPassword(password, salt);
    const userId = 'u_' + crypto.createHmac('sha256', SECRET).update('user:' + cleanUsername.toLowerCase()).digest('hex').slice(0, 10);
    const discriminator = Math.floor(1000 + Math.random() * 9000).toString();
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;
    const userBanner = banner || DEFAULT_BANNER;
    const userColor = color || '#5865F2';

    const newUser = {
      id: userId,
      username: cleanUsername,
      displayName: (displayName && displayName.trim()) || cleanUsername,
      discriminator,
      avatar: defaultAvatar,
      banner: userBanner,
      color: userColor,
      salt,
      passwordHash: hash,
      status: 'online',
      customStatus: '',
      bio: '',
      role: (this.data.users || []).length === 0 ? 'Server Owner' : 'Member',
      createdAt: new Date().toISOString()
    };

    if (!this.data.users) this.data.users = [];
    this.data.users.push(newUser);

    if (!this.data.servers) this.data.servers = [];
    this.data.servers.forEach(server => {
      if (!server.members) server.members = [];
      if (!server.members.includes(userId)) {
        server.members.push(userId);
      }
    });

    const token = this.createToken(newUser);
    if (!this.data.sessions) this.data.sessions = {};
    this.data.sessions[token] = userId;
    this.save();

    return { user: this.getPublicUser(newUser), vaultUser: newUser, token };
  }

  loginUser({ username, password, clientVaultUser }) {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) {
      throw new Error('Username is required.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }

    let user = this.getUserByUsername(cleanUsername);

    // 1. If user is missing from this lambda instance, rehydrate from clientVaultUser
    if (!user && clientVaultUser && clientVaultUser.username && clientVaultUser.username.toLowerCase() === cleanUsername.toLowerCase()) {
      const restored = {
        id: clientVaultUser.id,
        username: clientVaultUser.username,
        displayName: clientVaultUser.displayName || clientVaultUser.username,
        discriminator: clientVaultUser.discriminator || '0001',
        avatar: clientVaultUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(clientVaultUser.username)}`,
        banner: clientVaultUser.banner || DEFAULT_BANNER,
        color: clientVaultUser.color || '#5865F2',
        salt: clientVaultUser.salt,
        passwordHash: clientVaultUser.passwordHash,
        status: 'online',
        customStatus: clientVaultUser.customStatus || '',
        bio: clientVaultUser.bio || '',
        role: clientVaultUser.role || 'Member',
        createdAt: clientVaultUser.createdAt || new Date().toISOString()
      };
      if (!this.data.users) this.data.users = [];
      this.data.users.push(restored);
      this.save();
      user = restored;
    }

    // 2. If user still not found in memory (e.g. cold lambda on new device), derive deterministic account
    if (!user) {
      const deterministicSalt = crypto.createHmac('sha256', SECRET).update('salt:' + cleanUsername.toLowerCase()).digest('hex').slice(0, 32);
      const testHash = crypto.scryptSync(password, deterministicSalt, 64).toString('hex');
      const userId = 'u_' + crypto.createHmac('sha256', SECRET).update('user:' + cleanUsername.toLowerCase()).digest('hex').slice(0, 10);
      const discriminator = (parseInt(crypto.createHmac('sha256', SECRET).update('disc:' + cleanUsername.toLowerCase()).digest('hex').slice(0, 4), 16) % 9000 + 1000).toString();

      const restored = {
        id: userId,
        username: cleanUsername,
        displayName: cleanUsername,
        discriminator,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
        banner: DEFAULT_BANNER,
        color: '#5865F2',
        salt: deterministicSalt,
        passwordHash: testHash,
        status: 'online',
        customStatus: '',
        bio: '',
        role: (this.data.users || []).length === 0 ? 'Server Owner' : 'Member',
        createdAt: new Date().toISOString()
      };
      if (!this.data.users) this.data.users = [];
      this.data.users.push(restored);
      this.save();
      user = restored;
    }

    if (user.passwordHash && user.salt) {
      const isValid = this.verifyPassword(password, user.salt, user.passwordHash);
      if (!isValid) {
        throw new Error('Invalid username or password.');
      }
    }

    const token = this.createToken(user);
    if (!this.data.sessions) this.data.sessions = {};
    this.data.sessions[token] = user.id;
    this.save();

    return { user: this.getPublicUser(user), vaultUser: user, token };
  }

  logoutUser(token) {
    if (this.data.sessions && this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  updateUserProfile(userId, updates = {}) {
    const user = (this.data.users || []).find(u => u.id === userId);
    if (!user) return null;

    if (updates.displayName !== undefined) user.displayName = updates.displayName.trim();
    if (updates.avatar !== undefined && updates.avatar) user.avatar = updates.avatar;
    if (updates.banner !== undefined && updates.banner) user.banner = updates.banner;
    if (updates.color !== undefined && updates.color) user.color = updates.color;
    if (updates.status !== undefined && updates.status) user.status = updates.status;
    if (updates.customStatus !== undefined) user.customStatus = updates.customStatus;
    if (updates.bio !== undefined) user.bio = updates.bio;

    this.save();
    const publicUser = this.getPublicUser(user);
    const newToken = this.createToken(user);
    return { user: publicUser, token: newToken };
  }

  updateUserStatus(userId, status, customStatus) {
    const user = (this.data.users || []).find(u => u.id === userId);
    if (user) {
      if (status) user.status = status;
      if (customStatus !== undefined) user.customStatus = customStatus;
      this.save();
      return this.getPublicUser(user);
    }
    return null;
  }

  getServers() {
    return this.data.servers || [];
  }

  getServer(serverId) {
    return (this.data.servers || []).find(s => s.id === serverId);
  }

  createServer(name, icon, ownerId) {
    const serverId = 's_' + crypto.randomUUID().slice(0, 8);
    const newServer = {
      id: serverId,
      name,
      icon: icon || name.charAt(0).toUpperCase(),
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
      ownerId,
      channels: [
        { id: 'c_' + crypto.randomUUID().slice(0, 8), serverId, name: 'general', type: 'text', category: 'TEXT CHANNELS', topic: 'Welcome to your new server!' },
        { id: 'c_' + crypto.randomUUID().slice(0, 8), serverId, name: 'General Voice', type: 'voice', category: 'VOICE CHANNELS', topic: 'Voice chat' }
      ],
      members: [ownerId]
    };
    if (!this.data.servers) this.data.servers = [];
    this.data.servers.push(newServer);
    this.save();
    return newServer;
  }

  createChannel(serverId, name, type, category = 'CHANNELS') {
    const server = this.getServer(serverId);
    if (!server) return null;
    const channelId = 'c_' + crypto.randomUUID().slice(0, 8);
    const formattedName = type === 'text' ? name.toLowerCase().replace(/\s+/g, '-') : name;
    const newChannel = {
      id: channelId,
      serverId,
      name: formattedName,
      type,
      category: category.toUpperCase(),
      topic: `${type === 'text' ? '#' : '🔊 '} ${formattedName}`
    };
    if (!server.channels) server.channels = [];
    server.channels.push(newChannel);
    this.save();
    return newChannel;
  }

  getMessages(channelId) {
    return (this.data.messages || []).filter(m => m.channelId === channelId);
  }

  addMessage({ channelId, userId, content, attachments = [], replyToId = null }) {
    const message = {
      id: 'm_' + crypto.randomUUID().slice(0, 8),
      channelId,
      userId,
      content,
      attachments,
      replyToId,
      timestamp: new Date().toISOString(),
      reactions: [],
      edited: false
    };
    if (!this.data.messages) this.data.messages = [];
    this.data.messages.push(message);
    this.save();
    return message;
  }

  editMessage(messageId, userId, newContent) {
    const msg = (this.data.messages || []).find(m => m.id === messageId);
    if (msg && msg.userId === userId) {
      msg.content = newContent;
      msg.edited = true;
      msg.editedTimestamp = new Date().toISOString();
      this.save();
      return msg;
    }
    return null;
  }

  deleteMessage(messageId, userId) {
    const index = (this.data.messages || []).findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.data.messages.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  toggleReaction(messageId, userId, emoji) {
    const msg = (this.data.messages || []).find(m => m.id === messageId);
    if (!msg) return null;

    if (!msg.reactions) msg.reactions = [];
    const reaction = msg.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      const userIndex = reaction.users.indexOf(userId);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(userId);
      }
    } else {
      msg.reactions.push({ emoji, users: [userId] });
    }

    this.save();
    return msg;
  }

  getDirectMessages(userA, userB) {
    if (!this.data.directMessages) this.data.directMessages = [];
    let dm = this.data.directMessages.find(d => 
      d.participants.includes(userA) && d.participants.includes(userB)
    );
    if (!dm) {
      dm = {
        id: `dm-${[userA, userB].sort().join('-')}`,
        participants: [userA, userB],
        messages: []
      };
      this.data.directMessages.push(dm);
      this.save();
    }
    return dm;
  }

  addDirectMessage(dmId, userId, content, attachments = []) {
    if (!this.data.directMessages) this.data.directMessages = [];
    let dm = this.data.directMessages.find(d => d.id === dmId);
    if (!dm) return null;

    const message = {
      id: 'dm_msg_' + crypto.randomUUID().slice(0, 8),
      userId,
      content,
      attachments,
      timestamp: new Date().toISOString(),
      reactions: []
    };
    dm.messages.push(message);
    this.save();
    return { dmId, message };
  }

  getVoiceState() {
    return this.data.voiceRooms || {};
  }

  joinVoiceRoom(channelId, userState) {
    if (!this.data.voiceRooms) this.data.voiceRooms = {};
    if (!this.data.voiceRooms[channelId]) {
      this.data.voiceRooms[channelId] = [];
    }
    this.leaveVoiceRoom(userState.userId);

    const existingIndex = this.data.voiceRooms[channelId].findIndex(p => p.userId === userState.userId);
    if (existingIndex >= 0) {
      this.data.voiceRooms[channelId][existingIndex] = { ...this.data.voiceRooms[channelId][existingIndex], ...userState };
    } else {
      this.data.voiceRooms[channelId].push(userState);
    }
    this.save();
    return this.data.voiceRooms[channelId];
  }

  leaveVoiceRoom(userId) {
    if (!this.data.voiceRooms) return null;
    let affectedChannelId = null;
    for (const [chId, participants] of Object.entries(this.data.voiceRooms)) {
      const idx = participants.findIndex(p => p.userId === userId);
      if (idx >= 0) {
        participants.splice(idx, 1);
        affectedChannelId = chId;
        break;
      }
    }
    if (affectedChannelId) this.save();
    return affectedChannelId;
  }

  updateVoiceUser(userId, changes) {
    if (!this.data.voiceRooms) return null;
    let affectedChannelId = null;
    for (const [chId, participants] of Object.entries(this.data.voiceRooms)) {
      const p = participants.find(item => item.userId === userId);
      if (p) {
        Object.assign(p, changes);
        affectedChannelId = chId;
        break;
      }
    }
    if (affectedChannelId) this.save();
    return affectedChannelId;
  }

  getSyncData(channelId, userId, since) {
    let newMessages = [];
    if (channelId) {
      const allMsgs = this.getMessages(channelId);
      if (since) {
        newMessages = allMsgs.filter(m => m.timestamp > since);
      } else {
        newMessages = allMsgs;
      }
    }

    let userDMs = [];
    if (userId && this.data.directMessages) {
      userDMs = this.data.directMessages.filter(dm => dm.participants.includes(userId));
    }

    return {
      timestamp: new Date().toISOString(),
      messages: newMessages,
      users: this.getUsers(),
      servers: this.getServers(),
      voiceRooms: this.getVoiceState(),
      directMessages: userDMs
    };
  }

  handleCors(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  parseBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
}

const store = new Store();
export default store;
