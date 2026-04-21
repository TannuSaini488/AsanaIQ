const AppError = require('../utils/appError');
const chatRepository = require('../repositories/chatRepository');

function ensureParticipant(chat, userId) {
  const participants = Array.isArray(chat.participants) ? chat.participants : [];
  if (!participants.includes(userId)) {
    throw new AppError('CHAT_FORBIDDEN', { status: 403, code: 'CHAT_FORBIDDEN' });
  }
}

async function getMessages({ chatId, userId, cursor, limit }) {
  const chat = await chatRepository.getChatById(chatId);
  if (!chat) {
    throw new AppError('Chat not found', { status: 404, code: 'CHAT_NOT_FOUND' });
  }
  ensureParticipant(chat, userId);
  return chatRepository.listMessages(chatId, { cursor, limit });
}

async function postMessage({ chatId, userId, messageType, content }) {
  const chat = await chatRepository.getChatById(chatId);
  if (!chat) {
    throw new AppError('Chat not found', { status: 404, code: 'CHAT_NOT_FOUND' });
  }
  ensureParticipant(chat, userId);
  return chatRepository.createMessage(chatId, { senderId: userId, messageType, content });
}

module.exports = {
  getMessages,
  postMessage,
};
