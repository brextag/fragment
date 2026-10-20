import React, { useState } from 'react';
import { useDiscord } from '../../context/DiscordContext';
import { X, Upload } from 'lucide-react';

const ICONS = ['🚀', '💻', '🎮', '🎧', '⚡', '☕', '🔥', '🛡️', '🌟'];

export default function CreateServerModal() {
  const { isCreateServerOpen, setIsCreateServerOpen, createServer } = useDiscord();
  const [serverName, setServerName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🚀');

  if (!isCreateServerOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    createServer(serverName.trim(), selectedIcon);
    setIsCreateServerOpen(false);
    setServerName('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-[#313338] rounded-xl overflow-hidden shadow-2xl border border-[#2b2d31]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center relative">
          <button
            onClick={() => setIsCreateServerOpen(false)}
            className="absolute top-4 right-4 text-[#949ba4] hover:text-white p-1 transition"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">Create Your Server</h2>
          <p className="text-sm text-[#949ba4]">
            Your server is where you and your friends hang out. Make yours and start talking.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-4">
            {/* Icon Picker */}
            <div className="text-center">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Server Icon
              </label>
              <div className="flex justify-center gap-2 flex-wrap">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition ${
                      selectedIcon === icon
                        ? 'bg-[#5865f2] scale-110 shadow-lg'
                        : 'bg-[#2b2d31] hover:bg-[#35373c]'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Server Name Input */}
            <div>
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Server Name
              </label>
              <input
                type="text"
                required
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. The Matrix Crew"
                className="w-full bg-[#1e1f22] border border-[#232428] rounded-md px-3.5 py-2.5 text-sm text-white placeholder-[#949ba4] outline-none focus:border-[#5865f2]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#2b2d31] px-6 py-4 mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsCreateServerOpen(false)}
              className="text-sm font-semibold text-white hover:underline"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!serverName.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded shadow transition"
            >
              Create Server
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
