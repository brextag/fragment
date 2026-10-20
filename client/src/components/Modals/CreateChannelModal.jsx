import React, { useState } from 'react';
import { useDiscord } from '../../context/DiscordContext';
import { X, Hash, Volume2 } from 'lucide-react';

export default function CreateChannelModal() {
  const {
    isCreateChannelOpen,
    setIsCreateChannelOpen,
    activeServerId,
    createChannel
  } = useDiscord();

  const [channelType, setChannelType] = useState('text');
  const [channelName, setChannelName] = useState('');
  const [category, setCategory] = useState('TEXT CHANNELS');

  if (!isCreateChannelOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    createChannel(
      activeServerId,
      channelName.trim(),
      channelType,
      channelType === 'voice' ? 'VOICE CHANNELS' : category
    );
    setIsCreateChannelOpen(false);
    setChannelName('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-[#313338] rounded-xl overflow-hidden shadow-2xl border border-[#2b2d31]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 relative">
          <button
            onClick={() => setIsCreateChannelOpen(false)}
            className="absolute top-4 right-4 text-[#949ba4] hover:text-white p-1 transition"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Create Channel</h2>
          <p className="text-xs text-[#949ba4]">in {channelType === 'text' ? 'Text Channels' : 'Voice Channels'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-4">
            {/* Channel Type Selector */}
            <div>
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Channel Type
              </label>

              <div className="space-y-2">
                {/* Text Channel Option */}
                <div
                  onClick={() => {
                    setChannelType('text');
                    setCategory('TEXT CHANNELS');
                  }}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition ${
                    channelType === 'text'
                      ? 'bg-[#2b2d31] border-[#5865f2]'
                      : 'bg-[#2b2d31]/50 border-transparent hover:bg-[#2b2d31]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Hash size={24} className="text-[#949ba4]" />
                    <div>
                      <div className="text-sm font-semibold text-white">Text</div>
                      <div className="text-xs text-[#949ba4]">
                        Post messages, images, memes, opinions, and puns
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="channelType"
                    checked={channelType === 'text'}
                    onChange={() => {}}
                    className="accent-[#5865f2] w-4 h-4"
                  />
                </div>

                {/* Voice Channel Option */}
                <div
                  onClick={() => {
                    setChannelType('voice');
                    setCategory('VOICE CHANNELS');
                  }}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition ${
                    channelType === 'voice'
                      ? 'bg-[#2b2d31] border-[#5865f2]'
                      : 'bg-[#2b2d31]/50 border-transparent hover:bg-[#2b2d31]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Volume2 size={24} className="text-[#949ba4]" />
                    <div>
                      <div className="text-sm font-semibold text-white">Voice</div>
                      <div className="text-xs text-[#949ba4]">
                        Hang out together with voice, video, and screen share
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="channelType"
                    checked={channelType === 'voice'}
                    onChange={() => {}}
                    className="accent-[#5865f2] w-4 h-4"
                  />
                </div>
              </div>
            </div>

            {/* Channel Name */}
            <div>
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Channel Name
              </label>
              <div className="flex items-center bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2">
                {channelType === 'text' ? (
                  <Hash size={18} className="text-[#949ba4] mr-2" />
                ) : (
                  <Volume2 size={18} className="text-[#949ba4] mr-2" />
                )}
                <input
                  type="text"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="new-channel"
                  className="w-full bg-transparent text-sm text-white placeholder-[#949ba4] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#2b2d31] px-6 py-4 mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsCreateChannelOpen(false)}
              className="text-sm font-semibold text-white hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!channelName.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded shadow transition"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
