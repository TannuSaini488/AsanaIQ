const admin = require('../config/firebaseAdmin');
const authRepository = require('../repositories/authRepository');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');

async function register({ email, password, role }, { apiKey } = {}) {
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
  } catch (err) {
    if (err.code?.startsWith('auth/')) {
      throw new AppError('Firebase auth configuration missing or invalid', {
        status: 500,
        code: err.code,
      });
    }
    throw err;
  }

  // Create Firestore user document to align with domain schema
  try {
    await userRepository.createUser(userRecord.uid, {
      role,
      name: null,
      email: userRecord.email,
    });
  } catch (err) {
    // Avoid partially-created accounts (Auth user exists, Firestore user missing).
    try {
      await admin.auth().deleteUser(userRecord.uid);
    } catch (rollbackErr) {
      // eslint-disable-next-line no-console
      console.error('[auth] rollback deleteUser failed', {
        uid: userRecord.uid,
        code: rollbackErr?.code,
        message: rollbackErr?.message,
      });
    }
    // eslint-disable-next-line no-console
    console.error('[auth] Firestore user write failed', {
      uid: userRecord.uid,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      code: err?.code,
      message: err?.message,
    });
    throw new AppError('Failed to create user profile', {
      status: 500,
      code: 'FIRESTORE_WRITE_FAILED',
    });
  }

  let tokenBundle = {};
  if (apiKey) {
    tokenBundle = await authRepository.signInWithEmailAndPassword(email, password, { apiKey });
  }

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    role,
    onboardingCompleted: false,
    ...tokenBundle,
  };
}

async function checkOnboardingStatus(role, userId) {
  let onboardingCompleted = false;
  if (role === 'student') {
    const studentProfileRepository = require('../repositories/studentProfileRepository');
    const profile = await studentProfileRepository.getByUserId(userId);
    onboardingCompleted = !!(profile && profile.onboardingCompleted);
  } else if (role === 'trainer') {
    const trainerRepository = require('../repositories/trainerRepository');
    const profile = await trainerRepository.getTrainerById(userId);
    onboardingCompleted = !!profile;
  }
  return onboardingCompleted;
}

async function login({ email, password }, { apiKey }) {
  if (!apiKey) {
    throw new AppError('Firebase Web API key missing', { status: 500, code: 'CONFIG_MISSING' });
  }
  const tokenBundle = await authRepository.signInWithEmailAndPassword(email, password, { apiKey });
  let dbUser = null;
  try {
    dbUser = tokenBundle.localId ? await userRepository.getUserById(tokenBundle.localId) : null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auth] Firestore user read failed', {
      uid: tokenBundle.localId || null,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      code: err?.code,
      message: err?.message,
    });
    throw new AppError('Failed to read user profile', {
      status: 500,
      code: 'FIRESTORE_READ_FAILED',
    });
  }
  if (!dbUser) {
    throw new AppError('USER_NOT_FOUND', { status: 401, code: 'USER_NOT_FOUND' });
  }
  if (dbUser.status && dbUser.status !== 'active') {
    throw new AppError('ACCOUNT_SUSPENDED', { status: 403, code: 'ACCOUNT_SUSPENDED' });
  }

  const onboardingCompleted = await checkOnboardingStatus(dbUser.role, dbUser.id);

  return {
    ...tokenBundle,
    role: dbUser.role || null,
    onboardingCompleted,
  };
}

async function refresh({ refreshToken }, { apiKey }) {
  if (!apiKey) {
    throw new AppError('Firebase Web API key missing', { status: 500, code: 'CONFIG_MISSING' });
  }
  const tokenBundle = await authRepository.refreshIdToken(refreshToken, { apiKey });
  const dbUser = tokenBundle.localId ? await userRepository.getUserById(tokenBundle.localId) : null;
  if (!dbUser) {
    throw new AppError('USER_NOT_FOUND', { status: 401, code: 'USER_NOT_FOUND' });
  }
  if (dbUser.status && dbUser.status !== 'active') {
    throw new AppError('ACCOUNT_SUSPENDED', { status: 403, code: 'ACCOUNT_SUSPENDED' });
  }

  const onboardingCompleted = await checkOnboardingStatus(dbUser.role, dbUser.id);

  return {
    ...tokenBundle,
    role: dbUser.role || null,
    onboardingCompleted,
  };
}

module.exports = { register, login, refresh };

