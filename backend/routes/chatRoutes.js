const express = require('express');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.get(
  '/:chatId/messages',
  verifyJwt,
  roleGuard('student', 'trainer', 'admin'),
  chatController.getMessages,
);

router.post(
  '/:chatId/messages',
  verifyJwt,
  roleGuard('student', 'trainer', 'admin'),
  chatController.createMessage,
);

module.exports = router;
