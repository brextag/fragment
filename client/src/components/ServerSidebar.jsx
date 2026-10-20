import React, { useState } from 'react';
import { useDiscord } from '../context/DiscordContext';
import { MessageSquare, Plus, Compass } from 'lucide-react';

export default function ServerSidebar() {
  const {
    servers,
    activeServerId,
    setActiveServerId,
    setActiveChannelId,
    setIsCreateServerOpen
  } = useDiscord();

  const [hoveredServerId, setHoveredServerId] = useState(null);

  const handleSelectServer = (server) => {
    setActiveServerId(server.id);
    if (server.channels && server.channels.length > 0) {
      setActiveChannelId(server.channels[0].id);
    }
  };

  const handleSelectDMs = () => {
    setActiveServerId('@me');
  };

  return (
    <nav className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 select-none flex-shrink-0 z-20">
      {/* Direct Messages Icon */}
      <div
        className="relative group mb-2 flex items-center justify-center w-full cursor-pointer"
        onClick={handleSelectDMs}
        onMouseEnter={() => setHoveredServerId('@me')}
        onMouseLeave={() => setHoveredServerId(null)}
      >
        {/* Active / Hover Pill Indicator */}
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            activeServerId === '@me'
              ? 'h-10'
              : hoveredServerId === '@me'
              ? 'h-5'
              : 'h-0'
          }`}
        />

        {/* Fragment DM Icon */}
        <div
          className={`w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 ${
            activeServerId === '@me'
              ? 'bg-[#5865f2] rounded-[16px] text-white shadow-lg'
              : 'bg-[#313338] text-[#dbdee1] group-hover:bg-[#5865f2] group-hover:text-white'
          }`}
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1.5L3 7L7 21.5L17 21.5L21 7L12 1.5ZM12 4.2L17.5 7.6L12 10.5L6.5 7.6L12 4.2ZM5.2 9.2L10.8 11.9L6.5 19.5L5.2 9.2ZM13.2 11.9L18.8 9.2L17.5 19.5L13.2 11.9ZM12 13.5L15.6 19.5H8.4L12 13.5Z" />
          </svg>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute left-[80px] px-3 py-1.5 bg-[#111214] text-[#dbdee1] text-sm font-semibold rounded-md shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
          Fragment — Direct Messages
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 h-[2px] bg-[#35363c] rounded mb-2" />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto no-scrollbar flex flex-col items-center">
        {servers.map((server) => {
          const isActive = activeServerId === server.id;
          const isHovered = hoveredServerId === server.id;

          return (
            <div
              key={server.id}
              className="relative group flex items-center justify-center w-full cursor-pointer"
              onClick={() => handleSelectServer(server)}
              onMouseEnter={() => setHoveredServerId(server.id)}
              onMouseLeave={() => setHoveredServerId(null)}
            >
              {/* Pill Indicator */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isActive
                    ? 'h-10'
                    : isHovered
                    ? 'h-5'
                    : 'h-0'
                }`}
              />

              {/* Server Icon */}
              <div
                className={`w-12 h-12 flex items-center justify-center text-lg font-bold transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'bg-[#5865f2] text-white rounded-[16px]'
                    : 'bg-[#313338] text-[#dbdee1] rounded-[24px] group-hover:rounded-[16px] group-hover:bg-[#5865f2] group-hover:text-white'
                }`}
              >
                {server.icon && server.icon.length <= 4 ? (
                  <span className="text-xl">{server.icon}</span>
                ) : server.icon && server.icon.startsWith('http') ? (
                  <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  <span>
                    {server.name
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 3)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              {/* Hover Tooltip */}
              <div className="absolute left-[80px] px-3 py-1.5 bg-[#111214] text-[#dbdee1] text-sm font-semibold rounded-md shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {server.name}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
              </div>
            </div>
          );
        })}

        {/* Add Server Button */}
        <div
          className="relative group flex items-center justify-center w-full cursor-pointer pt-1"
          onClick={() => setIsCreateServerOpen(true)}
          onMouseEnter={() => setHoveredServerId('add-server')}
          onMouseLeave={() => setHoveredServerId(null)}
        >
          <div
            className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
              hoveredServerId === 'add-server' ? 'h-5' : 'h-0'
            }`}
          />
          <div className="w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] bg-[#313338] text-[#23a55a] group-hover:bg-[#23a55a] group-hover:text-white transition-all duration-200">
            <Plus size={24} />
          </div>

          <div className="absolute left-[80px] px-3 py-1.5 bg-[#111214] text-[#dbdee1] text-sm font-semibold rounded-md shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Add a Server
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
          </div>
        </div>

        {/* Explore Public Servers Button */}
        <div
          className="relative group flex items-center justify-center w-full cursor-pointer"
          onMouseEnter={() => setHoveredServerId('explore')}
          onMouseLeave={() => setHoveredServerId(null)}
        >
          <div
            className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
              hoveredServerId === 'explore' ? 'h-5' : 'h-0'
            }`}
          />
          <div className="w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] bg-[#313338] text-[#23a55a] group-hover:bg-[#23a55a] group-hover:text-white transition-all duration-200">
            <Compass size={24} />
          </div>

          <div className="absolute left-[80px] px-3 py-1.5 bg-[#111214] text-[#dbdee1] text-sm font-semibold rounded-md shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Explore Discoverable Servers
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
          </div>
        </div>
      </div>
    </nav>
  );
}
