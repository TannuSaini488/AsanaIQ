const chatService = require('../services/chatService');
const {
  chatIdParamsSchema,
  listMessagesQuerySchema,
  createMessageSchema,
} = require('../validators/chatValidator');

async function getMessages(req, res, next) {
  try {
    const { chatId } = chatIdParamsSchema.parse(req.params);
    const { cursor, limit = 20 } = listMessagesQuerySchema.parse(req.query || {});
    const result = await chatService.getMessages({
      chatId,
      userId: req.user.uid,
      cursor,
      limit,
    });
    res.success(result, 'Messages fetched');
  } catch (err) {
    next(err);
  }
}

async function createMessage(req, res, next) {
  try {
    const { chatId } = chatIdParamsSchema.parse(req.params);
    const { messageType, content } = createMessageSchema.parse(req.body);
    const result = await chatService.postMessage({
      chatId,
      userId: req.user.uid,
      messageType,
      content,
    });
    res.success(result, 'Message sent');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMessages,
  createMessage,
};
