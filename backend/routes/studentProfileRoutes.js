const express = require('express');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const studentProfileController = require('../controllers/studentProfileController');

const router = express.Router();

router.get('/me', verifyJwt, roleGuard('student', 'admin'), studentProfileController.getMine);
router.put('/me', verifyJwt, roleGuard('student', 'admin'), studentProfileController.upsertMine);

module.exports = router;
