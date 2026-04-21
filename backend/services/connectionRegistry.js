/**
 * In-memory registry for connected users.
 * Maps userId -> Set<socketId>
 */
class ConnectionRegistry {
  constructor() {
    this.userToSockets = new Map();
    this.socketToUser = new Map();
  }

  add(userId, socketId) {
    const sockets = this.userToSockets.get(userId) || new Set();
    const wasOnline = sockets.size > 0;
    sockets.add(socketId);
    this.userToSockets.set(userId, sockets);
    this.socketToUser.set(socketId, userId);
    return !wasOnline;
  }

  removeBySocketId(socketId) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return null;
    this.socketToUser.delete(socketId);

    const sockets = this.userToSockets.get(userId);
    if (!sockets) return null;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userToSockets.delete(userId);
      return userId;
    }

    this.userToSockets.set(userId, sockets);
    return null;
  }

  getSocketId(userId) {
    const sockets = this.userToSockets.get(userId);
    if (!sockets || sockets.size === 0) return null;
    return sockets.values().next().value || null;
  }

  getSocketIds(userId) {
    const sockets = this.userToSockets.get(userId);
    if (!sockets || sockets.size === 0) return [];
    return Array.from(sockets);
  }

  isOnline(userId) {
    const sockets = this.userToSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  getOnlineUserIds() {
    return Array.from(this.userToSockets.keys());
  }
}

module.exports = new ConnectionRegistry();
