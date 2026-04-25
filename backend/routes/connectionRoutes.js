const express = require('express');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const connectionController = require('../controllers/connectionController');

const router = express.Router();

router.get('/mine', verifyJwt, roleGuard('student', 'trainer'), connectionController.listMine);
router.post('/request', verifyJwt, roleGuard('student', 'trainer'), connectionController.requestConnection);
router.patch('/:id/status', verifyJwt, roleGuard('student', 'trainer'), connectionController.updateStatus);

module.exports = router;
