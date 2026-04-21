const admin = require('../config/firebaseAdmin');
const userRepository = require('../repositories/userRepository');

function buildVerifyJwt({ adminClient = admin, userRepo = userRepository } = {}) {
  return async function verifyJwt(req, _res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error('Authorization header missing or malformed');
        err.status = 401;
        throw err;
      }
      const token = authHeader.substring(7);
      const decoded = await adminClient.auth().verifyIdToken(token);
      let dbUser = null;
      try {
        dbUser = decoded.uid ? await userRepo.getUserById(decoded.uid) : null;
      } catch (readErr) {
        const err = new Error('Failed to read user profile');
        err.status = 500;
        err.code = 'FIRESTORE_READ_FAILED';
        throw err;
      }
      if (!dbUser) {
        const err = new Error('User not found');
        err.status = 401;
        err.code = 'USER_NOT_FOUND';
        throw err;
      }
      if (dbUser.status && dbUser.status !== 'active') {
        const err = new Error('Account suspended');
        err.status = 403;
        err.code = 'ACCOUNT_SUSPENDED';
        throw err;
      }
      const role = decoded.role || decoded.customClaims?.role || dbUser.role;
      req.user = { ...decoded, role, status: dbUser.status };
      next();
    } catch (err) {
      if (!err.status) {
        const code = typeof err.code === 'string' ? err.code : '';
        err.status = code.startsWith('auth/') ? 401 : 500;
      }
      next(err);
    }
  };
}

const verifyJwt = buildVerifyJwt();

module.exports = verifyJwt;
module.exports.buildVerifyJwt = buildVerifyJwt;
