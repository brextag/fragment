import React, { useState, useRef, useEffect } from 'react';
import { useDiscord, BACKEND_URL } from '../context/DiscordContext';
import {
  Hash,
  Bell,
  Pin,
  Users,
  Search,
  PlusCircle,
  Gift,
  FileImage,
  Smile,
  X,
  Edit2,
  Trash2,
  Reply,
  Check,
  Send,
  Copy
} from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '🕶️', '🥩', '✨', '👀', '💯', '💩'];

export default function ChatArea() {
  const {
    currentChannel,
    currentServer,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    sendTyping,
    activeTypingUsers,
    replyingToMessage,
    setReplyingToMessage,
    isMemberListOpen,
    setIsMemberListOpen,
    currentUser,
    users
  } = useDiscord();

  const [text, setText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing & input change
  const handleInputChange = (e) => {
    setText(e.target.value);
    sendTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    sendMessage({
      content: text,
      attachments
    });
    setText('');
    setAttachments([]);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        const res = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: dataUrl,
            name: file.name,
            size: file.size,
            type: file.type
          })
        });
        const data = await res.json();
        setAttachments(prev => [...prev, data]);
      } catch (err) {
        // Fallback: attach directly as data URL
        setAttachments(prev => [...prev, {
          url: dataUrl,
          name: file.name,
          size: file.size,
          mimetype: file.type
        }]);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full overflow-hidden select-text relative">
      {/* Top Channel Header */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm select-none z-10 bg-[#313338]">
        <div className="flex items-center gap-2 min-w-0">
          <Hash size={24} className="text-[#80848e] flex-shrink-0" />
          <span className="font-bold text-white text-base truncate">
            {currentChannel?.name || 'general'}
          </span>
          {currentChannel?.topic && (
            <>
              <div className="h-4 w-[1px] bg-[#3f4147] mx-2 hidden sm:block" />
              <span className="text-xs text-[#949ba4] truncate hidden sm:inline-block max-w-md">
                {currentChannel.topic}
              </span>
            </>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3 text-[#b5bac1]">
          {/* Search bar */}
          <div className="relative flex items-center bg-[#1e1f22] rounded px-2 py-1 text-xs">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white placeholder-[#949ba4] outline-none w-28 focus:w-44 transition-all duration-200"
            />
            <Search size={14} className="text-[#949ba4] ml-1" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="ml-1 text-[#949ba4] hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMemberListOpen(!isMemberListOpen)}
            className={`p-1.5 rounded hover:bg-[#35373c] transition ${
              isMemberListOpen ? 'text-white' : 'text-[#949ba4]'
            }`}
            title="Toggle Member List"
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome Channel Banner at top */}
        {!searchQuery && (
          <div className="pt-6 pb-4 border-b border-[#35373c] mb-4">
            <div className="w-16 h-16 rounded-full bg-[#404249] flex items-center justify-center text-white mb-3">
              <Hash size={38} />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-1">
              Welcome to #{currentChannel?.name || 'general'}!
            </h1>
            <p className="text-sm text-[#949ba4]">
              This is the start of the #{currentChannel?.name || 'general'} channel. Send a message to start chatting!
            </p>
          </div>
        )}

        {/* Message Items */}
        {filteredMessages.map((msg, idx) => {
          const author = users.find(u => u.id === msg.userId) || {
            username: 'Unknown',
            displayName: 'Unknown',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            color: '#5865f2'
          };
          const isCurrentUser = msg.userId === currentUser.id;
          const prevMsg = filteredMessages[idx - 1];
          const isCompact =
            prevMsg &&
            prevMsg.userId === msg.userId &&
            new Date(msg.timestamp) - new Date(prevMsg.timestamp) < 5 * 60 * 1000 &&
            !msg.replyToId;

          const repliedMsg = msg.replyToId
            ? messages.find(m => m.id === msg.replyToId)
            : null;
          const repliedAuthor = repliedMsg ? users.find(u => u.id === repliedMsg.userId) : null;

          return (
            <MessageRow
              key={msg.id}
              msg={msg}
              author={author}
              isCompact={isCompact}
              isCurrentUser={isCurrentUser}
              repliedMsg={repliedMsg}
              repliedAuthor={repliedAuthor}
              formatTimestamp={formatTimestamp}
              editingMessageId={editingMessageId}
              setEditingMessageId={setEditingMessageId}
              editingContent={editingContent}
              setEditingContent={setEditingContent}
              editMessage={editMessage}
              deleteMessage={deleteMessage}
              toggleReaction={toggleReaction}
              setReplyingToMessage={setReplyingToMessage}
              currentUser={currentUser}
              users={users}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingToMessage && (
        <div className="bg-[#2b2d31] px-4 py-1.5 flex items-center justify-between text-xs text-[#b5bac1] border-t border-[#1f2023]">
          <div className="flex items-center gap-1.5 truncate">
            <Reply size={14} className="text-[#5865f2]" />
            <span>Replying to</span>
            <span className="font-semibold text-white">
              @{users.find(u => u.id === replyingToMessage.userId)?.displayName || 'User'}
            </span>
            <span className="truncate italic text-[#949ba4] max-w-xs ml-2">
              "{replyingToMessage.content}"
            </span>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="p-1 hover:text-white transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attachments preview before sending */}
      {attachments.length > 0 && (
        <div className="bg-[#2b2d31] px-4 py-2 flex items-center gap-3 border-t border-[#1f2023] overflow-x-auto">
          {attachments.map((att, i) => (
            <div key={i} className="relative group bg-[#1e1f22] p-2 rounded-lg flex items-center gap-2">
              {att.mimetype?.startsWith('image/') ? (
                <img src={att.url} alt="upload" className="w-12 h-12 object-cover rounded" />
              ) : (
                <FileImage size={24} className="text-[#5865f2]" />
              )}
              <span className="text-xs text-[#dbdee1] max-w-[120px] truncate">{att.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1 -right-1 bg-[#f23f43] text-white rounded-full p-0.5 hover:scale-110 transition"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input Box */}
      <div className="px-4 pb-4 pt-1 relative">
        <div className="bg-[#383a40] rounded-lg flex items-center px-4 py-2.5 gap-3 focus-within:ring-1 focus-within:ring-[#5865f2]">
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#b5bac1] hover:text-white transition p-1 hover:bg-[#404249] rounded-full"
            title="Upload File or Image"
          >
            <PlusCircle size={22} className={isUploading ? 'animate-spin' : ''} />
          </button>

          {/* Text Input */}
          <input
            ref={textareaRef}
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${currentChannel?.name || 'general'}`}
            className="flex-1 bg-transparent text-white placeholder-[#949ba4] text-sm outline-none"
          />

          {/* Emoji and Send Buttons */}
          <div className="flex items-center gap-2 text-[#b5bac1]">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 hover:text-white hover:bg-[#404249] rounded transition"
              title="Add Emoji"
            >
              <Smile size={22} />
            </button>

            <button
              type="button"
              onClick={handleSend}
              className={`p-1 rounded transition ${
                text.trim() || attachments.length > 0
                  ? 'text-[#5865f2] hover:bg-[#404249]'
                  : 'text-[#4e5058] cursor-not-allowed'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl p-3 z-50 w-72">
            <div className="text-xs font-bold text-[#949ba4] mb-2 uppercase">Pick a Reaction</div>
            <div className="grid grid-cols-6 gap-2 text-2xl">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 hover:bg-[#35373c] rounded hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        <div className="h-5 px-1 flex items-center gap-1.5 text-xs text-[#949ba4]">
          {activeTypingUsers.length > 0 && (
            <>
              <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 bg-[#949ba4] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-[#949ba4] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-[#949ba4] rounded-full animate-bounce" />
              </div>
              <span>
                <strong className="text-white font-semibold">
                  {activeTypingUsers.map(u => u.displayName || u.username).join(', ')}
                </strong>{' '}
                {activeTypingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  msg,
  author,
  isCompact,
  isCurrentUser,
  repliedMsg,
  repliedAuthor,
  formatTimestamp,
  editingMessageId,
  setEditingMessageId,
  editingContent,
  setEditingContent,
  editMessage,
  deleteMessage,
  toggleReaction,
  setReplyingToMessage,
  currentUser,
  users = []
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  const isEditing = editingMessageId === msg.id;

  const handleSaveEdit = () => {
    if (editingContent.trim()) {
      editMessage(msg.id, editingContent);
    }
    setEditingMessageId(null);
  };

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiMenu(false);
      }}
      className={`group relative flex flex-col py-1 px-2 -mx-2 rounded hover:bg-[#2b2d31]/50 transition-colors ${
        isEditing ? 'bg-[#2b2d31]/80' : ''
      }`}
    >
      {/* Reply Reference Indicator */}
      {repliedMsg && (
        <div className="flex items-center gap-2 text-xs text-[#949ba4] mb-1 pl-10 relative">
          <div className="absolute left-4 top-2 w-4 h-3 border-l-2 border-t-2 border-[#4e5058] rounded-tl" />
          <img
            src={repliedAuthor?.avatar}
            alt="avatar"
            className="w-4 h-4 rounded-full object-cover"
          />
          <span className="font-semibold text-[#dbdee1]">
            @{repliedAuthor?.displayName || 'User'}
          </span>
          <span className="truncate italic max-w-sm">{repliedMsg.content}</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar or Timestamp for compact */}
        {!isCompact ? (
          <img
            src={author.avatar}
            alt={author.username}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition mt-0.5"
          />
        ) : (
          <div className="w-10 text-[10px] text-[#949ba4] text-right flex-shrink-0 opacity-0 group-hover:opacity-100 select-none pt-1">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Message Body */}
        <div className="flex-1 min-w-0">
          {!isCompact && (
            <div className="flex items-baseline gap-2 leading-none mb-1">
              <span
                className="font-semibold text-sm hover:underline cursor-pointer"
                style={{ color: author.color || '#dbdee1' }}
              >
                {author.displayName || author.username}
              </span>
              {author.role && (
                <span className="bg-[#5865f2]/20 text-[#5865f2] text-[10px] px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                  {author.role}
                </span>
              )}
              <span className="text-[11px] text-[#949ba4]">
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          )}

          {/* Edit mode or Content */}
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <input
                type="text"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setEditingMessageId(null);
                }}
                className="w-full bg-[#383a40] text-white text-sm rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#5865f2]"
                autoFocus
              />
              <div className="text-[11px] text-[#949ba4] flex items-center gap-2">
                <span>escape to <button onClick={() => setEditingMessageId(null)} className="text-[#5865f2] hover:underline">cancel</button></span>
                <span>•</span>
                <span>enter to <button onClick={handleSaveEdit} className="text-[#5865f2] hover:underline">save</button></span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#dbdee1] leading-relaxed break-words">
              <MarkdownContent content={msg.content} />
              {msg.edited && (
                <span className="text-[10px] text-[#949ba4] ml-1 select-none">(edited)</span>
              )}
            </div>
          )}

          {/* Image / File Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.attachments.map((att, i) => (
                <div key={i} className="max-w-md rounded-lg overflow-hidden border border-[#2b2d31] bg-[#1e1f22]">
                  {att.mimetype?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                    <img
                      src={att.url}
                      alt={att.name || 'Attachment'}
                      className="max-h-80 max-w-full rounded cursor-pointer object-contain hover:brightness-105 transition"
                      onClick={() => window.open(att.url, '_blank')}
                    />
                  ) : (
                    <a
                      href={att.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 text-xs text-[#5865f2] hover:underline"
                    >
                      <FileImage size={20} />
                      <span>{att.name || 'Download Attachment'}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reactions bar */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {msg.reactions.map((r) => {
                const hasReacted = r.users.includes(currentUser.id);
                return (
                  <button
                    key={r.emoji}
                    onClick={() => toggleReaction(msg.id, r.emoji)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition border ${
                      hasReacted
                        ? 'bg-[#5865f2]/20 border-[#5865f2] text-white'
                        : 'bg-[#2b2d31] border-[#3f4147] text-[#dbdee1] hover:bg-[#35373c]'
                    }`}
                    title={(r.users || []).map(uId => users?.find(u => u.id === uId)?.username || 'User').join(', ')}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-semibold text-[11px]">{r.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar on hover */}
      {showActions && !isEditing && (
        <div className="absolute -top-3.5 right-4 bg-[#313338] border border-[#232428] rounded-md shadow-lg flex items-center text-[#b5bac1] py-0.5 px-1 z-20">
          {/* Reaction shortcut */}
          <button
            onClick={() => setShowEmojiMenu(!showEmojiMenu)}
            className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition"
            title="Add Reaction"
          >
            <Smile size={16} />
          </button>

          {/* Reply */}
          <button
            onClick={() => setReplyingToMessage(msg)}
            className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition"
            title="Reply"
          >
            <Reply size={16} />
          </button>

          {/* Edit (if own message) */}
          {isCurrentUser && (
            <button
              onClick={() => {
                setEditingMessageId(msg.id);
                setEditingContent(msg.content);
              }}
              className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition"
              title="Edit Message"
            >
              <Edit2 size={16} />
            </button>
          )}

          {/* Delete */}
          {(isCurrentUser || currentUser.role === 'Admin' || currentUser.role === 'Server Owner') && (
            <button
              onClick={() => deleteMessage(msg.id)}
              className="p-1.5 hover:bg-[#35373c] hover:text-[#f23f43] rounded transition"
              title="Delete Message"
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Quick Emoji Menu */}
          {showEmojiMenu && (
            <div className="absolute top-8 right-0 bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-xl p-2 z-50 flex items-center gap-1.5">
              {['👍', '❤️', '🔥', '😂', '🎉', '🚀', '🕶️'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    toggleReaction(msg.id, emoji);
                    setShowEmojiMenu(false);
                  }}
                  className="p-1 text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Markdown parser helper
function MarkdownContent({ content }) {
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const [copiedCode, setCopiedCode] = useState(null);

  if (!content) return null;

  // Split multiline code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    parts.push({
      type: 'codeblock',
      lang: match[1] || 'plaintext',
      code: match[2]
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  const renderInlineFormatted = (rawText) => {
    // Process spoilers ||spoiler||
    const spoilerParts = rawText.split(/(\|\|[\s\S]*?\|\|)/g);

    return spoilerParts.map((spPart, spIdx) => {
      if (spPart.startsWith('||') && spPart.endsWith('||')) {
        const secret = spPart.slice(2, -2);
        const isRevealed = revealedSpoilers[`${spIdx}`];
        return (
          <span
            key={spIdx}
            onClick={() => setRevealedSpoilers(p => ({ ...p, [`${spIdx}`]: !p[`${spIdx}`] }))}
            className={isRevealed ? 'spoiler-revealed' : 'spoiler-hidden'}
            title="Spoiler"
          >
            {secret}
          </span>
        );
      }

      // Process quotes > quote
      const lines = spPart.split('\n');
      return lines.map((line, lIdx) => {
        let renderedLine = line;

        // Check quote
        const isQuote = line.startsWith('> ');
        if (isQuote) {
          renderedLine = line.slice(2);
        }

        // Inline code `code`
        const codeSegments = renderedLine.split(/(`[^`]+`)/g);

        const innerContent = codeSegments.map((seg, cIdx) => {
          if (seg.startsWith('`') && seg.endsWith('`')) {
            return (
              <code key={cIdx} className="bg-[#1e1f22] text-[#e0e1e5] px-1.5 py-0.5 rounded text-xs font-mono">
                {seg.slice(1, -1)}
              </code>
            );
          }

          // Bold **text**
          let formattedSeg = seg;
          // Simple replace for mentions @username
          const words = formattedSeg.split(/(@[a-zA-Z0-9_-]+)/g);
          return (
            <span key={cIdx}>
              {words.map((w, wIdx) => {
                if (w.startsWith('@')) {
                  return (
                    <span
                      key={wIdx}
                      className="bg-[#5865f2]/20 text-[#c9cdfb] px-1 py-0.5 rounded font-medium hover:bg-[#5865f2] hover:text-white transition cursor-pointer"
                    >
                      {w}
                    </span>
                  );
                }

                // Check bold **text** and italic *text*
                if (w.includes('**')) {
                  const bParts = w.split(/(\*\*[^*]+\*\*)/g);
                  return bParts.map((bp, bpIdx) => {
                    if (bp.startsWith('**') && bp.endsWith('**')) {
                      return <strong key={bpIdx} className="font-bold text-white">{bp.slice(2, -2)}</strong>;
                    }
                    return bp;
                  });
                }

                return w;
              })}
            </span>
          );
        });

        if (isQuote) {
          return (
            <blockquote key={lIdx} className="border-l-4 border-[#4e5058] pl-3 py-0.5 my-1 text-[#949ba4]">
              {innerContent}
            </blockquote>
          );
        }

        return (
          <React.Fragment key={lIdx}>
            {innerContent}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      });
    });
  };

  return (
    <div>
      {parts.map((p, idx) => {
        if (p.type === 'codeblock') {
          return (
            <div key={idx} className="my-2 bg-[#1e1f22] rounded-md border border-[#232428] overflow-hidden">
              <div className="bg-[#111214] px-3 py-1 flex items-center justify-between text-xs text-[#949ba4]">
                <span className="font-mono uppercase">{p.lang}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(p.code);
                    setCopiedCode(idx);
                    setTimeout(() => setCopiedCode(null), 2000);
                  }}
                  className="flex items-center gap-1 hover:text-white transition"
                >
                  {copiedCode === idx ? <Check size={13} className="text-[#23a55a]" /> : <Copy size={13} />}
                  <span>{copiedCode === idx ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 text-xs font-mono text-[#dbdee1] overflow-x-auto leading-relaxed">
                <code>{p.code}</code>
              </pre>
            </div>
          );
        }
        return <span key={idx}>{renderInlineFormatted(p.value)}</span>;
      })}
    </div>
  );
}
