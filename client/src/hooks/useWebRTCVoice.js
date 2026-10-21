import { useEffect, useRef, useState } from 'react';
import { useDiscord, BACKEND_URL } from '../context/DiscordContext';

export function useWebRTCVoice() {
  const {
    socket,
    activeVoiceChannelId,
    voiceRooms,
    currentUser,
    isMuted,
    isDeafened,
    setIsSpeaking
  } = useDiscord();

  const [micReady, setMicReady] = useState(false);
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // peerUserId -> RTCPeerConnection
  const pendingCandidatesRef = useRef({}); // peerUserId -> RTCIceCandidateInit[]
  const audioElementsRef = useRef({}); // peerUserId -> HTMLAudioElement
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const bcRef = useRef(null);

  // Manage local microphone & Voice Activity Detection (VAD)
  useEffect(() => {
    if (!activeVoiceChannelId || !currentUser) {
      setMicReady(false);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      Object.values(peersRef.current).forEach(pc => {
        try { pc.close(); } catch (e) {}
      });
      peersRef.current = {};
      pendingCandidatesRef.current = {};
      Object.values(audioElementsRef.current).forEach(audio => {
        try {
          audio.pause();
          audio.srcObject = null;
          audio.remove();
        } catch (e) {}
      });
      audioElementsRef.current = {};
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
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

        // Apply initial mute state
        stream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });

        // Attach tracks to any already-created peer connections
        Object.values(peersRef.current).forEach(pc => {
          const senders = pc.getSenders();
          stream.getAudioTracks().forEach(track => {
            if (!senders.some(s => s.track && s.track.kind === 'audio')) {
              try {
                pc.addTrack(track, stream);
              } catch (e) {}
            }
          });
        });

        setMicReady(true);

        // Set up AudioContext analyser for speaking detection
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let speakingState = false;
          let lastSpeakTime = 0;

          const checkSpeaking = () => {
            if (!analyserRef.current || isCancelled) return;
            if (audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
            }
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const now = Date.now();
            const rawSpeaking = !localStreamRef.current?.getAudioTracks().every(t => !t.enabled) && avg > 10;

            if (rawSpeaking) {
              lastSpeakTime = now;
            }
            // Hold speaking state for 350ms to prevent rapid flickering
            const isNowSpeaking = rawSpeaking || (speakingState && now - lastSpeakTime < 350);

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
        console.warn('Microphone access not granted or unavailable (voice receive-only):', err);
        setMicReady(true); // Allow receive-only WebRTC connections
      }
    }

    initMic();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeVoiceChannelId, currentUser?.id]);

  // Sync mute state to local audio track
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
    if (isMuted) {
      setIsSpeaking(false);
    }
  }, [isMuted]);

  // Sync deafen state to remote audio elements
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  // WebRTC Peer Connection & Multi-Transport Signaling (HTTP + BroadcastChannel + Socket)
  useEffect(() => {
    if (!activeVoiceChannelId || !currentUser) return;

    // Set up BroadcastChannel for instant local/same-browser tab signaling
    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('fragment_webrtc_signal');
        bcRef.current = bc;
      }
    } catch (e) {}

    const sendSignal = async (toUserId, signal) => {
      if (!toUserId || toUserId === currentUser.id) return;
      const payload = {
        toUserId,
        fromUserId: currentUser.id,
        channelId: activeVoiceChannelId,
        signal
      };

      // 1. BroadcastChannel (0ms same-device tabs)
      try {
        bc?.postMessage(payload);
      } catch (e) {}

      // 2. Socket.io (if connected)
      if (socket?.connected) {
        socket.emit('voice:signal', {
          targetUserId: toUserId,
          fromUserId: currentUser.id,
          channelId: activeVoiceChannelId,
          signal
        });
      }

      // 3. Serverless HTTP relay
      try {
        const res = await fetch(`${BACKEND_URL}/api/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signal',
            ...payload
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.voiceSignals && Array.isArray(data.voiceSignals)) {
            data.voiceSignals.forEach(s => handleIncomingSignal(s));
          }
        }
      } catch (e) {}
    };

    const createPeerConnection = (peerUserId) => {
      const existing = peersRef.current[peerUserId];
      if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
        return existing;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerUserId, { candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        let audio = audioElementsRef.current[peerUserId];
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.playsInline = true;
          document.body.appendChild(audio);
          audioElementsRef.current[peerUserId] = audio;
        }
        audio.srcObject = stream;
        audio.muted = isDeafened;
        audio.play().catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          delete peersRef.current[peerUserId];
        }
      };

      peersRef.current[peerUserId] = pc;
      return pc;
    };

    const initiateOffer = async (peerUserId) => {
      try {
        const pc = createPeerConnection(peerUserId);
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        sendSignal(peerUserId, { sdp: pc.localDescription });
      } catch (err) {
        console.warn('Error creating WebRTC offer:', err);
      }
    };

    const handleIncomingSignal = async (packet) => {
      if (!packet) return;
      const { toUserId, fromUserId, channelId, signal } = packet;
      if (toUserId && toUserId !== currentUser.id) return;
      if (!fromUserId || fromUserId === currentUser.id) return;
      if (channelId && channelId !== activeVoiceChannelId) return;
      if (!signal) return;

      if (signal.type === 'join_ping') {
        if (currentUser.id < fromUserId) {
          // Recreate fresh connection and send offer
          if (peersRef.current[fromUserId]) {
            try { peersRef.current[fromUserId].close(); } catch (e) {}
            delete peersRef.current[fromUserId];
          }
          await initiateOffer(fromUserId);
        }
        return;
      }

      const pc = createPeerConnection(fromUserId);

      try {
        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          if (desc.type === 'offer') {
            await pc.setRemoteDescription(desc);
            // Flush any queued ICE candidates
            const queued = pendingCandidatesRef.current[fromUserId] || [];
            pendingCandidatesRef.current[fromUserId] = [];
            for (const cand of queued) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(fromUserId, { sdp: pc.localDescription });
          } else if (desc.type === 'answer' && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(desc);
            const queued = pendingCandidatesRef.current[fromUserId] || [];
            pendingCandidatesRef.current[fromUserId] = [];
            for (const cand of queued) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
          }
        } else if (signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            if (!pendingCandidatesRef.current[fromUserId]) {
              pendingCandidatesRef.current[fromUserId] = [];
            }
            pendingCandidatesRef.current[fromUserId].push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn('Error handling WebRTC signal:', err);
      }
    };

    const onWindowSignal = (e) => handleIncomingSignal(e.detail);
    const onBcMessage = (e) => handleIncomingSignal(e.data);

    window.addEventListener('fragment:voice-signal', onWindowSignal);
    if (bc) bc.onmessage = onBcMessage;
    socket?.on('voice:signal', handleIncomingSignal);

    return () => {
      window.removeEventListener('fragment:voice-signal', onWindowSignal);
      if (bc) {
        bc.onmessage = null;
        bc.close();
      }
      socket?.off('voice:signal', handleIncomingSignal);
    };
  }, [activeVoiceChannelId, currentUser?.id, socket, isDeafened]);

  // Connect to peers present in voiceRooms[activeVoiceChannelId]
  useEffect(() => {
    if (!activeVoiceChannelId || !currentUser || !micReady) return;
    const roomParticipants = voiceRooms[activeVoiceChannelId] || [];
    const activePeerIds = new Set();

    roomParticipants.forEach(p => {
      if (!p.userId || p.userId === currentUser.id) return;
      activePeerIds.add(p.userId);

      const existingPc = peersRef.current[p.userId];
      if (!existingPc || existingPc.connectionState === 'failed' || existingPc.connectionState === 'closed') {
        if (currentUser.id < p.userId) {
          // We are the deterministic initiator -> create offer via custom event trigger
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          });
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current);
            });
          }
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              fetch(`${BACKEND_URL}/api/voice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'signal',
                  toUserId: p.userId,
                  fromUserId: currentUser.id,
                  channelId: activeVoiceChannelId,
                  signal: { candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate }
                })
              }).catch(() => {});
              try {
                bcRef.current?.postMessage({
                  toUserId: p.userId,
                  fromUserId: currentUser.id,
                  channelId: activeVoiceChannelId,
                  signal: { candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate }
                });
              } catch (e) {}
            }
          };
          pc.ontrack = (event) => {
            const stream = event.streams?.[0] || new MediaStream([event.track]);
            let audio = audioElementsRef.current[p.userId];
            if (!audio) {
              audio = document.createElement('audio');
              audio.autoplay = true;
              audio.playsInline = true;
              document.body.appendChild(audio);
              audioElementsRef.current[p.userId] = audio;
            }
            audio.srcObject = stream;
            audio.muted = isDeafened;
            audio.play().catch(() => {});
          };
          peersRef.current[p.userId] = pc;

          pc.createOffer({ offerToReceiveAudio: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              const sigPayload = {
                toUserId: p.userId,
                fromUserId: currentUser.id,
                channelId: activeVoiceChannelId,
                signal: { sdp: pc.localDescription }
              };
              try { bcRef.current?.postMessage(sigPayload); } catch (e) {}
              return fetch(`${BACKEND_URL}/api/voice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signal', ...sigPayload })
              });
            })
            .catch(err => console.warn('Offer error:', err));
        } else {
          // Ping the initiator to send us an offer
          const pingPayload = {
            toUserId: p.userId,
            fromUserId: currentUser.id,
            channelId: activeVoiceChannelId,
            signal: { type: 'join_ping' }
          };
          try { bcRef.current?.postMessage(pingPayload); } catch (e) {}
          fetch(`${BACKEND_URL}/api/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'signal', ...pingPayload })
          }).catch(() => {});
        }
      }
    });

    // Clean up peers that left the room
    for (const [peerId, pc] of Object.entries(peersRef.current)) {
      if (!activePeerIds.has(peerId)) {
        try { pc.close(); } catch (e) {}
        delete peersRef.current[peerId];
        if (audioElementsRef.current[peerId]) {
          try {
            audioElementsRef.current[peerId].pause();
            audioElementsRef.current[peerId].remove();
          } catch (e) {}
          delete audioElementsRef.current[peerId];
        }
      }
    }
  }, [voiceRooms, activeVoiceChannelId, currentUser?.id, micReady, isDeafened]);

  return {
    hasMic: !!localStreamRef.current,
    localStream: localStreamRef.current
  };
}

