import React, { useState } from 'react';
import { useDiscord } from '../context/DiscordContext';
import { ShieldCheck, MessageSquare, Award, Sparkles } from 'lucide-react';

export default function MemberList() {
  const {
    users,
    currentUser,
    setActiveServerId,
    setActiveDmUserId
  } = useDiscord();

  const [selectedUser, setSelectedUser] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-[#23a55a]';
      case 'idle': return 'bg-[#f0b232]';
      case 'dnd': return 'bg-[#f23f43]';
      default: return 'bg-[#80848e]';
    }
  };

  const owners = users.filter(u => u.role === 'Server Owner');
  const admins = users.filter(u => u.role === 'Admin');
  const mods = users.filter(u => u.role === 'Moderator');
  const members = users.filter(u => !['Server Owner', 'Admin', 'Moderator'].includes(u.role));

  const roleSections = [
    { title: 'Server Owner', list: owners },
    { title: 'Admin', list: admins },
    { title: 'Moderator', list: mods },
    { title: 'Members', list: members }
  ].filter(section => section.list.length > 0);

  const handleStartDM = (user) => {
    setActiveServerId('@me');
    setActiveDmUserId(user.id);
    setSelectedUser(null);
  };

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col h-full select-none flex-shrink-0 border-l border-[#1f2023] relative">
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {roleSections.map(section => (
          <div key={section.title} className="space-y-0.5">
            <div className="text-xs font-bold text-[#949ba4] tracking-wider uppercase px-2 py-1">
              {section.title} — {section.list.length}
            </div>

            {section.list.map(user => {
              const isSelected = selectedUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer group transition ${
                    isSelected
                      ? 'bg-[#404249]'
                      : 'hover:bg-[#35373c] text-[#949ba4] hover:text-[#dbdee1]'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#2b2d31] ${getStatusColor(
                        user.status
                      )}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: user.color || '#dbdee1' }}
                      >
                        {user.displayName || user.username}
                      </span>
                      {user.role === 'Admin' || user.role === 'Server Owner' ? (
                        <ShieldCheck size={14} className="text-[#5865f2] flex-shrink-0" />
                      ) : null}
                    </div>
                    {user.customStatus && (
                      <div className="text-[11px] text-[#949ba4] truncate">
                        {user.customStatus}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mini Profile Popover Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-80 bg-[#232428] rounded-2xl overflow-hidden shadow-2xl border border-[#35373c]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner */}
            <div
              className="h-24 w-full"
              style={{ backgroundColor: selectedUser.color || '#5865f2' }}
            />

            {/* Profile info */}
            <div className="px-4 pb-4 relative">
              <div className="relative -mt-12 mb-3">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.username}
                  className="w-20 h-20 rounded-full border-4 border-[#232428] object-cover"
                />
                <span
                  className={`absolute bottom-1 left-14 w-4 h-4 rounded-full border-2 border-[#232428] ${getStatusColor(
                    selectedUser.status
                  )}`}
                />
              </div>

              <div className="bg-[#111214] p-3 rounded-lg mb-3">
                <div className="text-base font-bold text-white">
                  {selectedUser.displayName || selectedUser.username}
                </div>
                <div className="text-xs text-[#949ba4]">
                  @{selectedUser.username.toLowerCase()}#{selectedUser.discriminator || '0001'}
                </div>

                {selectedUser.customStatus && (
                  <div className="text-xs text-[#dbdee1] mt-2 pt-2 border-t border-[#232428]">
                    {selectedUser.customStatus}
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
                  Roles
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5"
                    style={{
                      backgroundColor: `${selectedUser.color || '#5865f2'}25`,
                      color: selectedUser.color || '#5865f2'
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedUser.color }} />
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {selectedUser.id !== currentUser.id && (
                <button
                  onClick={() => handleStartDM(selectedUser)}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-2 px-3 rounded text-sm font-semibold flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare size={16} />
                  <span>Send Direct Message</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
