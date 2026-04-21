import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';

const SIGNAL = {
  CALL: 'call_user',
  ANSWER: 'answer_call',
  ICE: 'ice_candidate',
};

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function VideoCall() {
  const { user, token } = useAuth();
  const userId = extractUserIdFromToken(token) || user?.uid || user?.id || user?.localId || '';
  const [searchParams] = useSearchParams();
  const defaultPeerId = searchParams.get('peerId') || '';
  const defaultSessionId = searchParams.get('sessionId') || '';
  const { socket, connected } = useSocket();
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerIdRef = useRef(defaultPeerId);
  const sessionIdRef = useRef(defaultSessionId);

  const [peerId, setPeerId] = useState(defaultPeerId);
  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [status, setStatus] = useState('idle'); // idle | calling | in-call
  const [joinState, setJoinState] = useState({ joined: false, error: '' });
  const [peerOnline, setPeerOnline] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    peerIdRef.current = peerId;
  }, [peerId]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize peer connection
  useEffect(() => {
    pcRef.current = new RTCPeerConnection(STUN);
    pcRef.current.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit(SIGNAL.ICE, {
          senderId: userId,
          receiverId: peerIdRef.current,
          sessionId: sessionIdRef.current,
          signal: e.candidate,
        });
      }
    };
    pcRef.current.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStreamRef.current.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
    return () => {
      pcRef.current?.close();
    };
  }, [socket, userId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleCall = async ({ senderId, receiverId, sessionId: incomingSessionId, signal }) => {
      if (!senderId || senderId === userId) return;
      if (receiverId && receiverId !== userId) return;

      const effectiveSessionId = incomingSessionId || sessionIdRef.current;
      if (!effectiveSessionId) {
        setJoinState({ joined: false, error: 'Session ID missing for incoming call.' });
        return;
      }

      if (!peerIdRef.current) {
        peerIdRef.current = senderId;
        setPeerId(senderId);
      }
      if (!sessionIdRef.current) {
        sessionIdRef.current = effectiveSessionId;
        setSessionId(effectiveSessionId);
      }

      await ensureLocalMedia();
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit(SIGNAL.ANSWER, {
        senderId: userId,
        receiverId: senderId,
        sessionId: effectiveSessionId,
        signal: answer,
      });
      setStatus('in-call');
    };

    const handleAnswer = async ({ senderId, receiverId, signal }) => {
      if (receiverId && receiverId !== userId) return;
      if (senderId && senderId === userId) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      setStatus('in-call');
    };

    const handleIce = async ({ senderId, receiverId, signal }) => {
      if (receiverId && receiverId !== userId) return;
      if (senderId && senderId === userId) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(signal));
      } catch (err) {
        console.error('ICE error', err);
      }
    };

    socket.on(SIGNAL.CALL, handleCall);
    socket.on(SIGNAL.ANSWER, handleAnswer);
    socket.on(SIGNAL.ICE, handleIce);

    const handleSessionError = ({ message }) => {
      setJoinState({ joined: false, error: message || 'Session join failed' });
    };
    socket.on('session_error', handleSessionError);

    return () => {
      socket.off(SIGNAL.CALL, handleCall);
      socket.off(SIGNAL.ANSWER, handleAnswer);
      socket.off(SIGNAL.ICE, handleIce);
      socket.off('session_error', handleSessionError);
    };
  }, [socket, userId]);

  useEffect(() => {
    if (!socket || !peerId) {
      setPeerOnline(null);
      return;
    }

    const handleSnapshot = ({ userIds }) => {
      if (!Array.isArray(userIds)) return;
      setPeerOnline(userIds.includes(peerId));
    };
    const handleOnline = ({ userId: onlineUserId }) => {
      if (onlineUserId === peerId) setPeerOnline(true);
    };
    const handleOffline = ({ userId: offlineUserId }) => {
      if (offlineUserId === peerId) setPeerOnline(false);
    };

    socket.on('presence_snapshot', handleSnapshot);
    socket.on('user_online', handleOnline);
    socket.on('user_offline', handleOffline);
    socket.emit('presence_check', { userId: peerId }, (ack) => {
      if (ack?.ok) setPeerOnline(Boolean(ack.online));
    });

    return () => {
      socket.off('presence_snapshot', handleSnapshot);
      socket.off('user_online', handleOnline);
      socket.off('user_offline', handleOffline);
    };
  }, [socket, peerId]);

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraOn;
    });
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });
    stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
  };

  const joinSession = () => {
    if (!socket || !sessionId) return;
    setJoinState({ joined: false, error: '' });
    socket.emit('join_session', { sessionId }, (ack) => {
      if (ack?.ok) {
        setJoinState({ joined: true, error: '' });
      } else {
        setJoinState({ joined: false, error: ack?.message || 'Join failed' });
      }
    });
  };

  const startCall = async () => {
    if (!socket || !peerId || !sessionId || !joinState.joined || !userId) return;
    setStatus('calling');
    await ensureLocalMedia();
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socket.emit(SIGNAL.CALL, { senderId: userId, receiverId: peerId, sessionId, signal: offer });
  };

  const endCall = () => {
    pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = new RTCPeerConnection(STUN);
    setStatus('idle');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
      <h2>Video Call</h2>
      <div>Socket: {connected ? 'connected' : 'disconnected'}</div>
      <div>
        Peer status:{' '}
        {!peerId ? 'not set' : peerOnline === null ? 'checking...' : peerOnline ? 'online' : 'offline'}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <label>
          Peer ID
          <input value={peerId} onChange={(e) => setPeerId(e.target.value)} />
        </label>
        <label>
          Session ID
          <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={joinSession} disabled={!connected || !sessionId}>
          Join Session
        </button>
        <button onClick={toggleCamera}>{cameraOn ? 'Camera Off' : 'Camera On'}</button>
        <button onClick={toggleMic}>{micOn ? 'Mic Off' : 'Mic On'}</button>
        {joinState.joined ? <span style={{ color: 'green' }}>Joined</span> : null}
        {joinState.error ? <span style={{ color: 'red' }}>{joinState.error}</span> : null}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div>
          <div>Local</div>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 280, background: '#000' }} />
        </div>
        <div>
          <div>Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 280, background: '#000' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={startCall}
          disabled={!connected || status === 'calling' || !joinState.joined || !userId || peerOnline === false}
        >
          Start Call
        </button>
        <button onClick={endCall}>End Call</button>
      </div>
      <div>Status: {status}</div>
    </div>
  );
}

export default VideoCall;
