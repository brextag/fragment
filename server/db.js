const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, 'data.json');

const INITIAL_DATA = {
  users: [],
  sessions: {}, // token -> userId
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
  directMessages: []
};

class DB {
  constructor() {
    this.data = this.load();
    this.voiceRooms = {}; // channelId -> Array<{ userId, socketId, isMuted, isDeafened, isSpeaking }>
    this.activeUserSockets = new Map(); // userId -> Set of socketIds
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to read data.json:', err);
    }
    this.save(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  save(data = this.data) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save data.json:', err);
    }
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

  // Public User Sanitizer (removes password fields)
  getPublicUser(user) {
    if (!user) return null;
    const { salt, passwordHash, ...publicData } = user;
    return publicData;
  }

  getUsers() {
    return this.data.users.map(u => this.getPublicUser(u));
  }

  getUser(userId) {
    const u = this.data.users.find(user => user.id === userId);
    return this.getPublicUser(u);
  }

  getUserByUsername(username) {
    const lower = username.trim().toLowerCase();
    return this.data.users.find(u => u.username.toLowerCase() === lower);
  }

  getUserByToken(token) {
    if (!token) return null;
    const userId = this.data.sessions[token];
    if (!userId) return null;
    return this.getUser(userId);
  }

  // Register User
  registerUser({ username, password, displayName, avatar, color }) {
    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error('Username must be at least 2 characters.');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    if (this.getUserByUsername(cleanUsername)) {
      throw new Error('Username already exists. Please choose a different username.');
    }

    const { salt, hash } = this.hashPassword(password);
    const userId = 'u_' + uuidv4().slice(0, 8);
    const discriminator = Math.floor(1000 + Math.random() * 9000).toString();

    // Default avatars using dicebear styles or colorful initials
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
    const userColor = color || '#5865F2';

    const newUser = {
      id: userId,
      username: cleanUsername,
      displayName: (displayName && displayName.trim()) || cleanUsername,
      discriminator,
      avatar: defaultAvatar,
      color: userColor,
      salt,
      passwordHash: hash,
      status: 'online',
      customStatus: '',
      role: this.data.users.length === 0 ? 'Server Owner' : 'Member',
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);

    // Automatically join all existing servers
    this.data.servers.forEach(server => {
      if (!server.members.includes(userId)) {
        server.members.push(userId);
      }
    });

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    this.data.sessions[token] = userId;
    this.save();

    return { user: this.getPublicUser(newUser), token };
  }

  // Login User
  loginUser({ username, password }) {
    const cleanUsername = username.trim();
    const user = this.getUserByUsername(cleanUsername);
    if (!user) {
      throw new Error('Invalid username or password.');
    }

    const isValid = this.verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    this.data.sessions[token] = user.id;
    this.save();

    return { user: this.getPublicUser(user), token };
  }

  logoutUser(token) {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  // Dynamic Presence Tracking
  addSocketForUser(userId, socketId) {
    if (!this.activeUserSockets.has(userId)) {
      this.activeUserSockets.set(userId, new Set());
    }
    this.activeUserSockets.get(userId).add(socketId);
    return this.updateUserStatus(userId, 'online');
  }

  removeSocketForUser(userId, socketId) {
    let wasLastSocket = false;
    if (this.activeUserSockets.has(userId)) {
      const set = this.activeUserSockets.get(userId);
      set.delete(socketId);
      if (set.size === 0) {
        this.activeUserSockets.delete(userId);
        wasLastSocket = true;
      }
    }
    if (wasLastSocket) {
      return this.updateUserStatus(userId, 'offline');
    }
    return null;
  }

  updateUserStatus(userId, status, customStatus) {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      if (status) user.status = status;
      if (customStatus !== undefined) user.customStatus = customStatus;
      this.save();
      return this.getPublicUser(user);
    }
    return null;
  }

  getServers() {
    return this.data.servers;
  }

  getServer(serverId) {
    return this.data.servers.find(s => s.id === serverId);
  }

  createServer(name, icon, ownerId) {
    const serverId = 's_' + uuidv4().slice(0, 8);
    const newServer = {
      id: serverId,
      name,
      icon: icon || name.charAt(0).toUpperCase(),
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
      ownerId,
      channels: [
        { id: 'c_' + uuidv4().slice(0, 8), serverId, name: 'general', type: 'text', category: 'TEXT CHANNELS', topic: 'Welcome to your new server!' },
        { id: 'c_' + uuidv4().slice(0, 8), serverId, name: 'General Voice', type: 'voice', category: 'VOICE CHANNELS', topic: 'Voice chat' }
      ],
      members: [ownerId]
    };
    this.data.servers.push(newServer);
    this.save();
    return newServer;
  }

  createChannel(serverId, name, type, category = 'CHANNELS') {
    const server = this.getServer(serverId);
    if (!server) return null;
    const channelId = 'c_' + uuidv4().slice(0, 8);
    const formattedName = type === 'text' ? name.toLowerCase().replace(/\s+/g, '-') : name;
    const newChannel = {
      id: channelId,
      serverId,
      name: formattedName,
      type,
      category: category.toUpperCase(),
      topic: `${type === 'text' ? '#' : '🔊 '} ${formattedName}`
    };
    server.channels.push(newChannel);
    this.save();
    return newChannel;
  }

  getMessages(channelId) {
    return this.data.messages.filter(m => m.channelId === channelId);
  }

  addMessage({ channelId, userId, content, attachments = [], replyToId = null }) {
    const message = {
      id: 'm_' + uuidv4().slice(0, 8),
      channelId,
      userId,
      content,
      attachments,
      replyToId,
      timestamp: new Date().toISOString(),
      reactions: [],
      edited: false
    };
    this.data.messages.push(message);
    this.save();
    return message;
  }

  editMessage(messageId, userId, newContent) {
    const msg = this.data.messages.find(m => m.id === messageId);
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
    const index = this.data.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.data.messages.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  toggleReaction(messageId, userId, emoji) {
    const msg = this.data.messages.find(m => m.id === messageId);
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
    let dm = this.data.directMessages.find(d => d.id === dmId);
    if (!dm) return null;

    const message = {
      id: 'dm_msg_' + uuidv4().slice(0, 8),
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

  // Voice Rooms
  joinVoiceRoom(channelId, userState) {
    if (!this.voiceRooms[channelId]) {
      this.voiceRooms[channelId] = [];
    }
    this.leaveVoiceRoom(userState.userId);

    const existingIndex = this.voiceRooms[channelId].findIndex(p => p.userId === userState.userId);
    if (existingIndex >= 0) {
      this.voiceRooms[channelId][existingIndex] = { ...this.voiceRooms[channelId][existingIndex], ...userState };
    } else {
      this.voiceRooms[channelId].push(userState);
    }
    return this.voiceRooms[channelId];
  }

  leaveVoiceRoom(userId) {
    let affectedChannelId = null;
    for (const [chId, participants] of Object.entries(this.voiceRooms)) {
      const idx = participants.findIndex(p => p.userId === userId);
      if (idx >= 0) {
        participants.splice(idx, 1);
        affectedChannelId = chId;
        break;
      }
    }
    return affectedChannelId;
  }

  getVoiceState() {
    return this.voiceRooms;
  }

  updateVoiceUser(userId, changes) {
    let affectedChannelId = null;
    for (const [chId, participants] of Object.entries(this.voiceRooms)) {
      const p = participants.find(item => item.userId === userId);
      if (p) {
        Object.assign(p, changes);
        affectedChannelId = chId;
        break;
      }
    }
    return affectedChannelId;
  }
}

module.exports = new DB();
