import React, { useEffect, useRef } from 'react';
import { useCall } from '../contexts/CallContext';
import './GlobalCallUI.css';

function GlobalCallUI() {
  const { 
    callState, activeCall, localStream, remoteStream, 
    answerCall, endCall, rejectCall,
    isMicOn, isCameraOn, toggleMic, toggleCamera
  } = useCall();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  if (callState === 'idle') return null;

  if (callState === 'ringing') {
    return (
      <div className="global-call-overlay ringing">
        <div className="ringing-card">
          <div className="ringing-avatar">{(activeCall?.peerName || 'U')[0].toUpperCase()}</div>
          <h3>Incoming Video Call</h3>
          <p>{activeCall?.peerName || 'User'} is calling you...</p>
          <div className="ringing-actions">
            <button className="btn-decline" onClick={rejectCall}>Decline</button>
            <button className="btn-accept" onClick={answerCall}>Accept</button>
          </div>
        </div>
      </div>
    );
  }

  // calling or in-call
  return (
    <div className="global-call-overlay active">
      <div className="call-container">
        <div className="call-header">
          <h2>{activeCall?.peerName || 'User'}</h2>
          <span className="call-status">{callState === 'calling' ? 'Calling...' : 'Connected'}</span>
        </div>
        
        <div className="call-videos">
          <video 
            ref={remoteVideoRef} 
            className="remote-video" 
            autoPlay 
            playsInline 
            muted={false} 
          />
          <video 
            ref={localVideoRef} 
            className="local-video" 
            autoPlay 
            playsInline 
            muted={true} 
          />
        </div>

        <div className="call-controls">
          <button 
            className={`btn-control ${!isMicOn ? 'off' : ''}`} 
            onClick={toggleMic}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? '🎤' : '🔇'}
          </button>
          
          <button 
            className={`btn-control ${!isCameraOn ? 'off' : ''}`} 
            onClick={toggleCamera}
            title={isCameraOn ? "Turn off Camera" : "Turn on Camera"}
          >
            {isCameraOn ? '📷' : '🚫'}
          </button>

          <button className="btn-end-call" onClick={endCall}>End Call</button>
        </div>
      </div>
    </div>
  );
}

export default GlobalCallUI;
