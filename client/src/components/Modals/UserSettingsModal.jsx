import React, { useState } from 'react';
import { useDiscord } from '../../context/DiscordContext';
import { X, Volume2, Shield, User, Bell, Check, LogOut } from 'lucide-react';
import sounds from '../../services/soundEffects';

export default function UserSettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    currentUser,
    updateStatus,
    logout
  } = useDiscord();

  const [activeTab, setActiveTab] = useState('account');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || currentUser?.username || '');
  const [customStatus, setCustomStatus] = useState(currentUser?.customStatus || '');
  const [status, setStatus] = useState(currentUser?.status || 'online');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isSettingsOpen || !currentUser) return null;

  const handleSave = () => {
    updateStatus(status, customStatus);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const testAudio = () => {
    sounds.playJoinVoice();
    setTimeout(() => sounds.playMessageNotification(), 400);
  };

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 flex overflow-hidden">
      {/* Settings Left Navigation Sidebar */}
      <div className="w-60 bg-[#2b2d31] flex justify-end py-14 pr-6 flex-shrink-0">
        <div className="w-48 space-y-1">
          <div className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider px-2.5 mb-1.5">
            User Settings
          </div>

          <button
            onClick={() => setActiveTab('account')}
            className={`w-full text-left px-2.5 py-1.5 rounded text-sm font-semibold transition flex items-center gap-2.5 ${
              activeTab === 'account' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'
            }`}
          >
            <User size={16} />
            <span>My Account</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`w-full text-left px-2.5 py-1.5 rounded text-sm font-semibold transition flex items-center gap-2.5 ${
              activeTab === 'audio' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'
            }`}
          >
            <Volume2 size={16} />
            <span>Voice & Audio</span>
          </button>

          <div className="h-[1px] bg-[#3f4147]/50 my-2" />

          {/* Log Out button */}
          <button
            onClick={logout}
            className="w-full text-left px-2.5 py-1.5 rounded text-sm font-semibold text-[#f23f43] hover:bg-[#f23f43]/15 transition flex items-center gap-2.5"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 py-14 pl-10 pr-20 overflow-y-auto max-w-2xl relative">
        {/* ESC Button */}
        <div className="fixed top-14 right-20 flex flex-col items-center">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="w-9 h-9 border-2 border-[#b5bac1] rounded-full flex items-center justify-center text-[#b5bac1] hover:text-white hover:border-white transition"
          >
            <X size={18} />
          </button>
          <span className="text-[11px] font-semibold text-[#b5bac1] mt-1 uppercase">ESC</span>
        </div>

        {activeTab === 'account' ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">My Account</h2>

            {/* Profile Card Preview */}
            <div className="bg-[#1e1f22] rounded-xl overflow-hidden border border-[#2b2d31]">
              <div
                className="h-24 w-full"
                style={{ backgroundColor: currentUser.color || '#5865f2' }}
              />
              <div className="px-6 pb-6 relative">
                <div className="relative -mt-10 mb-4 flex items-end justify-between">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-20 h-20 rounded-full border-4 border-[#1e1f22] object-cover bg-[#2b2d31]"
                  />
                  <div className="text-xs bg-[#2b2d31] px-3 py-1 rounded text-white font-medium">
                    {currentUser.role}
                  </div>
                </div>

                <div className="text-lg font-bold text-white">
                  {currentUser.displayName || currentUser.username}
                </div>
                <div className="text-xs text-[#949ba4]">
                  @{currentUser.username.toLowerCase()}#{currentUser.discriminator || '0001'}
                </div>
              </div>
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block">
                Online Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'online', label: 'Online', color: 'bg-[#23a55a]' },
                  { id: 'idle', label: 'Idle', color: 'bg-[#f0b232]' },
                  { id: 'dnd', label: 'Do Not Disturb', color: 'bg-[#f23f43]' },
                  { id: 'offline', label: 'Invisible', color: 'bg-[#80848e]' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border transition ${
                      status === opt.id
                        ? 'bg-[#2b2d31] border-[#5865f2]'
                        : 'bg-[#2b2d31]/50 border-transparent hover:bg-[#2b2d31]'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                    <span className="text-sm font-medium text-white">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Status Quote */}
            <div>
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Custom Status
              </label>
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="What's on your mind? (e.g. Coding something awesome)"
                className="w-full bg-[#1e1f22] border border-[#2b2d31] rounded-md px-3.5 py-2 text-sm text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2]"
              />
            </div>

            <button
              onClick={handleSave}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold px-6 py-2 rounded shadow transition flex items-center gap-2"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Voice & Audio Settings</h2>

            <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Sound Effects</div>
                  <div className="text-xs text-[#949ba4]">
                    Play synthesized Fragment sound effects on voice join, leave, mute, and messages
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    sounds.toggleSound(next);
                  }}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    soundEnabled ? 'bg-[#23a55a]' : 'bg-[#4e5058]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                      soundEnabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-[#3f4147]/30">
                <button
                  onClick={testAudio}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold px-4 py-2 rounded transition flex items-center gap-2"
                >
                  <Volume2 size={16} />
                  <span>Test Audio & Sound Effects</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
