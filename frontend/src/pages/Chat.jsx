import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { fetchMessages, sendMessage as sendMessageApi } from '../services/chatService';
import { getMyConnections } from '../services/connectionService';
import { useCall } from '../contexts/CallContext';
import './Chat.css';

function statusLabel(status) {
  const map = {
    pending: '⏳ Pending',
    accepted: '✅ Connected',
    rejected: '✖ Rejected',
  };
  return map[status] || status;
}

function formatDay(ms) {
  if (!ms) return '';
  const date = new Date(ms);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTime(ms) {
  if (!ms) return '';
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSlotActive(slots) {
  const now = Date.now();
  // Active if now is within 15 mins before to 45 mins after the slot
  return slots.some(slotTime => {
    return now >= slotTime - 15 * 60 * 1000 && now <= slotTime + 45 * 60 * 1000;
  });
}

function Chat() {
  const { user, token } = useAuth();
  const userId = extractUserIdFromToken(token) || user?.uid || user?.id || user?.localId || '';
  const role = user?.role;
  const [searchParams] = useSearchParams();
  const requestedPeerId = searchParams.get('peerId') || '';

  const { socket, connected } = useSocket();

  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [activeConnection, setActiveConnection] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const { startCall } = useCall();

  // Slot Modal State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');

  const inputRef = useRef(null);

  const loadConnections = useCallback(async () => {
    setLoadingConnections(true);
    try {
      const data = await getMyConnections();
      setConnections(data);
      // Auto-select if peerId is in URL
      if (requestedPeerId) {
        const found = data.find(c => c.peerId === requestedPeerId);
        if (found) setActiveConnection(found);
      }
    } catch (err) {
      console.error('Failed to load connections', err);
    } finally {
      setLoadingConnections(false);
    }
  }, [requestedPeerId]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (!activeConnection?.id) { setMessages([]); return; }
    fetchMessages(activeConnection.id, { limit: 50 })
      .then((res) => {
        const normalized = (res.messages || []).slice().reverse().map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          messageType: m.messageType || 'text',
          ts: m.timestamp?.toDate ? m.timestamp.toDate().getTime() : m.timestamp,
          readBy: m.readBy || [],
        }));
        setMessages(normalized);
        
        // Mark as read upon loading
        if (socket) {
          socket.emit('mark_messages_read', { connectionId: activeConnection.id, receiverId: activeConnection.peerId });
        }
      })
      .catch(() => setMessages([]));
  }, [activeConnection?.id, socket]);

  useEffect(() => {
    if (!socket) return;
    
    const messageHandler = (msg) => {
      if (msg.connectionId && msg.connectionId !== activeConnection?.id) return;
      if (msg.senderId === userId) return; // Prevent double messages
      
      setMessages((prev) => [...prev, { 
        senderId: msg.senderId, 
        content: msg.message, 
        messageType: msg.messageType || 'text',
        ts: msg.ts, 
        readBy: msg.readBy || [] 
      }]);
      
      // If we are actively viewing this chat, mark the new message as read immediately
      if (activeConnection?.id === msg.connectionId) {
        socket.emit('mark_messages_read', { connectionId: activeConnection.id, receiverId: activeConnection.peerId });
      }
    };
    
    const readHandler = ({ connectionId, readerId }) => {
      if (connectionId !== activeConnection?.id) return;
      setMessages((prev) => prev.map(m => {
        const readBy = m.readBy || [];
        if (!readBy.includes(readerId)) {
          return { ...m, readBy: [...readBy, readerId] };
        }
        return m;
      }));
    };
    
    socket.on('chat_message', messageHandler);
    socket.on('messages_read', readHandler);
    
    return () => {
      socket.off('chat_message', messageHandler);
      socket.off('messages_read', readHandler);
    };
  }, [socket, activeConnection?.id, userId]);

  useEffect(() => {
    if (!socket || !activeConnection?.id) return;
    socket.emit('join_connection', { connectionId: activeConnection.id }, () => {});
  }, [socket, activeConnection?.id]);

  // Presence tracking
  useEffect(() => {
    if (!socket) return;
    const handleSnapshot = ({ userIds }) => {
      if (Array.isArray(userIds)) setOnlineUsers(new Set(userIds));
    };
    const handleOnline = ({ userId: uid }) => {
      setOnlineUsers((prev) => { const n = new Set(prev); n.add(uid); return n; });
    };
    const handleOffline = ({ userId: uid }) => {
      setOnlineUsers((prev) => { const n = new Set(prev); n.delete(uid); return n; });
    };
    socket.on('presence_snapshot', handleSnapshot);
    socket.on('user_online', handleOnline);
    socket.on('user_offline', handleOffline);
    return () => {
      socket.off('presence_snapshot', handleSnapshot);
      socket.off('user_online', handleOnline);
      socket.off('user_offline', handleOffline);
    };
  }, [socket]);

  const sendMessage = async (customText = null, customType = 'text') => {
    const content = customText || text.trim();
    if (!content || !activeConnection || !userId) return;
    
    setSendError('');
    if (!customText) setText('');
    setMessages((prev) => [...prev, { senderId: userId, content, messageType: customType, ts: Date.now(), optimistic: true }]);
    
    if (activeConnection.id) {
      try {
        await sendMessageApi(activeConnection.id, { messageType: customType, content });
      } catch (err) {
        setSendError('Failed to send. Please try again.');
        return;
      }
    }
    if (socket) {
      socket.emit('chat_message', {
        senderId: userId,
        receiverId: activeConnection.peerId,
        connectionId: activeConnection.id,
        message: content,
        messageType: customType,
      });
    }
    inputRef.current?.focus();
  };

  const proposeSlot = () => {
    if (!slotDate || !slotTime) return;
    const datetime = new Date(`${slotDate}T${slotTime}`).getTime();
    sendMessage(datetime.toString(), 'slot_proposal');
    setShowSlotModal(false);
  };

  const acceptSlot = (tsString) => {
    sendMessage(tsString, 'slot_accepted');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const peerOnline = activeConnection ? onlineUsers.has(activeConnection.peerId) : false;
  const canChat = activeConnection && activeConnection.status === 'accepted';

  // Calculate accepted slots to see if video call is available
  const acceptedSlots = messages
    .filter(m => m.messageType === 'slot_accepted')
    .map(m => parseInt(m.content, 10));
  
  const videoActive = isSlotActive(acceptedSlots);

  return (
    <div className="chat-shell">
      {/* LEFT: Conversation list */}
      <aside className={`chat-sidebar ${activeConnection ? '' : 'open'}`}>
        <div className="chat-sidebar__header">
          <h2>Chats</h2>
          <span className={`socket-dot ${connected ? 'online' : 'offline'}`} title={connected ? 'Connected' : 'Disconnected'} />
        </div>
        <div className="chat-sidebar__search">
          <input type="text" placeholder="Search or start new chat" />
        </div>

        {loadingConnections ? (
          <div className="chat-sidebar__loading">Loading chats…</div>
        ) : connections.length === 0 ? (
          <div className="chat-sidebar__empty">
            <p>No chats yet.</p>
            <p>Connect with a trainer to start chatting.</p>
          </div>
        ) : (
          <ul className="chat-conv-list">
            {connections.map((c) => {
              const isPeerOnline = onlineUsers.has(c.peerId);
              const isActive = activeConnection?.id === c.id;
              return (
                <li
                  key={c.id}
                  className={`chat-conv-item ${isActive ? 'active' : ''}`}
                  onClick={() => { setActiveConnection(c); setSendError(''); }}
                >
                  <div className="conv-avatar">
                    {(c.peerName || 'U')[0].toUpperCase()}
                    <span className={`presence-dot ${isPeerOnline ? 'online' : 'offline'}`} />
                  </div>
                  <div className="conv-info">
                    <span className="conv-name">{c.peerName || c.peerId?.slice(0, 8) || 'User'}</span>
                    <span className="conv-status">{statusLabel(c.status)}</span>
                  </div>
                  <div className="conv-meta">
                    <span className="conv-time">
                      {c.createdAtMs ? formatDay(c.createdAtMs) : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* RIGHT: Message thread */}
      <section className="chat-main">
        {!activeConnection ? (
          <div className="chat-main__empty">
            <div className="chat-empty-icon">💬</div>
            <h3>WhatsApp Web clone</h3>
            <p>Select a chat to start messaging</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button className="chat-back-btn" onClick={() => setActiveConnection(null)}>←</button>
              <div className="chat-header__avatar">
                {(activeConnection.peerName || 'U')[0].toUpperCase()}
                <span className={`presence-dot ${peerOnline ? 'online' : 'offline'}`} />
              </div>
              <div className="chat-header__info">
                <strong>{activeConnection.peerName || activeConnection.peerId?.slice(0, 8) || 'User'}</strong>
                <span className={`peer-status-text ${peerOnline ? 'online' : 'offline'}`}>
                  {peerOnline ? '🟢 Online' : '⚫ Offline'}
                </span>
              </div>
              <div className="chat-header__actions">
                <button className="chat-top-btn" onClick={() => setShowSlotModal(true)} title="Propose a Time Slot">
                  📅
                </button>
                {videoActive ? (
                  <button 
                    className="chat-top-btn video active" 
                    onClick={() => startCall(activeConnection.id, activeConnection.peerId, activeConnection.peerName)}
                    title="Join Video Call"
                  >
                    🎥
                  </button>
                ) : (
                  <button className="chat-top-btn video disabled" title="Video call is only available during accepted slots">
                    🎥
                  </button>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="chat-messages">
              {!canChat && (
                <div className="chat-locked">
                  {activeConnection.status === 'pending' ? (
                    <div className="chat-locked__card">
                      <span>⏳</span>
                      <p>Waiting for connection to be accepted.</p>
                    </div>
                  ) : (
                    <div className="chat-locked__card">
                      <span>✖</span>
                      <p>Connection was rejected. Chat is unavailable.</p>
                    </div>
                  )}
                </div>
              )}

              {canChat && messages.length === 0 && (
                <div className="chat-no-messages">
                  Send a message to start the conversation!
                </div>
              )}

              {canChat && messages.map((m, idx) => {
                const isMe = m.senderId === userId;
                const isRead = m.readBy?.includes(activeConnection.peerId);
                
                if (m.messageType === 'slot_proposal') {
                  const proposedTime = new Date(parseInt(m.content, 10));
                  const isAccepted = acceptedSlots.includes(parseInt(m.content, 10));
                  return (
                    <div key={m.id || idx} className={`msg-row ${isMe ? 'me' : 'them'}`}>
                      <div className={`msg-bubble slot-bubble ${isMe ? 'me' : 'them'}`}>
                        <div className="slot-icon">📅</div>
                        <div className="slot-info">
                          <strong>{isMe ? 'You proposed a slot' : 'Proposed Slot'}</strong>
                          <span>{proposedTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        {!isMe && !isAccepted && (
                          <button className="btn-accept-slot" onClick={() => acceptSlot(m.content)}>Accept</button>
                        )}
                        {isAccepted && <span className="slot-accepted-badge">✅ Accepted</span>}
                      </div>
                    </div>
                  );
                }

                if (m.messageType === 'slot_accepted') {
                  const acceptedTime = new Date(parseInt(m.content, 10));
                  return (
                    <div key={m.id || idx} className="msg-row system">
                      <div className="msg-bubble system">
                        📅 Slot confirmed for {acceptedTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id || idx} className={`msg-row ${isMe ? 'me' : 'them'}`}>
                    <div className={`msg-bubble ${isMe ? 'me' : 'them'} ${m.optimistic ? 'optimistic' : ''}`}>
                      <span className="msg-text">{m.content}</span>
                      <span className="msg-time">
                        {formatTime(m.ts)}
                        {isMe && (
                          <span style={{ marginLeft: 4, color: isRead ? '#53bdeb' : '#9ca3af' }}>
                            {isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input bar */}
            {canChat && (
              <div className="chat-input-bar">
                {!peerOnline && (
                  <div className="offline-notice">⚫ {activeConnection.peerName || 'User'} is offline — your message will be saved and delivered when they come online.</div>
                )}
                {sendError && <div className="send-error">{sendError}</div>}
                <div className="chat-input-row">
                  <button className="chat-action-btn">😀</button>
                  <button className="chat-action-btn">📎</button>
                  <div className="chat-input-wrapper">
                    <textarea
                      ref={inputRef}
                      className="chat-input"
                      rows={1}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message"
                    />
                  </div>
                  <button
                    className={`chat-send-btn ${text.trim() ? 'active' : ''}`}
                    onClick={sendMessage}
                    disabled={!text.trim()}
                  >
                    ➤
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Slot Proposal Modal */}
        {showSlotModal && (
          <div className="slot-modal-overlay" onClick={() => setShowSlotModal(false)}>
            <div className="slot-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Propose a Time Slot</h3>
              <div className="slot-modal-body">
                <label>
                  Date:
                  <input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </label>
                <label>
                  Time:
                  <input type="time" value={slotTime} onChange={e => setSlotTime(e.target.value)} />
                </label>
              </div>
              <div className="slot-modal-footer">
                <button className="btn-cancel" onClick={() => setShowSlotModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={proposeSlot} disabled={!slotDate || !slotTime}>Propose</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Chat;
