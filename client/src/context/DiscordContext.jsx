import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import sounds from '../services/soundEffects';

const DiscordContext = createContext(null);

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function DiscordProvider({ children }) {
  // Auth state with local persistent credentials backup
  const [token, setToken] = useState(() => localStorage.getItem('discord_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('discord_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // App data
  const [users, setUsers] = useState([]);
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState('s_main');
  const [activeChannelId, setActiveChannelId] = useState('c_general');

  // DM state
  const [activeDmUserId, setActiveDmUserId] = useState(null);
  const [directMessages, setDirectMessages] = useState([]);

  // Messages per channel
  const [messagesMap, setMessagesMap] = useState({});
  // Typing per channel: channelId -> [userIds]
  const [typingMap, setTypingMap] = useState({});

  // Voice state
  const [voiceRooms, setVoiceRooms] = useState({});
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // UI Modals & State
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMemberListOpen, setIsMemberListOpen] = useState(true);
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  // Real-time connection mode tracking
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Check existing token on mount without wiping local user on cold starts
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoadingAuth(false);
        return;
      }
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('discord_user', JSON.stringify(data.user));
          }
        }
      } catch (err) {
        console.warn('Network auth verification fallback to persistent cached credentials:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    checkAuth();
  }, [token]);

  // 2. Fetch initial data (users, servers, voice) once logged in
  const fetchInitialData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/initial-data`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.servers) {
        setServers(data.servers);
        if (data.servers.length > 0 && (!activeServerId || activeServerId === 's1')) {
          setActiveServerId(data.servers[0].id);
          if (data.servers[0].channels?.length > 0) {
            setActiveChannelId(data.servers[0].channels[0].id);
          }
        }
      }
      if (data.voiceRooms) setVoiceRooms(data.voiceRooms);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser?.id]);

  // 3. Socket connection setup
  useEffect(() => {
    if (!currentUser) return;

    let socket = null;
    try {
      socket = io(BACKEND_URL || window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 4000
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsSocketConnected(true);
        socket.emit('user:register', { userId: currentUser.id });
        if (activeChannelId) {
          socket.emit('channel:join', { channelId: activeChannelId });
        }
      });

      socket.on('disconnect', () => {
        setIsSocketConnected(false);
      });

      socket.on('connect_error', () => {
        setIsSocketConnected(false);
      });

      socket.on('user:registered', (newUser) => {
        setUsers(prev => {
          if (prev.some(u => u.id === newUser.id)) return prev;
          return [...prev, newUser];
        });
      });

      socket.on('message:new', (msg) => {
        setMessagesMap(prev => {
          const list = prev[msg.channelId] || [];
          if (list.some(m => m.id === msg.id)) return prev;
          return {
            ...prev,
            [msg.channelId]: [...list, msg]
          };
        });

        if (msg.userId !== currentUser.id) {
          sounds.playMessageNotification();
        }
      });

      socket.on('message:updated', (updatedMsg) => {
        setMessagesMap(prev => {
          const list = prev[updatedMsg.channelId] || [];
          return {
            ...prev,
            [updatedMsg.channelId]: list.map(m => m.id === updatedMsg.id ? updatedMsg : m)
          };
        });
      });

      socket.on('message:deleted', ({ messageId, channelId }) => {
        setMessagesMap(prev => {
          const list = prev[channelId] || [];
          return {
            ...prev,
            [channelId]: list.filter(m => m.id !== messageId)
          };
        });
      });

      socket.on('typing:update', ({ channelId, typingUsers }) => {
        setTypingMap(prev => ({
          ...prev,
          [channelId]: (typingUsers || []).filter(id => id !== currentUser.id)
        }));
      });

      socket.on('voice:state', (updatedVoiceRooms) => {
        setVoiceRooms(updatedVoiceRooms || {});
      });

      socket.on('server:created', (newServer) => {
        setServers(prev => {
          if (prev.some(s => s.id === newServer.id)) return prev;
          return [...prev, newServer];
        });
      });

      socket.on('channel:created', ({ serverId, channel }) => {
        setServers(prev => prev.map(s => {
          if (s.id === serverId) {
            if (s.channels.some(c => c.id === channel.id)) return s;
            return { ...s, channels: [...s.channels, channel] };
          }
          return s;
        }));
      });

      socket.on('user:status_changed', (updatedUser) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        if (currentUser && currentUser.id === updatedUser.id) {
          setCurrentUser(prev => ({ ...prev, ...updatedUser }));
          localStorage.setItem('discord_user', JSON.stringify({ ...currentUser, ...updatedUser }));
        }
      });

      socket.on('dm:new', ({ dmId, message }) => {
        setDirectMessages(prev => {
          const existing = prev.find(d => d.id === dmId);
          if (existing) {
            if (existing.messages.some(m => m.id === message.id)) return prev;
            return prev.map(d => d.id === dmId ? { ...d, messages: [...d.messages, message] } : d);
          }
          return [...prev, { id: dmId, participants: [currentUser.id, message.userId], messages: [message] }];
        });
        if (message.userId !== currentUser.id) {
          sounds.playMessageNotification();
        }
      });
    } catch (e) {
      console.warn('Socket error, fallback to reactive polling:', e);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser?.id]);

  // 4. Reactive Smart-Sync Polling Fallback
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    const syncWithServer = async () => {
      try {
        const channelParam = activeServerId === '@me' ? '' : activeChannelId;
        const res = await fetch(`${BACKEND_URL}/api/sync?channelId=${encodeURIComponent(channelParam || '')}&userId=${encodeURIComponent(currentUser.id)}`);
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        }

        if (data.voiceRooms) {
          setVoiceRooms(data.voiceRooms);
        }

        if (data.servers && data.servers.length > 0) {
          setServers(prev => {
            if (data.servers.length !== prev.length) return data.servers;
            return prev;
          });
        }

        if (data.directMessages) {
          setDirectMessages(data.directMessages);
        }

        if (channelParam && data.messages) {
          setMessagesMap(prev => {
            const existingList = prev[channelParam] || [];
            const existingIds = new Set(existingList.map(m => m.id));
            let hasNewIncoming = false;

            for (const msg of data.messages) {
              if (!existingIds.has(msg.id)) {
                if (msg.userId !== currentUser.id) {
                  hasNewIncoming = true;
                }
              }
            }

            if (hasNewIncoming) {
              sounds.playMessageNotification();
            }

            if (data.messages.length !== existingList.length || hasNewIncoming) {
              return {
                ...prev,
                [channelParam]: data.messages
              };
            }
            return prev;
          });
        }
      } catch (err) {
        // Silently catch background sync errors
      }
    };

    const pollInterval = isSocketConnected ? 8000 : 1500;
    const intervalTimer = setInterval(syncWithServer, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
    };
  }, [currentUser?.id, activeChannelId, activeServerId, isSocketConnected]);

  // Load messages whenever activeChannelId changes
  useEffect(() => {
    if (!activeChannelId || activeServerId === '@me' || !currentUser) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('channel:join', { channelId: activeChannelId });
    }

    fetch(`${BACKEND_URL}/api/messages/${activeChannelId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
      })
      .then(msgs => {
        setMessagesMap(prev => ({
          ...prev,
          [activeChannelId]: msgs
        }));
      })
      .catch(err => console.error('Failed to load messages for channel:', err));
  }, [activeChannelId, activeServerId, currentUser]);

  // Load DM messages when activeDmUserId changes in @me
  useEffect(() => {
    if (activeServerId !== '@me' || !activeDmUserId || !currentUser) return;
    fetch(`${BACKEND_URL}/api/dm/${currentUser.id}/${activeDmUserId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch DM');
        return res.json();
      })
      .then(dm => {
        setDirectMessages(prev => {
          const filtered = prev.filter(d => d.id !== dm.id);
          return [...filtered, dm];
        });
      })
      .catch(err => console.error('Failed to load DM:', err));
  }, [activeServerId, activeDmUserId, currentUser]);

  // Auth Functions
  const register = async ({ username, password, displayName, avatar, banner, color }) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName, avatar, banner, color })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    localStorage.setItem('discord_auth_token', data.token);
    localStorage.setItem('discord_user', JSON.stringify(data.user));
    if (data.vaultUser) {
      localStorage.setItem('fragment_vault', JSON.stringify(data.vaultUser));
    }
    setToken(data.token);
    setCurrentUser(data.user);
    return data.user;
  };

  const login = async ({ username, password }) => {
    let clientVaultUser = null;
    try {
      const savedVault = localStorage.getItem('fragment_vault');
      if (savedVault) clientVaultUser = JSON.parse(savedVault);
    } catch (e) {}

    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, clientVaultUser })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }
    localStorage.setItem('discord_auth_token', data.token);
    localStorage.setItem('discord_user', JSON.stringify(data.user));
    if (data.vaultUser) {
      localStorage.setItem('fragment_vault', JSON.stringify(data.vaultUser));
    }
    setToken(data.token);
    setCurrentUser(data.user);
    return data.user;
  };

  const logout = async () => {
    if (activeVoiceChannelId) {
      leaveVoice();
    }
    try {
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.warn(e);
    }
    localStorage.removeItem('discord_auth_token');
    localStorage.removeItem('discord_user');
    setToken(null);
    setCurrentUser(null);
    setIsSettingsOpen(false);
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId: currentUser.id,
          ...updates
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem('discord_user', JSON.stringify(data.user));
        try {
          const savedVault = localStorage.getItem('fragment_vault');
          if (savedVault) {
            const vaultObj = JSON.parse(savedVault);
            localStorage.setItem('fragment_vault', JSON.stringify({ ...vaultObj, ...updates }));
          }
        } catch (e) {}
        if (data.token) {
          localStorage.setItem('discord_auth_token', data.token);
          setToken(data.token);
        }
        setUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u));
        return data.user;
      }
    } catch (err) {
      console.error('Failed to update profile via API:', err);
    }
    // Optimistic fallback update
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    localStorage.setItem('discord_user', JSON.stringify(updated));
    try {
      const savedVault = localStorage.getItem('fragment_vault');
      if (savedVault) {
        const vaultObj = JSON.parse(savedVault);
        localStorage.setItem('fragment_vault', JSON.stringify({ ...vaultObj, ...updates }));
      }
    } catch (e) {}
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    return updated;
  };

  // Actions
  const sendMessage = async ({ content, attachments = [], replyToId = null }) => {
    if (!content.trim() && attachments.length === 0) return;
    if (!currentUser) return;

    if (activeServerId === '@me') {
      const dm = directMessages.find(d => 
        d.participants.includes(currentUser.id) && d.participants.includes(activeDmUserId)
      );
      const dmId = dm ? dm.id : `dm-${[currentUser.id, activeDmUserId].sort().join('-')}`;

      if (socketRef.current?.connected) {
        socketRef.current.emit('dm:send', {
          dmId,
          userId: currentUser.id,
          recipientId: activeDmUserId,
          content,
          attachments
        });
      } else {
        try {
          const res = await fetch(`${BACKEND_URL}/api/dm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              dmId,
              userId: currentUser.id,
              recipientId: activeDmUserId,
              content,
              attachments
            })
          });
          if (res.ok) {
            const result = await res.json();
            setDirectMessages(prev => {
              const existing = prev.find(d => d.id === result.dmId);
              if (existing) {
                if (existing.messages.some(m => m.id === result.message.id)) return prev;
                return prev.map(d => d.id === result.dmId ? { ...d, messages: [...d.messages, result.message] } : d);
              }
              return [...prev, { id: result.dmId, participants: [currentUser.id, activeDmUserId], messages: [result.message] }];
            });
          }
        } catch (err) {
          console.error('Failed to send DM via serverless API:', err);
        }
      }
    } else {
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', {
          channelId: activeChannelId,
          userId: currentUser.id,
          content,
          attachments,
          replyToId: replyingToMessage ? replyingToMessage.id : replyToId
        });
      } else {
        try {
          const res = await fetch(`${BACKEND_URL}/api/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              channelId: activeChannelId,
              userId: currentUser.id,
              content,
              attachments,
              replyToId: replyingToMessage ? replyingToMessage.id : replyToId
            })
          });
          if (res.ok) {
            const newMsg = await res.json();
            setMessagesMap(prev => {
              const list = prev[activeChannelId] || [];
              if (list.some(m => m.id === newMsg.id)) return prev;
              return {
                ...prev,
                [activeChannelId]: [...list, newMsg]
              };
            });
          }
        } catch (err) {
          console.error('Failed to send message via serverless API:', err);
        }
      }
    }
    setReplyingToMessage(null);
  };

  const editMessage = async (messageId, newContent) => {
    if (!currentUser) return;
    setMessagesMap(prev => {
      const list = prev[activeChannelId] || [];
      return {
        ...prev,
        [activeChannelId]: list.map(m => m.id === messageId ? { ...m, content: newContent, edited: true } : m)
      };
    });

    if (socketRef.current?.connected) {
      socketRef.current.emit('message:edit', {
        messageId,
        channelId: activeChannelId,
        userId: currentUser.id,
        newContent
      });
    } else {
      try {
        await fetch(`${BACKEND_URL}/api/messages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, userId: currentUser.id, newContent })
        });
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const deleteMessage = async (messageId) => {
    if (!currentUser) return;
    setMessagesMap(prev => {
      const list = prev[activeChannelId] || [];
      return {
        ...prev,
        [activeChannelId]: list.filter(m => m.id !== messageId)
      };
    });

    if (socketRef.current?.connected) {
      socketRef.current.emit('message:delete', {
        messageId,
        channelId: activeChannelId,
        userId: currentUser.id
      });
    } else {
      try {
        await fetch(`${BACKEND_URL}/api/messages`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, userId: currentUser.id })
        });
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    if (!currentUser) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:react', {
        messageId,
        channelId: activeChannelId,
        userId: currentUser.id,
        emoji
      });
    } else {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages?action=react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, userId: currentUser.id, emoji })
        });
        if (res.ok) {
          const updated = await res.json();
          if (updated) {
            setMessagesMap(prev => {
              const list = prev[activeChannelId] || [];
              return {
                ...prev,
                [activeChannelId]: list.map(m => m.id === updated.id ? updated : m)
              };
            });
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const sendTyping = () => {
    if (activeServerId === '@me' || !currentUser) return;
    socketRef.current?.emit('typing:start', {
      channelId: activeChannelId,
      userId: currentUser.id
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', {
        channelId: activeChannelId,
        userId: currentUser.id
      });
    }, 2500);
  };

  // Voice Controls
  const joinVoice = async (channelId) => {
    if (!currentUser || activeVoiceChannelId === channelId) return;

    if (activeVoiceChannelId) {
      leaveVoice();
    }

    sounds.playJoinVoice();
    setActiveVoiceChannelId(channelId);

    if (socketRef.current?.connected) {
      socketRef.current.emit('voice:join', {
        channelId,
        user: currentUser
      });
    } else {
      try {
        const res = await fetch(`${BACKEND_URL}/api/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            channelId,
            user: currentUser
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.voiceRooms) setVoiceRooms(data.voiceRooms);
        }
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const leaveVoice = async () => {
    if (!activeVoiceChannelId || !currentUser) return;
    sounds.playLeaveVoice();
    setActiveVoiceChannelId(null);
    setIsSpeaking(false);

    if (socketRef.current?.connected) {
      socketRef.current.emit('voice:leave', { userId: currentUser.id });
    } else {
      try {
        const res = await fetch(`${BACKEND_URL}/api/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            userId: currentUser.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.voiceRooms) setVoiceRooms(data.voiceRooms);
        }
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) sounds.playMute();
    else sounds.playUnmute();

    if (activeVoiceChannelId && currentUser) {
      if (socketRef.current?.connected) {
        socketRef.current.emit('voice:update', {
          userId: currentUser.id,
          changes: { isMuted: next }
        });
      } else {
        fetch(`${BACKEND_URL}/api/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            userId: currentUser.id,
            changes: { isMuted: next }
          })
        }).catch(console.warn);
      }
    }
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    sounds.playDeafen();
    if (next && !isMuted) setIsMuted(true);

    if (activeVoiceChannelId && currentUser) {
      if (socketRef.current?.connected) {
        socketRef.current.emit('voice:update', {
          userId: currentUser.id,
          changes: { isDeafened: next, isMuted: next ? true : isMuted }
        });
      } else {
        fetch(`${BACKEND_URL}/api/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            userId: currentUser.id,
            changes: { isDeafened: next, isMuted: next ? true : isMuted }
          })
        }).catch(console.warn);
      }
    }
  };

  const updateStatus = (status, customStatus) => {
    if (!currentUser) return;
    updateProfile({ status, customStatus });
  };

  const createServer = async (name, icon) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, ownerId: currentUser.id })
      });
      const data = await res.json();
      setActiveServerId(data.id);
      if (data.channels && data.channels.length > 0) {
        setActiveChannelId(data.channels[0].id);
      }
      return data;
    } catch (e) {
      console.error(e);
    }
  };

  const createChannel = async (serverId, name, type, category) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, name, type, category })
      });
      const data = await res.json();
      setActiveChannelId(data.id);
      return data;
    } catch (e) {
      console.error(e);
    }
  };

  const currentServer = servers.find(s => s.id === activeServerId) || servers[0];
  const currentChannel = currentServer?.channels?.find(c => c.id === activeChannelId) || currentServer?.channels?.[0];
  const currentMessages = messagesMap[activeChannelId] || [];
  const activeTypingUsers = (typingMap[activeChannelId] || []).map(id => users.find(u => u.id === id)).filter(Boolean);

  return (
    <DiscordContext.Provider
      value={{
        // Auth
        currentUser,
        currentUserId: currentUser?.id,
        isAuthenticated: !!currentUser,
        isLoadingAuth,
        login,
        register,
        logout,
        updateProfile,
        users,
        servers,
        currentServer,
        activeServerId,
        setActiveServerId,
        currentChannel,
        activeChannelId,
        setActiveChannelId,
        messages: currentMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        sendTyping,
        activeTypingUsers,
        replyingToMessage,
        setReplyingToMessage,
        // DMs
        activeDmUserId,
        setActiveDmUserId,
        directMessages,
        setDirectMessages,
        // Voice
        voiceRooms,
        activeVoiceChannelId,
        joinVoice,
        leaveVoice,
        isMuted,
        toggleMute,
        isDeafened,
        toggleDeafen,
        isSpeaking,
        setIsSpeaking,
        // Modals & layout
        isMobileNavOpen,
        setIsMobileNavOpen,
        isMemberListOpen,
        setIsMemberListOpen,
        isCreateServerOpen,
        setIsCreateServerOpen,
        isCreateChannelOpen,
        setIsCreateChannelOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        updateStatus,
        createServer,
        createChannel,
        isSocketConnected,
        socket: socketRef.current
      }}
    >
      {children}
    </DiscordContext.Provider>
  );
}

export function useDiscord() {
  const context = useContext(DiscordContext);
  if (!context) {
    throw new Error('useDiscord must be used within a DiscordProvider');
  }
  return context;
}
