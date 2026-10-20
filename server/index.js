const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const server = http.createServer(app);

// CORS config
app.use(cors({ origin: '*' }));
app.use(express.json());

// Uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve client dist if built
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Authentication Routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, displayName, avatar, color } = req.body;
    const result = db.registerUser({ username, password, displayName, avatar, color });
    io.emit('user:registered', result.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const result = db.loginUser({ username, password });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const user = db.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.logoutUser(token);
  }
  res.json({ success: true });
});

app.get('/api/initial-data', (req, res) => {
  res.json({
    users: db.getUsers(),
    servers: db.getServers(),
    voiceRooms: db.getVoiceState()
  });
});

app.get('/api/messages/:channelId', (req, res) => {
  const { channelId } = req.params;
  res.json(db.getMessages(channelId));
});

app.get('/api/dm/:userA/:userB', (req, res) => {
  const { userA, userB } = req.params;
  res.json(db.getDirectMessages(userA, userB));
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

app.post('/api/servers', (req, res) => {
  const { name, icon, ownerId } = req.body;
  if (!name || !ownerId) {
    return res.status(400).json({ error: 'Name and ownerId are required' });
  }
  const newServer = db.createServer(name, icon, ownerId);
  io.emit('server:created', newServer);
  res.json(newServer);
});

app.post('/api/channels', (req, res) => {
  const { serverId, name, type, category } = req.body;
  if (!serverId || !name || !type) {
    return res.status(400).json({ error: 'serverId, name, and type are required' });
  }
  const newChannel = db.createChannel(serverId, name, type, category);
  if (!newChannel) {
    return res.status(404).json({ error: 'Server not found' });
  }
  io.emit('channel:created', { serverId, channel: newChannel });
  res.json(newChannel);
});

app.post('/api/users/status', (req, res) => {
  const { userId, status, customStatus } = req.body;
  const updated = db.updateUserStatus(userId, status, customStatus);
  if (updated) {
    io.emit('user:status_changed', updated);
  }
  res.json(updated);
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Map socketId -> { userId, channelId }
const socketUserMap = new Map();
// Map channelId -> Set of typing userIds
const typingMap = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('user:register', ({ userId }) => {
    socketUserMap.set(socket.id, { userId });
    socket.join(`user:${userId}`);

    // Track dynamic presence
    const user = db.addSocketForUser(userId, socket.id);
    if (user) {
      io.emit('user:status_changed', user);
    }
  });

  socket.on('channel:join', ({ channelId }) => {
    socket.join(channelId);
  });

  socket.on('channel:leave', ({ channelId }) => {
    socket.leave(channelId);
  });

  // Message events
  socket.on('message:send', (data) => {
    const { channelId, userId, content, attachments, replyToId } = data;
    const msg = db.addMessage({ channelId, userId, content, attachments, replyToId });
    io.to(channelId).emit('message:new', msg);

    // Stop typing immediately when sent
    if (typingMap.has(channelId)) {
      typingMap.get(channelId).delete(userId);
      io.to(channelId).emit('typing:update', {
        channelId,
        typingUsers: Array.from(typingMap.get(channelId))
      });
    }
  });

  socket.on('message:edit', ({ messageId, channelId, userId, newContent }) => {
    const updated = db.editMessage(messageId, userId, newContent);
    if (updated) {
      io.to(channelId).emit('message:updated', updated);
    }
  });

  socket.on('message:delete', ({ messageId, channelId, userId }) => {
    const success = db.deleteMessage(messageId, userId);
    if (success) {
      io.to(channelId).emit('message:deleted', { messageId, channelId });
    }
  });

  socket.on('message:react', ({ messageId, channelId, userId, emoji }) => {
    const updated = db.toggleReaction(messageId, userId, emoji);
    if (updated) {
      io.to(channelId).emit('message:updated', updated);
    }
  });

  // Typing events
  socket.on('typing:start', ({ channelId, userId }) => {
    if (!typingMap.has(channelId)) {
      typingMap.set(channelId, new Set());
    }
    typingMap.get(channelId).add(userId);
    io.to(channelId).emit('typing:update', {
      channelId,
      typingUsers: Array.from(typingMap.get(channelId))
    });
  });

  socket.on('typing:stop', ({ channelId, userId }) => {
    if (typingMap.has(channelId)) {
      typingMap.get(channelId).delete(userId);
      io.to(channelId).emit('typing:update', {
        channelId,
        typingUsers: Array.from(typingMap.get(channelId))
      });
    }
  });

  // Direct Messages
  socket.on('dm:send', ({ dmId, userId, recipientId, content, attachments }) => {
    const result = db.addDirectMessage(dmId, userId, content, attachments);
    if (result) {
      io.to(`user:${userId}`).emit('dm:new', result);
      io.to(`user:${recipientId}`).emit('dm:new', result);
    }
  });

  // Voice Channels & WebRTC
  socket.on('voice:join', ({ channelId, user }) => {
    const voiceUser = {
      userId: user.id,
      socketId: socket.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false
    };

    socket.join(`voice:${channelId}`);
    const participants = db.joinVoiceRoom(channelId, voiceUser);

    // Broadcast updated state to all clients
    io.emit('voice:state', db.getVoiceState());

    // Inform existing peers in this voice room so they can initiate WebRTC peer connections
    socket.to(`voice:${channelId}`).emit('voice:peer_joined', {
      channelId,
      peer: voiceUser
    });
  });

  socket.on('voice:leave', ({ userId }) => {
    const affectedChannelId = db.leaveVoiceRoom(userId);
    if (affectedChannelId) {
      socket.leave(`voice:${affectedChannelId}`);
      io.emit('voice:state', db.getVoiceState());
      socket.to(`voice:${affectedChannelId}`).emit('voice:peer_left', {
        channelId: affectedChannelId,
        userId
      });
    }
  });

  socket.on('voice:update', ({ userId, changes }) => {
    const affectedChannelId = db.updateVoiceUser(userId, changes);
    if (affectedChannelId) {
      io.emit('voice:state', db.getVoiceState());
    }
  });

  // WebRTC Signaling relay
  socket.on('voice:signal', ({ targetSocketId, targetUserId, signal, fromUserId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('voice:signal', {
        signal,
        fromUserId,
        fromSocketId: socket.id
      });
    } else if (targetUserId) {
      io.to(`user:${targetUserId}`).emit('voice:signal', {
        signal,
        fromUserId,
        fromSocketId: socket.id
      });
    }
  });

  // Status updates
  socket.on('user:status', ({ userId, status, customStatus }) => {
    const updated = db.updateUserStatus(userId, status, customStatus);
    if (updated) {
      io.emit('user:status_changed', updated);
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const userSession = socketUserMap.get(socket.id);
    if (userSession && userSession.userId) {
      const affectedChannelId = db.leaveVoiceRoom(userSession.userId);
      if (affectedChannelId) {
        io.emit('voice:state', db.getVoiceState());
        io.to(`voice:${affectedChannelId}`).emit('voice:peer_left', {
          channelId: affectedChannelId,
          userId: userSession.userId
        });
      }

      // Check if user has no more open tabs/connections -> go offline
      const user = db.removeSocketForUser(userSession.userId, socket.id);
      if (user) {
        io.emit('user:status_changed', user);
      }
    }
    socketUserMap.delete(socket.id);
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// SPA client fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Discord clone backend listening on http://localhost:${PORT}`);
});
