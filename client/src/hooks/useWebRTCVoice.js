import { useEffect, useRef } from 'react';
import { useDiscord } from '../context/DiscordContext';

export function useWebRTCVoice() {
  const {
    socket,
    activeVoiceChannelId,
    currentUser,
    isMuted,
    isDeafened,
    setIsSpeaking
  } = useDiscord();

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const audioElementsRef = useRef({}); // socketId -> HTMLAudioElement
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Manage local microphone & Voice Activity Detection (VAD)
  useEffect(() => {
    if (!activeVoiceChannelId) {
      // Disconnected: stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      // Close all peer connections
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      Object.values(audioElementsRef.current).forEach(audio => audio.remove());
      audioElementsRef.current = {};
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsSpeaking(false);
      return;
    }

    let isCancelled = false;

    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Apply mute status
        stream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });

        // Set up AudioContext analyser for speaking detection
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let speakingState = false;

          const checkSpeaking = () => {
            if (!analyserRef.current || isCancelled) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const isNowSpeaking = !isMuted && avg > 18;

            if (isNowSpeaking !== speakingState) {
              speakingState = isNowSpeaking;
              setIsSpeaking(speakingState);
              socket?.emit('voice:update', {
                userId: currentUser.id,
                changes: { isSpeaking: speakingState }
              });
            }
            animFrameRef.current = requestAnimationFrame(checkSpeaking);
          };

          checkSpeaking();
        }
      } catch (err) {
        console.warn('Microphone access not granted or not available (voice receive-only):', err);
      }
    }

    initMic();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeVoiceChannelId]);

  // Sync mute state to local audio track
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Sync deafen state to remote audio elements
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  // Handle WebRTC peer signals
  useEffect(() => {
    if (!socket || !activeVoiceChannelId) return;

    const createPeerConnection = (targetSocketId, targetUserId) => {
      if (peersRef.current[targetSocketId]) {
        return peersRef.current[targetSocketId];
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice:signal', {
            targetSocketId,
            fromUserId: currentUser.id,
            signal: { candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        if (!audioElementsRef.current[targetSocketId]) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          audio.srcObject = event.streams[0];
          audio.muted = isDeafened;
          document.body.appendChild(audio);
          audioElementsRef.current[targetSocketId] = audio;
        } else {
          audioElementsRef.current[targetSocketId].srcObject = event.streams[0];
        }
      };

      peersRef.current[targetSocketId] = pc;
      return pc;
    };

    // When another peer joins while we are already in voice
    const handlePeerJoined = async ({ peer }) => {
      if (peer.socketId === socket.id || peer.userId === currentUser.id) return;
      const pc = createPeerConnection(peer.socketId, peer.userId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:signal', {
          targetSocketId: peer.socketId,
          fromUserId: currentUser.id,
          signal: { sdp: pc.localDescription }
        });
      } catch (err) {
        console.error('Error creating offer for peer:', err);
      }
    };

    // When receiving WebRTC signal
    const handleVoiceSignal = async ({ signal, fromSocketId, fromUserId }) => {
      const pc = createPeerConnection(fromSocketId, fromUserId);

      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', {
            targetSocketId: fromSocketId,
            fromUserId: currentUser.id,
            signal: { sdp: pc.localDescription }
          });
        }
      } else if (signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      }
    };

    const handlePeerLeft = ({ userId }) => {
      // Find peer socket
      for (const [sId, pc] of Object.entries(peersRef.current)) {
        pc.close();
        delete peersRef.current[sId];
        if (audioElementsRef.current[sId]) {
          audioElementsRef.current[sId].remove();
          delete audioElementsRef.current[sId];
        }
      }
    };

    socket?.on('voice:peer_joined', handlePeerJoined);
    socket?.on('voice:signal', handleVoiceSignal);
    socket?.on('voice:peer_left', handlePeerLeft);

    return () => {
      socket?.off('voice:peer_joined', handlePeerJoined);
      socket?.off('voice:signal', handleVoiceSignal);
      socket?.off('voice:peer_left', handlePeerLeft);
    };
  }, [socket, activeVoiceChannelId, currentUser?.id, isDeafened]);

  return {
    hasMic: !!localStreamRef.current
  };
}
