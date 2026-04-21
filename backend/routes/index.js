const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const sessionRoutes = require('./sessionRoutes');
const aiRoutes = require('./aiRoutes');
const trainerRoutes = require('./trainerRoutes');
const chatRoutes = require('./chatRoutes');
const studentProfileRoutes = require('./studentProfileRoutes');
const reviewRoutes = require('./reviewRoutes');
const trainerController = require('../controllers/trainerController');

const router = express.Router();

router.get('/health', healthController.ping);
router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/ai', aiRoutes);
router.use('/trainers', trainerRoutes);
router.get('/availability/:trainerId', trainerController.getAvailability);
router.use('/chats', chatRoutes);
router.use('/student-profile', studentProfileRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;
