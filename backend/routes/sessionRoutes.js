const express = require('express');
const sessionController = require('../controllers/sessionController');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');

const router = express.Router();

router.post('/book', verifyJwt, roleGuard('student'), sessionController.book);
router.patch('/:id/state', verifyJwt, roleGuard('student', 'trainer'), sessionController.updateState);
router.patch('/:id/notes', verifyJwt, roleGuard('trainer'), sessionController.upsertTrainerNotes);

module.exports = router;
