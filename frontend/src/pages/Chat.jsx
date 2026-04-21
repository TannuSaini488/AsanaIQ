import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { fetchMessages, sendMessage as sendMessageApi } from '../services/chatService';

function Chat() {
  const { user, token } = useAuth();
  const userId = extractUserIdFromToken(token) || user?.uid || user?.id || user?.localId || '';
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get('chatId') || '';
  const peerId = searchParams.get('peerId') || '';
  const sessionId = searchParams.get('sessionId') || '';
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [joinError, setJoinError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [peerOnline, setPeerOnline] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!chatId) return;
      setHistoryError('');
      try {
        const result = await fetchMessages(chatId, { limit: 50 });
        const normalized = (result.messages || [])
          .slice()
          .reverse()
          .map((m) => ({
            senderId: m.senderId,
            message: m.content,
            ts: m.timestamp,
          }));
        setMessages(normalized);
      } catch (err) {
        setHistoryError(err.message);
      }
    };
    loadHistory();
  }, [chatId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on('chat_message', handler);
    return () => socket.off('chat_message', handler);
  }, [socket]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    setJoinError('');
    socket.emit('join_session', { sessionId }, (ack) => {
      if (!ack?.ok) {
        setJoinError(ack?.message || 'Failed to join session');
      }
    });
  }, [socket, sessionId]);

  useEffect(() => {
    if (!socket || !peerId) {
      setPeerOnline(null);
      return;
    }

    const handleSnapshot = ({ userIds }) => {
      if (!Array.isArray(userIds)) return;
      setPeerOnline(userIds.includes(peerId));
    };

    const handleOnline = ({ userId }) => {
      if (userId === peerId) setPeerOnline(true);
    };

    const handleOffline = ({ userId }) => {
      if (userId === peerId) setPeerOnline(false);
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

  const sendMessage = async () => {
    if (!text.trim() || !socket || !userId) return;
    if (!sessionId && !peerId) return;
    const content = text.trim();
    const msg = {
      senderId: userId,
      receiverId: peerId || undefined,
      sessionId: sessionId || undefined,
      message: content,
      ts: Date.now(),
    };
    if (chatId) {
      try {
        await sendMessageApi(chatId, { messageType: 'text', content });
      } catch (err) {
        setJoinError(err.message);
        return;
      }
    }
    socket.emit('chat_message', msg);
    setMessages((prev) => [...prev, msg]);
    setText('');
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2>Chat</h2>
      <div>Socket: {connected ? 'connected' : 'disconnected'}</div>
      <div>{sessionId ? `Session: ${sessionId}` : 'Session: not set'}</div>
      <div>{chatId ? `Chat: ${chatId}` : 'Chat: not set'}</div>
      <div>{peerId ? `Peer: ${peerId}` : 'Peer: not set'}</div>
      <div>
        Peer status:{' '}
        {!peerId ? 'not set' : peerOnline === null ? 'checking...' : peerOnline ? 'online' : 'offline'}
      </div>
      {joinError ? <div style={{ color: 'red' }}>{joinError}</div> : null}
      {historyError ? <div style={{ color: 'red' }}>{historyError}</div> : null}
      <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 200, margin: '8px 0' }}>
        {messages.map((m, idx) => (
          <div key={idx}>
            <strong>{m.senderId === userId ? 'You' : m.senderId}:</strong> {m.message || m.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={sendMessage} disabled={!connected || !userId || (!sessionId && !peerId)}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
