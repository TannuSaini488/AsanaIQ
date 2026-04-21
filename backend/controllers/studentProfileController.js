const studentProfileService = require('../services/studentProfileService');
const { studentProfileUpsertSchema } = require('../validators/studentProfileValidator');

async function getMine(req, res, next) {
  try {
    const profile = await studentProfileService.getMyProfile({ user: req.user });
    res.success({ profile }, 'Student profile fetched');
  } catch (err) {
    next(err);
  }
}

async function upsertMine(req, res, next) {
  try {
    const payload = studentProfileUpsertSchema.parse(req.body);
    const profile = await studentProfileService.upsertMyProfile({
      user: req.user,
      payload,
    });
    res.success({ profile }, 'Student profile saved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMine,
  upsertMine,
};
