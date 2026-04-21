const { Server } = require('socket.io');
const connectionRegistry = require('../services/connectionRegistry');
const sessionService = require('../services/sessionService');
const admin = require('../config/firebaseAdmin');
const userRepository = require('../repositories/userRepository');

async function authenticateSocketUser(idToken, { adminClient = admin, userRepo = userRepository } = {}) {
  if (!idToken) {
    const err = new Error('Missing idToken');
    err.code = 'TOKEN_REQUIRED';
    throw err;
  }

  const claims = await adminClient.auth().verifyIdToken(idToken);
  const userId = claims?.uid;
  const dbUser = userId ? await userRepo.getUserById(userId) : null;
  if (!dbUser) {
    const err = new Error('User not found');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  if (dbUser.status && dbUser.status !== 'active') {
    const err = new Error('Account suspended');
    err.code = 'ACCOUNT_SUSPENDED';
    throw err;
  }

  return {
    ...claims,
    role: claims.role || claims.customClaims?.role || dbUser.role,
    status: dbUser.status,
  };
}

function initSocket(httpServer) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const idToken = socket.handshake.auth?.idToken || socket.handshake.query?.idToken;

    Promise.resolve(authenticateSocketUser(idToken))
      .then((claims) => {
        const userId = claims.uid;

        const becameOnline = connectionRegistry.add(userId, socket.id);
        console.log(`[socket] connected userId=${userId} socketId=${socket.id}`);
        socket.emit('presence_snapshot', { userIds: connectionRegistry.getOnlineUserIds() });
        if (becameOnline) {
          io.emit('user_online', { userId });
        }

        const emitToUser = (receiverId, event, payload) => {
          const targetSocketIds = connectionRegistry.getSocketIds(receiverId);
          targetSocketIds.forEach((targetSocketId) => {
            io.to(targetSocketId).emit(event, payload);
          });
        };

        const emitChat = ({ senderId, receiverId, sessionId, message }) => {
          const payload = { senderId, receiverId, sessionId, message, ts: Date.now() };
          if (sessionId) {
            io.to(sessionId).emit('chat_message', payload);
          } else if (receiverId) {
            emitToUser(receiverId, 'chat_message', payload);
          }
        };

        socket.on('join_session', async ({ sessionId }, ack) => {
          try {
            await sessionService.validateSessionAccess({ sessionId, userId });
            socket.join(sessionId);
            if (ack) ack({ ok: true });
          } catch (err) {
            if (ack) ack({ ok: false, code: err.code, message: err.message });
          }
        });

        socket.on('call_user', async ({ senderId, receiverId, sessionId, signal }) => {
          if (senderId !== userId) return;
          try {
            await sessionService.validateSessionAccess({ sessionId, userId: senderId });
            emitToUser(receiverId, 'call_user', { senderId, receiverId, sessionId, signal });
          } catch (err) {
            socket.emit('session_error', { code: err.code, message: err.message });
          }
        });

        socket.on('answer_call', async ({ senderId, receiverId, sessionId, signal }) => {
          if (senderId !== userId) return;
          try {
            await sessionService.validateSessionAccess({ sessionId, userId: senderId });
            emitToUser(receiverId, 'answer_call', { senderId, receiverId, sessionId, signal });
          } catch (err) {
            socket.emit('session_error', { code: err.code, message: err.message });
          }
        });

        socket.on('ice_candidate', async ({ senderId, receiverId, sessionId, signal }) => {
          if (senderId !== userId) return;
          try {
            await sessionService.validateSessionAccess({ sessionId, userId: senderId });
            emitToUser(receiverId, 'ice_candidate', { senderId, receiverId, sessionId, signal });
          } catch (err) {
            socket.emit('session_error', { code: err.code, message: err.message });
          }
        });

        socket.on('chat_message', ({ senderId, receiverId, sessionId, message }) => {
          if (senderId !== userId) return;
          emitChat({ senderId, receiverId, sessionId, message });
        });

        socket.on('presence_check', ({ userId: targetUserId }, ack) => {
          if (!ack || !targetUserId) return;
          ack({ ok: true, userId: targetUserId, online: connectionRegistry.isOnline(targetUserId) });
        });

        socket.on('disconnect', () => {
          const removedUserId = connectionRegistry.removeBySocketId(socket.id);
          console.log(`[socket] disconnected userId=${removedUserId || 'unknown'} socketId=${socket.id}`);
          if (removedUserId) {
            io.emit('user_offline', { userId: removedUserId });
          }
        });
      })
      .catch(() => {
        socket.disconnect(true);
      });
  });

  return io;
}

module.exports = initSocket;
module.exports.authenticateSocketUser = authenticateSocketUser;
