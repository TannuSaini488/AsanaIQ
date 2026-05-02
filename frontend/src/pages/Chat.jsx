import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { fetchMessages, sendMessage as sendMessageApi } from '../services/chatService';
import { getMyConnections } from '../services/connectionService';
import { useCall } from '../contexts/CallContext';
import { bookSession, fetchCallableSession, fetchMySessions } from '../services/sessionService';
import { createMySlot, deleteMySlot, fetchMySlots } from '../services/slotService';
import { formatSlotLabel } from '../utils/formatSlot';
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

function safeJsonParse(value) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function Chat() {
  const { user, token } = useAuth();
  const userId = extractUserIdFromToken(token) || user?.uid || user?.id || user?.localId || '';
  const role = user?.role;
  const [searchParams] = useSearchParams();
  const requestedPeerId = searchParams.get('peerId') || '';
  const requestedSessionId = searchParams.get('sessionId') || '';

  const { socket, connected } = useSocket();

  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [activeConnection, setActiveConnection] = useState(null);
  const [callSessionId, setCallSessionId] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [callError, setCallError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const { startCall } = useCall();

  // Slot Modal State
  const [showAvailability, setShowAvailability] = useState(false);
  const [trainerSlots, setTrainerSlots] = useState([]);
  const [trainerSlotsLoading, setTrainerSlotsLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ date: '', startTime: '', endTime: '' });
  const [slotFormState, setSlotFormState] = useState({ loading: false, message: '', error: '' });
  const [bookingOfferState, setBookingOfferState] = useState({ loading: false, error: '' });

  const inputRef = useRef(null);

  const isTrainer = role === 'trainer';
  const peerId = activeConnection?.peerId || '';
  const trainerIdForBooking = isTrainer ? userId : peerId;

  const loadConnections = useCallback(async () => {
    setLoadingConnections(true);
    try {
      const data = await getMyConnections();
      
      // Filter out pending connections that the current user requested
      const filteredData = data.filter(c => {
        if (c.status === 'accepted') return true;
        if (c.status === 'pending') {
          const reqId = c.requesterId || c.studentId; // fallback
          if (reqId === userId) return false;
        }
        return true;
      });

      setConnections(filteredData);
      // Auto-select if peerId is in URL
      if (requestedPeerId) {
        const found = filteredData.find(c => c.peerId === requestedPeerId);
        if (found) setActiveConnection(found);
      }
    } catch (err) {
      console.error('Failed to load connections', err);
    } finally {
      setLoadingConnections(false);
    }
  }, [requestedPeerId, userId]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (!activeConnection?.id) { setMessages([]); return; }
    setBookingOfferState({ loading: false, error: '' });
    setShowAvailability(false);
    fetchMessages(activeConnection.id, { limit: 50 })
      .then((res) => {
        const safeGetTime = (val) => {
          if (!val) return Date.now();
          if (typeof val === 'number') return val;
          if (val._seconds) return val._seconds * 1000;
          if (val.toDate) return val.toDate().getTime();
          const d = new Date(val);
          return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
        };

        const normalized = (res.messages || []).slice().reverse().map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          messageType: m.messageType || 'text',
          ts: safeGetTime(m.timestamp),
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
    if (!activeConnection?.peerId) {
      setCallSessionId('');
      return;
    }

    if (requestedSessionId && requestedPeerId && activeConnection.peerId === requestedPeerId) {
      setCallSessionId(requestedSessionId);
      return;
    }

    fetchCallableSession(activeConnection.peerId)
      .then(async (session) => {
        if (session?.sessionId) {
          setCallSessionId(session.sessionId);
          return;
        }
        const sessions = await fetchMySessions({ limit: 200 });
        const match = (sessions || []).find(
          (s) =>
            (s?.trainerId === activeConnection.peerId || s?.studentId === activeConnection.peerId) &&
            (s?.status === 'confirmed' || s?.status === 'in_progress'),
        );
        setCallSessionId(match?.id || '');
      })
      .catch(() => setCallSessionId(''));
  }, [activeConnection?.peerId, requestedPeerId, requestedSessionId]);

  const loadMySlots = useCallback(async () => {
    if (!isTrainer || !activeConnection?.id) return;
    setTrainerSlotsLoading(true);
    setSlotFormState({ loading: false, message: '', error: '' });
    try {
      const data = await fetchMySlots();
      setTrainerSlots(data);
    } catch (err) {
      setSlotFormState({ loading: false, message: '', error: err.message });
    } finally {
      setTrainerSlotsLoading(false);
    }
  }, [activeConnection?.id, isTrainer]);

  useEffect(() => {
    if (!showAvailability) return;
    loadMySlots();
  }, [loadMySlots, showAvailability]);

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

  const handleSlotInputChange = (e) => {
    const { name, value } = e.target;
    setSlotForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) return;
    setSlotFormState({ loading: true, message: '', error: '' });
    try {
      const created = await createMySlot(slotForm);
      setTrainerSlots((prev) => [created, ...prev]);
      setSlotForm({ date: '', startTime: '', endTime: '' });
      setSlotFormState({ loading: false, message: 'Slot created.', error: '' });
    } catch (err) {
      setSlotFormState({ loading: false, message: '', error: err.message });
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!slotId) return;
    setSlotFormState({ loading: true, message: '', error: '' });
    try {
      await deleteMySlot(slotId);
      setTrainerSlots((prev) => prev.filter((slot) => (slot.id || slot.slotId) !== slotId));
      setSlotFormState({ loading: false, message: 'Slot deleted.', error: '' });
    } catch (err) {
      setSlotFormState({ loading: false, message: '', error: err.message });
    }
  };

  const sendSlotOffer = async (slot) => {
    const slotId = slot?.id || slot?.slotId;
    if (!slotId) return;
    const payload = {
      slotId,
      label: formatSlotLabel(slot),
    };
    await sendMessage(JSON.stringify(payload), 'slot_offer');
  };

  const confirmSlotOffer = async (slotId, label) => {
    if (!slotId || isTrainer || !peerId) return;
    setBookingOfferState({ loading: true, error: '' });
    try {
      const res = await bookSession({ trainerId: trainerIdForBooking, slotId });
      const sessionId = res?.sessionId || res?.session?.id || res?.id || '';
      if (sessionId) setCallSessionId(sessionId);
      await sendMessage(JSON.stringify({ slotId, sessionId, label }), 'slot_confirmed');
    } catch (err) {
      setBookingOfferState({ loading: false, error: err.message || 'Unable to confirm slot.' });
      return;
    }
    setBookingOfferState({ loading: false, error: '' });
  };

  const onStartVideoCall = async () => {
    if (!activeConnection?.id || !activeConnection?.peerId) return;
    setCallError('');
    try {
      let sessionId = callSessionId;
      if (!sessionId) {
        const callable = await fetchCallableSession(activeConnection.peerId);
        sessionId = callable?.sessionId || '';
        if (!sessionId) {
          const sessions = await fetchMySessions({ limit: 200 });
          const match = (sessions || []).find(
            (s) =>
              (s?.trainerId === activeConnection.peerId || s?.studentId === activeConnection.peerId) &&
              (s?.status === 'confirmed' || s?.status === 'in_progress'),
          );
          sessionId = match?.id || '';
        }
        setCallSessionId(sessionId);
      }

      // We only allow video call after a slot is confirmed in this chat.
      const confirmedSessionId = confirmedSessionIdFromChat || '';
      if (!confirmedSessionId) {
        setCallError('Confirm a slot in chat to enable video call.');
        return;
      }

      // Always prefer the session confirmed in this chat (avoids older sessions between same peers).
      if (!sessionId || sessionId !== confirmedSessionId) {
        sessionId = confirmedSessionId;
        setCallSessionId(confirmedSessionId);
      }

      if (!sessionId) {
        setCallError('No booked session found for calling. Please book a slot first.');
        return;
      }

      startCall(activeConnection.id, activeConnection.peerId, activeConnection.peerName, sessionId);
    } catch (err) {
      setCallError(err.message || 'Unable to start video call.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const peerOnline = activeConnection ? onlineUsers.has(activeConnection.peerId) : false;
  const canChat = activeConnection && activeConnection.status === 'accepted';
  
  const confirmedSessionIdFromChat = useMemo(() => {
    const lastConfirmed = [...messages].reverse().find((m) => m?.messageType === 'slot_confirmed');
    const data = safeJsonParse(lastConfirmed?.content) || {};
    return typeof data.sessionId === 'string' ? data.sessionId : '';
  }, [messages]);

  // Only enable video if we have a verified callSessionId from the backend.
  const videoActive = Boolean(callSessionId);

  useEffect(() => {
    if (!confirmedSessionIdFromChat) return;
    // When a slot is confirmed in chat, verify with backend that it's active
    // before enabling the video call button (avoids enabling for old completed sessions).
    fetchCallableSession(activeConnection?.peerId)
      .then(async (session) => {
        if (session?.sessionId) {
          setCallSessionId(session.sessionId);
        }
      })
      .catch(() => {});
  }, [confirmedSessionIdFromChat, activeConnection?.peerId]);

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
            <div className="chat-empty-icon">🧘</div>
            <h3>AsanaIQ Inbox</h3>
            <p>Select a conversation to start messaging</p>
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
                {isTrainer && (
                  <button
                    className="chat-top-btn"
                    onClick={() => setShowAvailability((v) => !v)}
                    title="Manage Availability"
                  >
                    📅
                  </button>
                )}
                 {videoActive ? (
                   <button className="chat-top-btn video active" onClick={onStartVideoCall} title="Join Video Call">
                     🎥
                   </button>
                 ) : (
                   <button className="chat-top-btn video disabled" title="Book/confirm a slot to enable video call" disabled>
                     🎥
                   </button>
                 )}
              </div>
            </div>
            {callError ? <div className="send-error">{callError}</div> : null}
            {bookingOfferState.error ? <div className="send-error">{bookingOfferState.error}</div> : null}

            {/* Messages area */}
            <div className="chat-content-row">
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
                
                if (m.messageType === 'slot_offer') {
                  const data = safeJsonParse(m.content) || {};
                  const slotId = data.slotId || '';
                  const label = data.label || slotId;
                  const alreadyConfirmed = messages.some((x) => {
                    if (x.messageType !== 'slot_confirmed') return false;
                    const payload = safeJsonParse(x.content) || {};
                    return payload.slotId === slotId;
                  });
                  return (
                    <div key={m.id || idx} className={`msg-row ${isMe ? 'me' : 'them'}`}>
                      <div className={`msg-bubble slot-bubble ${isMe ? 'me' : 'them'}`}>
                        <div className="slot-icon">📅</div>
                        <div className="slot-info">
                          <strong>{isMe ? 'You offered a slot' : 'Slot offer'}</strong>
                          <span>{label}</span>
                        </div>
                        {!isMe && !alreadyConfirmed && !isTrainer && (
                          <button className="btn-accept-slot" onClick={() => confirmSlotOffer(slotId, label)} disabled={bookingOfferState.loading}>
                            {bookingOfferState.loading ? 'Confirmingâ€¦' : 'Confirm'}
                          </button>
                        )}
                        {alreadyConfirmed && <span className="slot-accepted-badge">✅ Confirmed</span>}
                      </div>
                    </div>
                  );
                }

                if (m.messageType === 'slot_confirmed') {
                  const data = safeJsonParse(m.content) || {};
                  const label = data.label || data.slotId || 'slot';
                  return (
                    <div key={m.id || idx} className="msg-row system">
                      <div className="msg-bubble system">
                        Booking confirmed for {label}
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

            {isTrainer && showAvailability && canChat && (
              <aside className="chat-drawer" aria-label="Availability">
                <div className="chat-drawer__header">
                  <strong>Availability</strong>
                  <button className="chat-top-btn" onClick={() => setShowAvailability(false)} title="Close">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSlot} className="chat-drawer__form">
                  <label>
                    Date
                    <input type="date" name="date" value={slotForm.date} onChange={handleSlotInputChange} required />
                  </label>
                  <label>
                    Start
                    <input type="time" name="startTime" value={slotForm.startTime} onChange={handleSlotInputChange} required />
                  </label>
                  <label>
                    End
                    <input type="time" name="endTime" value={slotForm.endTime} onChange={handleSlotInputChange} required />
                  </label>
                  <button type="submit" className="btn-confirm" disabled={slotFormState.loading}>
                    {slotFormState.loading ? 'Saving…' : 'Create Slot'}
                  </button>
                </form>

                {slotFormState.message ? <div className="drawer-success">{slotFormState.message}</div> : null}
                {slotFormState.error ? <div className="send-error">{slotFormState.error}</div> : null}

                <div className="chat-drawer__list">
                  {trainerSlotsLoading ? (
                    <div className="drawer-muted">Loading slots…</div>
                  ) : trainerSlots.length === 0 ? (
                    <div className="drawer-muted">No slots yet. Create one above.</div>
                  ) : (
                    trainerSlots.map((slot) => {
                      const slotId = slot.id || slot.slotId;
                      const label = formatSlotLabel(slot);
                      return (
                        <div key={slotId} className="drawer-slot">
                          <div className="drawer-slot__info">
                            <div className="drawer-slot__title">{label}</div>
                            <div className="drawer-slot__meta">{slot.isBooked ? 'Booked' : 'Available'}</div>
                          </div>
                          <div className="drawer-slot__actions">
                            <button
                              type="button"
                              className="btn-confirm"
                              onClick={() => sendSlotOffer(slot)}
                              disabled={slot.isBooked}
                              title={slot.isBooked ? 'Slot already booked' : 'Send this slot to the student'}
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              className="btn-cancel"
                              onClick={() => handleDeleteSlot(slotId)}
                              disabled={slot.isBooked || slotFormState.loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>
            )}

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
      </section>
    </div>
  );
}

export default Chat;
