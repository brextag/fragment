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
              <path d="M19.73 4.87a18.2 18.2 0 00-4.6-1.44c-.21.4-.4.8-.57 1.22-1.74-.26-3.48-.26-5.18 0-.17-.42-.36-.82-.57-1.22a18.17 18.17 0 00-4.6 1.44c-2.9 4.36-3.69 8.6-3.3 12.78a18.33 18.33 0 005.58 2.82c.45-.61.85-1.26 1.2-1.94-1.92-.72-2.67-1.84-2.67-1.84.16.12.33.23.49.34 3.73 1.77 7.76 1.77 11.45 0 .17-.11.33-.22.49-.34 0 0-.76 1.13-2.68 1.85.35.68.75 1.33 1.2 1.94 2.1-.64 4.02-1.6 5.58-2.83.45-4.78-.77-8.99-3.29-12.77zM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.26.88-2.28 2-2.28s2.02 1.02 2 2.28c0 1.25-.89 2.27-2 2.27zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.26.88-2.28 2-2.28s2.02 1.02 2 2.28c0 1.25-.89 2.27-2 2.27z" />
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
