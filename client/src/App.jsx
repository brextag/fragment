import React from 'react';
import { DiscordProvider, useDiscord } from './context/DiscordContext';
import { useWebRTCVoice } from './hooks/useWebRTCVoice';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import VoiceRoomView from './components/VoiceRoomView';
import MemberList from './components/MemberList';
import DirectMessagesView from './components/DirectMessagesView';
import CreateServerModal from './components/Modals/CreateServerModal';
import CreateChannelModal from './components/Modals/CreateChannelModal';
import UserSettingsModal from './components/Modals/UserSettingsModal';
import AuthModal from './components/Auth/AuthModal';

function DiscordApp() {
  const { isAuthenticated, isLoadingAuth } = useDiscord();

  // Loading screen while verifying token
  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1e1f22]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-[#5865f2] rounded-2xl flex items-center justify-center text-white shadow-xl animate-pulse">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1.5L3 7L7 21.5L17 21.5L21 7L12 1.5ZM12 4.2L17.5 7.6L12 10.5L6.5 7.6L12 4.2ZM5.2 9.2L10.8 11.9L6.5 19.5L5.2 9.2ZM13.2 11.9L18.8 9.2L17.5 19.5L13.2 11.9ZM12 13.5L15.6 19.5H8.4L12 13.5Z" />
            </svg>
          </div>
          <div className="text-xs font-semibold text-[#949ba4] tracking-wider uppercase">
            Connecting...
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Discord Login / Register screen
  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return <DiscordLayout />;
}

function DiscordLayout() {
  // Initialize WebRTC voice management
  useWebRTCVoice();

  const {
    activeServerId,
    currentChannel,
    isMemberListOpen,
    isMobileNavOpen,
    setIsMobileNavOpen
  } = useDiscord();

  const isDMs = activeServerId === '@me';
  const isVoiceChannel = !isDMs && currentChannel?.type === 'voice';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22] relative">
      {/* 1. Desktop Sidebars (hidden on mobile, visible md and up) */}
      <div className="hidden md:flex h-full flex-shrink-0 z-20">
        <ServerSidebar />
        <ChannelSidebar />
      </div>

      {/* 2. Mobile Navigation Drawer (off-canvas slide-in on mobile) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer content: ServerSidebar + ChannelSidebar */}
          <div className="relative flex h-full max-w-[85vw] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <ServerSidebar />
            <div className="w-60 max-w-[calc(85vw-72px)] flex flex-col h-full bg-[#2b2d31]">
              <ChannelSidebar />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Center Content Area (full width on mobile) */}
      <main className="flex-1 flex overflow-hidden w-full min-w-0 relative">
        {isDMs ? (
          <DirectMessagesView />
        ) : isVoiceChannel ? (
          <VoiceRoomView />
        ) : (
          <ChatArea />
        )}

        {/* 4. Right Member Sidebar (only in server text channels) */}
        {!isDMs && !isVoiceChannel && isMemberListOpen && (
          <MemberList />
        )}
      </main>

      {/* Modals */}
      <CreateServerModal />
      <CreateChannelModal />
      <UserSettingsModal />
    </div>
  );
}

export default function App() {
  return (
    <DiscordProvider>
      <DiscordApp />
    </DiscordProvider>
  );
}
