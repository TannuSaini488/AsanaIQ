const express = require('express');
const trainerController = require('../controllers/trainerController');
const verifyJwt = require('../middlewares/auth');
const roleGuard = require('../middlewares/roleGuard');

const router = express.Router();

router.get('/me', verifyJwt, roleGuard('trainer'), trainerController.getMine);
router.put('/me', verifyJwt, roleGuard('trainer'), trainerController.upsertMine);
router.get('/me/availability', verifyJwt, roleGuard('trainer'), trainerController.getMyAvailability);
router.post('/me/availability', verifyJwt, roleGuard('trainer'), trainerController.createMyAvailability);
router.delete(
  '/me/availability/:slotId',
  verifyJwt,
  roleGuard('trainer'),
  trainerController.deleteMyAvailability,
);
router.get('/', verifyJwt, roleGuard('student', 'trainer'), trainerController.getAll);
router.get('/:trainerId/availability', trainerController.getAvailability);

module.exports = router;
