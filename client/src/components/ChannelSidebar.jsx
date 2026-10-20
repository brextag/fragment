import React, { useState } from 'react';
import { useDiscord } from '../context/DiscordContext';
import {
  ChevronDown,
  Hash,
  Volume2,
  Plus,
  Mic,
  MicOff,
  Headphones,
  Settings,
  PhoneOff,
  Radio,
  Users
} from 'lucide-react';

export default function ChannelSidebar() {
  const {
    currentServer,
    activeServerId,
    activeChannelId,
    setActiveChannelId,
    currentUser,
    users,
    voiceRooms,
    activeVoiceChannelId,
    joinVoice,
    leaveVoice,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    setIsCreateChannelOpen,
    setIsSettingsOpen,
    activeDmUserId,
    setActiveDmUserId
  } = useDiscord();

  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-[#23a55a]';
      case 'idle': return 'bg-[#f0b232]';
      case 'dnd': return 'bg-[#f23f43]';
      default: return 'bg-[#80848e]';
    }
  };

  if (!currentUser) return null;

  // Direct Messages view (@me)
  if (activeServerId === '@me') {
    const otherUsers = (users || []).filter(u => u.id !== currentUser.id);

    return (
      <div className="w-60 bg-[#2b2d31] flex flex-col h-full select-none flex-shrink-0">
        {/* Find Conversation search */}
        <div className="h-12 border-b border-[#1f2023] px-2.5 flex items-center shadow-sm">
          <button className="w-full bg-[#1e1f22] text-[#949ba4] text-sm px-2 py-1.5 rounded flex items-center justify-between hover:text-[#dbdee1] transition">
            <span>Find or start a conversation</span>
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <div
            onClick={() => setActiveDmUserId(null)}
            className={`flex items-center gap-4 px-3 py-2 rounded cursor-pointer transition ${
              !activeDmUserId ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
            }`}
          >
            <Users size={20} />
            <span className="font-semibold text-sm">Friends</span>
          </div>

          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-xs font-bold text-[#949ba4] tracking-wider uppercase">
            <span>Direct Messages</span>
          </div>

          {/* List of registered DM contacts */}
          {otherUsers.length === 0 ? (
            <div className="text-xs text-[#949ba4] px-3 py-2 italic">
              No other users yet. Open another tab or invite a friend to chat!
            </div>
          ) : (
            otherUsers.map(user => {
              const isSelected = activeDmUserId === user.id;
              return (
                <div
                  key={user.id}
                  onClick={() => setActiveDmUserId(user.id)}
                  className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer group transition ${
                    isSelected ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover bg-[#1e1f22]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${getStatusColor(
                        user.status
                      )}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      <span className={isSelected ? 'text-white' : 'text-[#dbdee1]'}>
                        {user.displayName || user.username}
                      </span>
                    </div>
                    <div className="text-xs text-[#949ba4] truncate">
                      {user.status === 'online' ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Connected Voice Strip if in voice */}
        {activeVoiceChannelId && (
          <div className="bg-[#232428] border-b border-[#1f2023] px-3.5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={18} className="text-[#23a55a] animate-pulse" />
              <div>
                <div className="text-xs font-bold text-[#23a55a]">Voice Connected</div>
                <div className="text-[11px] text-[#949ba4]">RTC Connected / 15ms</div>
              </div>
            </div>
            <button
              onClick={leaveVoice}
              className="p-1.5 rounded hover:bg-[#35373c] text-[#f23f43] transition"
              title="Disconnect"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        )}

        {/* User bar */}
        <UserPanel
          currentUser={currentUser}
          isMuted={isMuted}
          toggleMute={toggleMute}
          isDeafened={isDeafened}
          toggleDeafen={toggleDeafen}
          setIsSettingsOpen={setIsSettingsOpen}
          getStatusColor={getStatusColor}
        />
      </div>
    );
  }

  // Regular Server Channels View
  const channels = currentServer?.channels || [];
  const categories = [...new Set(channels.map(c => c.category || 'CHANNELS'))];

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col h-full select-none flex-shrink-0 relative">
      {/* Server Header Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
          className="w-full h-12 border-b border-[#1f2023] px-4 flex items-center justify-between font-bold text-white shadow-sm hover:bg-[#35373c] transition"
        >
          <span className="truncate">{currentServer?.name || 'General Community'}</span>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isServerMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Server Dropdown Popover */}
        {isServerMenuOpen && (
          <div className="absolute top-14 left-2 right-2 bg-[#111214] border border-[#232428] rounded-md shadow-2xl p-1.5 z-50 space-y-1">
            <button
              onClick={() => {
                setIsCreateChannelOpen(true);
                setIsServerMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm text-[#5865f2] hover:bg-[#5865f2] hover:text-white rounded transition"
            >
              <span>Create Channel</span>
              <Plus size={16} />
            </button>
            <div className="h-[1px] bg-[#232428] my-1" />
            <button
              onClick={() => {
                setIsSettingsOpen(true);
                setIsServerMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white rounded transition"
            >
              <span>User Settings</span>
              <Settings size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Channel Categories & Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {categories.map((category) => {
          const catChannels = channels.filter(c => (c.category || 'CHANNELS') === category);
          const isCollapsed = collapsedCategories[category];

          return (
            <div key={category} className="space-y-0.5">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-[#949ba4] tracking-wider uppercase group cursor-pointer hover:text-[#dbdee1]">
                <div
                  className="flex items-center gap-1 flex-1"
                  onClick={() => toggleCategory(category)}
                >
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                  <span>{category}</span>
                </div>
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="opacity-0 group-hover:opacity-100 hover:text-white transition p-0.5"
                  title="Create Channel"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Channels */}
              {!isCollapsed &&
                catChannels.map((channel) => {
                  const isActive = activeChannelId === channel.id;
                  const isVoice = channel.type === 'voice';
                  const voiceParticipants = voiceRooms[channel.id] || [];

                  return (
                    <div key={channel.id} className="space-y-0.5">
                      <div
                        onClick={() => {
                          if (isVoice) {
                            joinVoice(channel.id);
                          }
                          setActiveChannelId(channel.id);
                        }}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer group transition ${
                          isActive
                            ? 'bg-[#404249] text-white'
                            : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isVoice ? (
                            <Volume2 size={18} className={isActive ? 'text-white' : 'text-[#80848e]'} />
                          ) : (
                            <Hash size={18} className={isActive ? 'text-white' : 'text-[#80848e]'} />
                          )}
                          <span className="text-sm font-medium truncate">{channel.name}</span>
                        </div>
                      </div>

                      {/* Connected users directly inside voice channel list */}
                      {isVoice && voiceParticipants.length > 0 && (
                        <div className="pl-7 pr-2 py-1 space-y-1">
                          {voiceParticipants.map((participant) => {
                            const u = (users || []).find(user => user.id === participant.userId) || participant;
                            return (
                              <div
                                key={participant.userId}
                                className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-[#35373c] transition group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="relative">
                                    <img
                                      src={u.avatar}
                                      alt={u.username}
                                      className={`w-6 h-6 rounded-full object-cover transition-all ${
                                        participant.isSpeaking ? 'speaking-ring' : ''
                                      }`}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-[#dbdee1] truncate">
                                    {u.displayName || u.username}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[#949ba4]">
                                  {participant.isMuted && <MicOff size={13} className="text-[#f23f43]" />}
                                  {participant.isDeafened && <Headphones size={13} className="text-[#f23f43]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Voice Connected Status Panel */}
      {activeVoiceChannelId && (
        <div className="bg-[#232428] border-b border-[#1f2023] px-3.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[#23a55a] animate-pulse" />
            <div>
              <div className="text-xs font-bold text-[#23a55a]">Voice Connected</div>
              <div className="text-[11px] text-[#949ba4]">RTC Connected / 18ms</div>
            </div>
          </div>
          <button
            onClick={leaveVoice}
            className="p-1.5 rounded hover:bg-[#35373c] text-[#f23f43] transition"
            title="Disconnect"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      )}

      {/* Bottom User Bar */}
      <UserPanel
        currentUser={currentUser}
        isMuted={isMuted}
        toggleMute={toggleMute}
        isDeafened={isDeafened}
        toggleDeafen={toggleDeafen}
        setIsSettingsOpen={setIsSettingsOpen}
        getStatusColor={getStatusColor}
      />
    </div>
  );
}

function UserPanel({
  currentUser,
  isMuted,
  toggleMute,
  isDeafened,
  toggleDeafen,
  setIsSettingsOpen,
  getStatusColor
}) {
  return (
    <div className="relative h-[53px] bg-[#232428] px-2 flex items-center justify-between flex-shrink-0">
      {/* User Info - click opens User Settings */}
      <div
        className="flex items-center gap-2 p-1 -ml-1 rounded hover:bg-[#35373c] cursor-pointer flex-1 min-w-0 mr-1 transition"
        onClick={() => setIsSettingsOpen(true)}
        title="User Settings"
      >
        <div className="relative">
          <img
            src={currentUser.avatar}
            alt={currentUser.username}
            className="w-8 h-8 rounded-full object-cover bg-[#1e1f22]"
          />
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#232428] ${getStatusColor(
              currentUser.status
            )}`}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold text-white truncate">
            {currentUser.displayName || currentUser.username}
          </div>
          <div className="text-[11px] text-[#949ba4] truncate flex items-center gap-1">
            <span>#{currentUser.discriminator || '0001'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Mic, Deafen, Settings */}
      <div className="flex items-center text-[#b5bac1]">
        <button
          onClick={toggleMute}
          className={`p-1.5 rounded transition ${
            isMuted ? 'text-[#f23f43] hover:bg-[#35373c]' : 'hover:bg-[#35373c] hover:text-white'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          onClick={toggleDeafen}
          className={`p-1.5 rounded transition ${
            isDeafened ? 'text-[#f23f43] hover:bg-[#35373c]' : 'hover:bg-[#35373c] hover:text-white'
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          <Headphones size={16} />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition"
          title="User Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
