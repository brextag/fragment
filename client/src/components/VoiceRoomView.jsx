import React, { useState, useEffect, useRef } from 'react';
import { useDiscord } from '../context/DiscordContext';
import {
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  ScreenShare,
  Tv,
  Users,
  Volume2,
  Sparkles,
  Maximize2,
  Menu
} from 'lucide-react';

export default function VoiceRoomView() {
  const {
    currentChannel,
    voiceRooms,
    activeVoiceChannelId,
    joinVoice,
    leaveVoice,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    isSpeaking,
    setIsMobileNavOpen,
    currentUser,
    users
  } = useDiscord();

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const canvasRef = useRef(null);
  const screenVideoRef = useRef(null);
  const loopbackAudioRef = useRef(null);

  const isConnected = activeVoiceChannelId === currentChannel?.id;
  const rawParticipants = voiceRooms[currentChannel?.id] || [];

  // Ensure currentUser is always shown in participants when connected
  const participants = React.useMemo(() => {
    const list = [...rawParticipants];
    if (isConnected && currentUser) {
      const idx = list.findIndex(p => p.userId === currentUser.id);
      const localParticipant = {
        userId: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName || currentUser.username,
        avatar: currentUser.avatar,
        banner: currentUser.banner,
        isMuted,
        isDeafened,
        isSpeaking
      };
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...localParticipant };
      } else {
        list.push(localParticipant);
      }
    }
    return list;
  }, [rawParticipants, isConnected, currentUser, isMuted, isDeafened, isSpeaking]);

  // Handle screen share (real getDisplayMedia with fallback to canvas)
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
        setScreenStream(stream);
        setIsScreenSharing(true);
        return;
      } catch (err) {
        // User cancelled or mobile browser doesn't support getDisplayMedia -> fallback to canvas
      }
    }
    setIsScreenSharing(true);
  };

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  // Mic loopback test
  useEffect(() => {
    if (!isTestingMic || !isConnected) {
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.pause();
        loopbackAudioRef.current.srcObject = null;
      }
      return;
    }
    let active = true;
    let streamRef = null;
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(stream => {
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef = stream;
        if (loopbackAudioRef.current) {
          loopbackAudioRef.current.srcObject = stream;
          loopbackAudioRef.current.play().catch(() => {});
        }
      })
      .catch(() => setIsTestingMic(false));

    return () => {
      active = false;
      if (streamRef) streamRef.getTracks().forEach(t => t.stop());
    };
  }, [isTestingMic, isConnected]);

  // Screen share simulation fallback on canvas when screenStream is null
  useEffect(() => {
    if (!isScreenSharing || screenStream || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    canvas.width = 640;
    canvas.height = 360;

    const chars = '0123456789ABCDEF@#$%&*';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#23a55a';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isScreenSharing, screenStream]);

  return (
    <div className="flex-1 flex flex-col bg-[#1e1f22] h-full select-none overflow-hidden relative">
      {/* Top Header */}
      <div className="h-12 border-b border-[#2b2d31] px-3 sm:px-4 flex items-center justify-between bg-[#2b2d31]/40">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="md:hidden p-1.5 -ml-1 text-[#949ba4] hover:text-white rounded hover:bg-[#35373c] transition flex-shrink-0"
            title="Open Channels & Servers"
          >
            <Menu size={20} />
          </button>
          <Volume2 size={24} className="text-[#23a55a] flex-shrink-0" />
          <span className="font-bold text-white text-base truncate">
            {currentChannel?.name || 'Voice Channel'}
          </span>
          <span className="text-xs text-[#949ba4] hidden sm:inline ml-2">
            Bitrate: 64kbps • Region: Automatic
          </span>
        </div>

        {!isConnected && (
          <button
            onClick={() => joinVoice(currentChannel.id)}
            className="bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-semibold px-4 py-1.5 rounded transition flex items-center gap-1.5"
          >
            <Volume2 size={16} />
            <span>Join Voice</span>
          </button>
        )}
      </div>

      {/* Main Grid of Participants */}
      <div className="flex-1 p-6 flex flex-col justify-center items-center overflow-y-auto">
        {participants.length === 0 ? (
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-20 h-20 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#949ba4] mx-auto">
              <Volume2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-white">No one is here yet</h2>
            <p className="text-sm text-[#949ba4]">
              Click the button below to join the voice channel and start talking.
            </p>
            <button
              onClick={() => joinVoice(currentChannel.id)}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold px-6 py-2 rounded-md shadow-lg transition"
            >
              Connect to Voice
            </button>
          </div>
        ) : (
          <div className="w-full max-w-5xl flex-1 flex flex-col justify-center gap-4">
            {/* Screen share area if active */}
            {isScreenSharing && (
              <div className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden border-2 border-[#5865f2] bg-black shadow-2xl">
                {screenStream ? (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[50vh] object-contain bg-black"
                  />
                ) : (
                  <canvas ref={canvasRef} className="w-full h-auto object-cover" />
                )}
                <div className="absolute top-3 left-3 bg-[#111214]/80 px-2.5 py-1 rounded-md text-xs text-white font-semibold flex items-center gap-2">
                  <ScreenShare size={14} className="text-[#23a55a]" />
                  <span>{currentUser.displayName || currentUser.username}'s Screen</span>
                  <span className="bg-[#f23f43] text-white text-[10px] px-1 rounded uppercase font-bold">LIVE</span>
                </div>
              </div>
            )}

            <audio ref={loopbackAudioRef} className="hidden" />

            {/* Participants Grid */}
            <div className={`grid gap-4 w-full ${
              participants.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : participants.length === 2
                ? 'grid-cols-2 max-w-2xl mx-auto'
                : 'grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto'
            }`}>
              {participants.map((participant) => {
                const u = users.find(user => user.id === participant.userId) || participant;
                const isLocalUser = participant.userId === currentUser.id;
                const speaking = isLocalUser ? isSpeaking : participant.isSpeaking;
                const muted = isLocalUser ? isMuted : participant.isMuted;
                const deafened = isLocalUser ? isDeafened : participant.isDeafened;

                return (
                  <div
                    key={participant.userId}
                    className={`relative bg-[#2b2d31] rounded-xl flex flex-col items-center justify-center p-8 transition-all duration-200 border-2 ${
                      speaking ? 'border-[#23a55a] shadow-[0_0_15px_rgba(35,165,90,0.4)]' : 'border-transparent'
                    }`}
                  >
                    {/* Big Avatar */}
                    <div className="relative mb-4">
                      <img
                        src={u.avatar}
                        alt={u.username}
                        className={`w-24 h-24 rounded-full object-cover transition-all ${
                          speaking ? 'speaking-ring' : ''
                        }`}
                      />
                      {/* Audio visualizer wave */}
                      {speaking && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#23a55a] px-2 py-0.5 rounded-full shadow">
                          <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.2s]" />
                          <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.1s]" />
                          <span className="w-1 h-2 bg-white rounded-full animate-bounce" />
                        </div>
                      )}
                    </div>

                    {/* Name & status */}
                    <div className="text-center">
                      <div className="font-bold text-white text-base">
                        {u.displayName || u.username}
                        {isLocalUser && <span className="text-xs text-[#949ba4] ml-1">(you)</span>}
                      </div>
                      <div className="text-xs text-[#949ba4] mt-0.5">
                        {muted
                          ? 'Muted'
                          : deafened
                          ? 'Deafened'
                          : speaking
                          ? 'Speaking...'
                          : 'Voice Connected'}
                      </div>
                    </div>

                    {/* Status icons overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {muted && (
                        <div className="bg-[#f23f43] p-1.5 rounded-full text-white shadow">
                          <MicOff size={14} />
                        </div>
                      )}
                      {deafened && (
                        <div className="bg-[#f23f43] p-1.5 rounded-full text-white shadow">
                          <Headphones size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      {isConnected && (
        <div className="h-20 bg-[#111214]/90 backdrop-blur border-t border-[#2b2d31] flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 z-20">
          <button
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-full transition flex items-center justify-center ${
              isScreenSharing
                ? 'bg-[#5865f2] text-white hover:bg-[#4752c4]'
                : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Your Screen'}
          >
            <ScreenShare size={22} />
          </button>

          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition flex items-center justify-center ${
              isMuted
                ? 'bg-[#f23f43] text-white hover:bg-[#da373b]'
                : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={toggleDeafen}
            className={`p-3 rounded-full transition flex items-center justify-center ${
              isDeafened
                ? 'bg-[#f23f43] text-white hover:bg-[#da373b]'
                : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones size={22} />
          </button>

          <button
            onClick={() => setIsTestingMic(!isTestingMic)}
            className={`px-3 py-2.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
              isTestingMic
                ? 'bg-[#23a55a] text-white hover:bg-[#1f934f]'
                : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
            }`}
            title="Test your microphone by hearing your own voice"
          >
            <Volume2 size={18} />
            <span className="hidden sm:inline">{isTestingMic ? 'Stop Mic Test' : 'Test Mic'}</span>
          </button>

          <button
            onClick={leaveVoice}
            className="p-3 rounded-full bg-[#f23f43] hover:bg-[#da373b] text-white transition flex items-center justify-center shadow-lg"
            title="Disconnect"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
