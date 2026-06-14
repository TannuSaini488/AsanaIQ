const express = require('express');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.post('/', verifyJwt, roleGuard('student'), reviewController.create);
router.get('/trainer/:trainerId', verifyJwt, roleGuard('student', 'trainer'), reviewController.listByTrainer);
router.get('/student/:studentId', verifyJwt, roleGuard('student', 'trainer'), reviewController.listByStudent);

module.exports = router;

