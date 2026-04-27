import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useGlobalSocket } from './SocketContext';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { updateSessionState } from '../services/sessionService';

const CallContext = createContext();

const SIGNAL = {
  CALL: 'call_user',
  ANSWER: 'answer_call',
  ICE: 'ice_candidate',
};
const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function CallProvider({ children }) {
  const { user, token } = useAuth();
  const userId = extractUserIdFromToken(token) || user?.uid || user?.id || user?.localId || '';
  const { socket } = useGlobalSocket();

  const [callState, setCallState] = useState('idle'); // 'idle' | 'ringing' | 'calling' | 'in-call'
  const [incomingCallData, setIncomingCallData] = useState(null); // { senderId, connectionId, sessionId, signal }
  const [activeCall, setActiveCall] = useState(null); // { peerId, connectionId, sessionId, peerName }

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);

  // Keep ref up to date for socket listeners
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMicOn(stream.getAudioTracks()[0]?.enabled ?? true);
      setIsCameraOn(stream.getVideoTracks()[0]?.enabled ?? true);
      return stream;
    } catch (err) {
      console.error('Failed to get media', err);
      return null;
    }
  };

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallState('idle');
    setIncomingCallData(null);
    setActiveCall(null);
  }, []);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && activeCallRef.current) {
        socket.emit(SIGNAL.ICE, {
          senderId: userId,
          receiverId: activeCallRef.current.peerId,
          connectionId: activeCallRef.current.connectionId,
          sessionId: activeCallRef.current.sessionId,
          signal: e.candidate,
        });
      }
    };

    const rmStream = new MediaStream();
    setRemoteStream(rmStream);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => rmStream.addTrack(t));
      // Force state update to re-render video
      setRemoteStream(new MediaStream(rmStream.getTracks()));
    };

    return pc;
  }, [socket, userId]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleCall = async ({ senderId, connectionId, sessionId, signal }) => {
      // Ignore if we are already in a call
      if (callState !== 'idle') return;
      setIncomingCallData({ senderId, connectionId, sessionId, signal });
      setActiveCall({ peerId: senderId, connectionId, sessionId, peerName: 'Trainer/Student' }); // Ideal: fetch name
      setCallState('ringing');
    };

    const handleAnswer = async ({ signal }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        setCallState('in-call');
        const sessionId = activeCallRef.current?.sessionId;
        if (sessionId) {
          try {
            await updateSessionState(sessionId, 'start');
          } catch (_) {}
        }
      } catch (err) {
        console.error('Answer err', err);
      }
    };

    const handleIce = async ({ signal }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(signal));
      } catch (err) {
        console.error('ICE err', err);
      }
    };

    socket.on(SIGNAL.CALL, handleCall);
    socket.on(SIGNAL.ANSWER, handleAnswer);
    socket.on(SIGNAL.ICE, handleIce);

    return () => {
      socket.off(SIGNAL.CALL, handleCall);
      socket.off(SIGNAL.ANSWER, handleAnswer);
      socket.off(SIGNAL.ICE, handleIce);
    };
  }, [socket, userId, callState]);

  const startCall = async (connectionId, peerId, peerName, sessionId) => {
    if (!socket || !userId) return;
    setActiveCall({ peerId, connectionId, sessionId, peerName });
    setCallState('calling');
    
    const stream = await ensureLocalMedia();
    if (!stream) {
      cleanupCall();
      return;
    }

    const pc = createPeerConnection();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit(SIGNAL.CALL, { senderId: userId, receiverId: peerId, connectionId, sessionId, signal: offer });
  };

  const answerCall = async () => {
    if (!incomingCallData || !activeCall) return;
    setCallState('in-call');

    const stream = await ensureLocalMedia();
    if (!stream) {
      cleanupCall();
      return;
    }

    const pc = createPeerConnection();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.signal));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit(SIGNAL.ANSWER, {
      senderId: userId,
      receiverId: incomingCallData.senderId,
      connectionId: incomingCallData.connectionId,
      sessionId: incomingCallData.sessionId,
      signal: answer,
    });

    const sessionId = incomingCallData.sessionId;
    if (sessionId) {
      try {
        await updateSessionState(sessionId, 'start');
      } catch (_) {}
    }
  };

  const endCall = async () => {
    const sessionId = activeCallRef.current?.sessionId;
    const shouldComplete = callState === 'in-call' && sessionId;
    if (shouldComplete) {
      try {
        await updateSessionState(sessionId, 'complete');
      } catch (_) {}
    }
    cleanupCall();
  };

  return (
    <CallContext.Provider value={{
      callState,
      activeCall,
      incomingCallData,
      localStream,
      remoteStream,
      isMicOn,
      isCameraOn,
      startCall,
      answerCall,
      endCall,
      rejectCall: cleanupCall,
      toggleMic,
      toggleCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
