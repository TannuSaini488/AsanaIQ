const test = require('node:test');
const assert = require('node:assert/strict');

const { buildVerifyJwt } = require('../middlewares/auth');
const { authenticateSocketUser } = require('../socket');

function createAdminClient(decodedClaims) {
  return {
    auth() {
      return {
        verifyIdToken: async () => decodedClaims,
      };
    },
  };
}

function createUserRepo(userDoc) {
  return {
    getUserById: async () => userDoc,
  };
}

test('HTTP auth middleware allows active users', async () => {
  const verifyJwt = buildVerifyJwt({
    adminClient: createAdminClient({ uid: 'u_active' }),
    userRepo: createUserRepo({ role: 'student', status: 'active' }),
  });

  const req = { headers: { authorization: 'Bearer token' } };
  let capturedErr = null;
  await verifyJwt(req, {}, (err) => {
    capturedErr = err || null;
  });

  assert.equal(capturedErr, null);
  assert.equal(req.user.uid, 'u_active');
  assert.equal(req.user.role, 'student');
  assert.equal(req.user.status, 'active');
});

test('HTTP auth middleware blocks suspended users', async () => {
  const verifyJwt = buildVerifyJwt({
    adminClient: createAdminClient({ uid: 'u_suspended' }),
    userRepo: createUserRepo({ role: 'student', status: 'suspended' }),
  });

  const req = { headers: { authorization: 'Bearer token' } };
  let capturedErr = null;
  await verifyJwt(req, {}, (err) => {
    capturedErr = err || null;
  });

  assert.ok(capturedErr);
  assert.equal(capturedErr.code, 'ACCOUNT_SUSPENDED');
  assert.equal(capturedErr.status, 403);
});

test('HTTP auth middleware blocks users missing in Firestore', async () => {
  const verifyJwt = buildVerifyJwt({
    adminClient: createAdminClient({ uid: 'u_missing' }),
    userRepo: createUserRepo(null),
  });

  const req = { headers: { authorization: 'Bearer token' } };
  let capturedErr = null;
  await verifyJwt(req, {}, (err) => {
    capturedErr = err || null;
  });

  assert.ok(capturedErr);
  assert.equal(capturedErr.code, 'USER_NOT_FOUND');
  assert.equal(capturedErr.status, 401);
});

test('Socket auth allows active users', async () => {
  const claims = await authenticateSocketUser('token', {
    adminClient: createAdminClient({ uid: 'u_active_socket' }),
    userRepo: createUserRepo({ role: 'trainer', status: 'active' }),
  });

  assert.equal(claims.uid, 'u_active_socket');
  assert.equal(claims.role, 'trainer');
  assert.equal(claims.status, 'active');
});

test('Socket auth blocks suspended users', async () => {
  await assert.rejects(
    authenticateSocketUser('token', {
      adminClient: createAdminClient({ uid: 'u_suspend_socket' }),
      userRepo: createUserRepo({ role: 'trainer', status: 'suspended' }),
    }),
    (err) => err.code === 'ACCOUNT_SUSPENDED',
  );
});

test('Socket auth blocks users missing in Firestore', async () => {
  await assert.rejects(
    authenticateSocketUser('token', {
      adminClient: createAdminClient({ uid: 'u_missing_socket' }),
      userRepo: createUserRepo(null),
    }),
    (err) => err.code === 'USER_NOT_FOUND',
  );
});
