const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');
const AppError = require('../utils/appError');

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

async function getChatById(chatId) {
  const doc = await firestore.collection(CHATS_COLLECTION).doc(chatId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function listMessages(chatId, { cursor, limit = 20 } = {}) {
  const chatRef = firestore.collection(CHATS_COLLECTION).doc(chatId);
  let ref = chatRef
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (cursor) {
    const cursorSnap = await chatRef.collection(MESSAGES_SUBCOLLECTION).doc(cursor).get();
    if (!cursorSnap.exists) {
      throw new AppError('Invalid cursor', { status: 400, code: 'INVALID_CURSOR' });
    }
    ref = ref.startAfter(cursorSnap);
  }

  const snap = await ref.get();
  const messages = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
  return { messages, nextCursor };
}

async function createMessage(chatId, { senderId, messageType, content }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const chatRef = firestore.collection(CHATS_COLLECTION).doc(chatId);
  const messageRef = chatRef.collection(MESSAGES_SUBCOLLECTION).doc();

  await firestore.runTransaction(async (tx) => {
    const chatSnap = await tx.get(chatRef);
    if (!chatSnap.exists) {
      throw new AppError('Chat not found', { status: 404, code: 'CHAT_NOT_FOUND' });
    }

    tx.set(messageRef, {
      senderId,
      messageType,
      content,
      timestamp: now,
      readBy: [senderId],
    });
    tx.update(chatRef, { lastMessageAt: now });
  });

  const saved = await messageRef.get();
  return { id: saved.id, ...saved.data() };
}

async function getTranscriptBySessionId(sessionId, { limit = 500 } = {}) {
  const chatsSnap = await firestore
    .collection(CHATS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .limit(1)
    .get();
  if (chatsSnap.empty) return [];

  const chatRef = chatsSnap.docs[0].ref;
  const messagesSnap = await chatRef
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy('timestamp', 'asc')
    .limit(limit)
    .get();

  return messagesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      senderId: data.senderId,
      content: data.content,
      messageType: data.messageType,
    };
  });
}

module.exports = {
  getChatById,
  listMessages,
  createMessage,
  getTranscriptBySessionId,
};
