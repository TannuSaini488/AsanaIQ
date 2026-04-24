const express = require('express');
const aiController = require('../controllers/aiController');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');

const router = express.Router();

router.post('/match', verifyJwt, roleGuard('student'), aiController.match);
router.post('/plan', verifyJwt, roleGuard('student'), aiController.plan);
router.post('/summary', verifyJwt, roleGuard('student', 'trainer'), aiController.summary);
router.post('/progress', verifyJwt, roleGuard('student'), aiController.progress);

module.exports = router;
