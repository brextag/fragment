import React, { useState, useRef, useEffect } from 'react';
import { useDiscord } from '../context/DiscordContext';
import {
  Users,
  MessageSquare,
  Phone,
  Video,
  UserPlus,
  Search,
  MoreVertical,
  PlusCircle,
  Smile,
  Send,
  X
} from 'lucide-react';

export default function DirectMessagesView() {
  const {
    activeDmUserId,
    setActiveDmUserId,
    currentUser,
    users,
    directMessages,
    sendMessage
  } = useDiscord();

  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'all' | 'add'
  const [dmText, setDmText] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [friendReqSent, setFriendReqSent] = useState(false);

  const messagesEndRef = useRef(null);

  if (!currentUser) return null;

  const targetUser = (users || []).find(u => u.id === activeDmUserId);
  const currentDm = directMessages.find(d =>
    d.participants.includes(currentUser.id) && d.participants.includes(activeDmUserId)
  );
  const messages = currentDm?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendDm = () => {
    if (!dmText.trim()) return;
    sendMessage({ content: dmText });
    setDmText('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-[#23a55a]';
      case 'idle': return 'bg-[#f0b232]';
      case 'dnd': return 'bg-[#f23f43]';
      default: return 'bg-[#80848e]';
    }
  };

  // If a specific DM conversation is open
  if (activeDmUserId && targetUser) {
    return (
      <div className="flex-1 flex flex-col bg-[#313338] h-full overflow-hidden select-text">
        {/* DM Header */}
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm select-none bg-[#313338]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <img
                src={targetUser.avatar}
                alt={targetUser.username}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#313338] ${getStatusColor(
                  targetUser.status
                )}`}
              />
            </div>
            <span className="font-bold text-white text-base truncate">
              {targetUser.displayName || targetUser.username}
            </span>
            <span className="text-xs text-[#949ba4] hidden sm:inline">
              @{targetUser.username.toLowerCase()}#{targetUser.discriminator}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#b5bac1]">
            <button
              onClick={() => {}}
              className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition"
              title="Start Voice Call"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => {}}
              className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition"
              title="Start Video Call"
            >
              <Video size={18} />
            </button>
          </div>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Header banner */}
          <div className="pt-6 pb-4 border-b border-[#35373c] mb-4">
            <img
              src={targetUser.avatar}
              alt={targetUser.username}
              className="w-20 h-20 rounded-full object-cover mb-3"
            />
            <h1 className="text-3xl font-extrabold text-white mb-1">
              {targetUser.displayName || targetUser.username}
            </h1>
            <p className="text-sm text-[#949ba4]">
              This is the beginning of your direct message history with{' '}
              <strong className="text-white">@{targetUser.username}</strong>.
            </p>
          </div>

          {messages.map((m) => {
            const isMe = m.userId === currentUser.id;
            const author = isMe ? currentUser : targetUser;

            return (
              <div key={m.id} className="flex items-start gap-4 py-1 group">
                <img
                  src={author.avatar}
                  alt={author.username}
                  className="w-10 h-10 rounded-full object-cover mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm text-white">
                      {author.displayName || author.username}
                    </span>
                    <span className="text-[11px] text-[#949ba4]">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm text-[#dbdee1] leading-relaxed break-words">
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-1">
          <div className="bg-[#383a40] rounded-lg flex items-center px-4 py-2.5 gap-3">
            <button
              type="button"
              className="text-[#b5bac1] hover:text-white transition"
            >
              <PlusCircle size={22} />
            </button>
            <input
              type="text"
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendDm();
              }}
              placeholder={`Message @${targetUser.displayName || targetUser.username}`}
              className="flex-1 bg-transparent text-white placeholder-[#949ba4] text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleSendDm}
              className={`p-1 rounded transition ${
                dmText.trim() ? 'text-[#5865f2] hover:bg-[#404249]' : 'text-[#4e5058]'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Friends dashboard
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const onlineFriends = otherUsers.filter(u => u.status !== 'offline');

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full overflow-hidden select-none">
      {/* Top Header tabs */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center gap-4 shadow-sm bg-[#313338]">
        <div className="flex items-center gap-2 font-bold text-white border-r border-[#3f4147] pr-4">
          <Users size={20} />
          <span>Friends</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-2 py-1 rounded transition ${
              activeTab === 'online' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
            }`}
          >
            Online ({onlineFriends.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 rounded transition ${
              activeTab === 'all' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
            }`}
          >
            All ({otherUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-2 py-1 rounded transition ${
              activeTab === 'add'
                ? 'bg-[#23a55a]/20 text-[#23a55a]'
                : 'bg-[#23a55a] text-white hover:bg-[#1f934f]'
            }`}
          >
            Add Friend
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'add' ? (
            <div className="max-w-xl space-y-4">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                ADD FRIEND
              </h2>
              <p className="text-xs text-[#949ba4]">
                You can add friends with their Fragment Tag. It's cAsE sEnSiTiVe!
              </p>
              <div className="bg-[#1e1f22] border border-[#111214] rounded-lg p-3 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="You can add friends with their Fragment Tag (e.g. username#1234)..."
                  value={addFriendInput}
                  onChange={(e) => setAddFriendInput(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#949ba4] outline-none"
                />
                <button
                  onClick={() => {
                    if (addFriendInput.trim()) {
                      setFriendReqSent(true);
                      setTimeout(() => setFriendReqSent(false), 3000);
                      setAddFriendInput('');
                    }
                  }}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold px-4 py-2 rounded transition"
                >
                  Send Friend Request
                </button>
              </div>
              {friendReqSent && (
                <div className="text-xs text-[#23a55a]">
                  Friend request sent successfully!
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-4">
                {activeTab === 'online' ? `ONLINE — ${onlineFriends.length}` : `ALL FRIENDS — ${otherUsers.length}`}
              </div>

              <div className="space-y-1">
                {(activeTab === 'online' ? onlineFriends : otherUsers).map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#35373c] group transition cursor-pointer"
                    onClick={() => setActiveDmUserId(friend.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#313338] ${getStatusColor(
                            friend.status
                          )}`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                          <span>{friend.displayName || friend.username}</span>
                          <span className="text-xs text-[#949ba4] opacity-0 group-hover:opacity-100 transition">
                            #{friend.discriminator}
                          </span>
                        </div>
                        <div className="text-xs text-[#949ba4]">
                          {friend.customStatus || friend.status}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDmUserId(friend.id);
                        }}
                        className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#b5bac1] hover:text-white hover:bg-[#1e1f22] transition"
                        title="Message"
                      >
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Now panel */}
        <div className="w-80 border-l border-[#1f2023] p-4 hidden lg:block overflow-y-auto">
          <h3 className="text-xl font-bold text-white mb-4">Active Now</h3>
          <div className="space-y-3">
            {onlineFriends.map((f) => (
              <div key={f.id} className="bg-[#2b2d31] p-3 rounded-lg border border-[#1f2023]">
                <div className="flex items-center gap-2.5 mb-2">
                  <img src={f.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <div className="text-xs font-bold text-white">{f.displayName}</div>
                    <div className="text-[11px] text-[#949ba4]">Active in {f.customStatus || 'Fragment'}</div>
                  </div>
                </div>
                <div className="text-xs text-[#dbdee1] bg-[#1e1f22] p-2 rounded">
                  Status: "{f.customStatus || 'Ready to chat'}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
