import React, { useState, useRef } from 'react';
import { useDiscord } from '../../context/DiscordContext';
import { X, Volume2, User, Check, LogOut, Upload, Image, Palette, Sparkles } from 'lucide-react';
import sounds from '../../services/soundEffects';

const AVATAR_PRESETS = [
  { label: 'Bot Spark', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=spark' },
  { label: 'Cyber Cat', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=cybercat' },
  { label: 'Pixel Gamer', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=gamer' },
  { label: 'Fox Ninja', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=foxninja' },
  { label: 'Astro', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=astro' },
  { label: 'Prism', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=crystal' }
];

const BANNER_PRESETS = [
  { label: 'Abstract Waves', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop' },
  { label: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop' },
  { label: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop' },
  { label: 'Synthwave', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop' },
  { label: 'Midnight Aurora', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&auto=format&fit=crop' }
];

const COLOR_SWATCHES = [
  '#5865F2', // Blurple
  '#23A55A', // Green
  '#EB459E', // Pink
  '#FEE75C', // Yellow
  '#ED4245', // Red
  '#00A8FC', // Sky
  '#57F287', // Mint
  '#2B2D31'  // Dark Slate
];

export default function UserSettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    currentUser,
    updateProfile,
    logout
  } = useDiscord();

  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'profile' | 'audio'
  const [displayName, setDisplayName] = useState(currentUser?.displayName || currentUser?.username || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [banner, setBanner] = useState(currentUser?.banner || BANNER_PRESETS[0].url);
  const [color, setColor] = useState(currentUser?.color || '#5865f2');
  const [customStatus, setCustomStatus] = useState(currentUser?.customStatus || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [status, setStatus] = useState(currentUser?.status || 'online');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  if (!isSettingsOpen || !currentUser) return null;

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBanner(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (updateProfile) {
      await updateProfile({
        displayName,
        avatar,
        banner,
        color,
        customStatus,
        bio,
        status
      });
    }
    sounds.playMessageNotification();
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
            <span>My Profile</span>
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
      <div className="flex-1 py-14 pl-10 pr-20 overflow-y-auto max-w-3xl relative">
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
          <div className="space-y-6 pb-12">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">User Profile</h2>
              <p className="text-xs text-[#949ba4]">Customize your Profile Picture, Banner, Display Name and Status</p>
            </div>

            {/* Live Profile Card Preview */}
            <div className="bg-[#1e1f22] rounded-xl overflow-hidden border border-[#2b2d31] shadow-xl">
              {/* Banner Area */}
              <div
                className="h-32 w-full relative transition-all duration-300"
                style={{
                  backgroundColor: color,
                  backgroundImage: banner ? `url(${banner})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-black/20" />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 backdrop-blur-sm transition"
                >
                  <Upload size={13} />
                  <span>Change Banner</span>
                </button>
              </div>

              {/* Profile Details Area */}
              <div className="px-6 pb-6 relative">
                <div className="relative -mt-12 mb-4 flex items-end justify-between">
                  <div className="relative group">
                    <img
                      src={avatar || currentUser.avatar}
                      alt={currentUser.username}
                      className="w-24 h-24 rounded-full border-4 border-[#1e1f22] object-cover bg-[#2b2d31] shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                    >
                      <Upload size={18} />
                    </button>
                  </div>
                  <div className="text-xs bg-[#2b2d31] px-3 py-1.5 rounded-full text-white font-medium border border-[#3f4147]/50">
                    {currentUser.role || 'Member'}
                  </div>
                </div>

                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{displayName || currentUser.username}</span>
                </div>
                <div className="text-xs text-[#949ba4] mb-3">
                  @{currentUser.username.toLowerCase()}#{currentUser.discriminator || '0001'}
                </div>

                {customStatus && (
                  <div className="text-xs text-[#dbdee1] bg-[#2b2d31]/60 px-3 py-1.5 rounded-md mb-3 border border-[#3f4147]/30 inline-block">
                    💬 {customStatus}
                  </div>
                )}

                {bio && (
                  <div className="text-xs text-[#dbdee1] bg-[#111214] p-3 rounded-lg border border-[#2b2d31]">
                    <div className="text-[10px] uppercase font-bold text-[#949ba4] tracking-wider mb-1">About Me</div>
                    <div className="whitespace-pre-line">{bio}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFile}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={bannerInputRef}
              onChange={handleBannerFile}
              accept="image/*"
              className="hidden"
            />

            {/* Profile Picture (Avatar) Editor */}
            <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147]/30 space-y-3">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block">
                Profile Picture (Avatar)
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold px-4 py-2 rounded-md transition flex items-center gap-2"
                >
                  <Upload size={15} />
                  <span>Upload Image</span>
                </button>

                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="Or paste direct image URL..."
                    className="w-full bg-[#1e1f22] border border-[#3f4147]/60 rounded-md px-3 py-1.5 text-xs text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2]"
                  />
                </div>
              </div>

              {/* Avatar Presets */}
              <div>
                <span className="text-[11px] text-[#949ba4] block mb-2">Or choose a quick preset:</span>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setAvatar(preset.url)}
                      className={`p-1 rounded-full border-2 transition ${
                        avatar === preset.url ? 'border-[#5865f2] scale-110' : 'border-transparent hover:border-[#b5bac1]'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-8 h-8 rounded-full bg-[#1e1f22]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Banner Editor */}
            <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147]/30 space-y-3">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block">
                Profile Banner
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold px-4 py-2 rounded-md transition flex items-center gap-2"
                >
                  <Upload size={15} />
                  <span>Upload Banner</span>
                </button>

                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    placeholder="Or paste direct banner URL..."
                    className="w-full bg-[#1e1f22] border border-[#3f4147]/60 rounded-md px-3 py-1.5 text-xs text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2]"
                  />
                </div>
              </div>

              {/* Banner Presets */}
              <div>
                <span className="text-[11px] text-[#949ba4] block mb-2">Choose an aesthetic banner:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BANNER_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setBanner(preset.url)}
                      className={`h-14 rounded-lg overflow-hidden border-2 relative transition group ${
                        banner === preset.url ? 'border-[#5865f2]' : 'border-transparent hover:border-[#b5bac1]'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white py-0.5 truncate px-1 text-center">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Swatches */}
              <div className="pt-2">
                <span className="text-[11px] text-[#949ba4] block mb-2">Banner Accent Color:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_SWATCHES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition transform ${
                        color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                    title="Custom color picker"
                  />
                </div>
              </div>
            </div>

            {/* Display Name & Bio */}
            <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147]/30 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display nickname"
                  className="w-full bg-[#1e1f22] border border-[#3f4147]/60 rounded-md px-3.5 py-2 text-sm text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-1.5">
                  Custom Status Quote
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What's on your mind? (e.g. Exploring Fragment)"
                  className="w-full bg-[#1e1f22] border border-[#3f4147]/60 rounded-md px-3.5 py-2 text-sm text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-1.5">
                  About Me (Bio)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others a little about yourself..."
                  className="w-full bg-[#1e1f22] border border-[#3f4147]/60 rounded-md px-3.5 py-2 text-sm text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2] resize-none"
                />
              </div>
            </div>

            {/* Status Selector */}
            <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147]/30 space-y-2">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-1">
                Online Presence
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
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition ${
                      status === opt.id
                        ? 'bg-[#1e1f22] border-[#5865f2]'
                        : 'bg-[#1e1f22]/50 border-transparent hover:bg-[#1e1f22]'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                    <span className="text-sm font-medium text-white">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleSave}
                className={`text-white text-sm font-semibold px-8 py-2.5 rounded-md shadow-lg transition flex items-center gap-2 ${
                  savedSuccess ? 'bg-[#23a55a]' : 'bg-[#5865f2] hover:bg-[#4752c4]'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check size={18} />
                    <span>Profile Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
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
                  type="button"
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
                  type="button"
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
