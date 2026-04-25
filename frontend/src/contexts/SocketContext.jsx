import React, { createContext, useContext } from 'react';
import { useSocket as useSocketHook } from '../hooks/useSocket';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { socket, connected } = useSocketHook();

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useGlobalSocket() {
  return useContext(SocketContext);
}
