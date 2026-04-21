import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import useAuth from './useAuth';
import { refreshAuthToken } from '../services/authService';

export function useSocket({ url = '/' } = {}) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    socketRef.current = io(url, {
      auth: { idToken: token },
    });
    socketRef.current.on('connect', () => {
      setConnected(true);
    });
    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });
    socketRef.current.on('connect_error', async (err) => {
      const message = String(err?.message || '');
      if (!message.includes('id-token-expired') && !message.includes('auth/id-token-expired')) {
        return;
      }
      try {
        const refreshed = await refreshAuthToken();
        const newToken = refreshed?.idToken || '';
        if (!newToken) return;
        socketRef.current.auth = { idToken: newToken };
        socketRef.current.connect();
      } catch (_) {
        // keep disconnected state; caller can trigger re-auth flow
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [url, token]);

  return { socket: socketRef.current, connected };
}
