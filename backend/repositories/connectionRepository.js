const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');
const AppError = require('../utils/appError');

const CONNECTIONS_COLLECTION = 'connections';

async function requestConnection({ studentId, trainerId, requesterId }) {
  const now = admin.firestore.FieldValue.serverTimestamp();

  return firestore.runTransaction(async (tx) => {
    // Check if a connection already exists
    const querySnap = await tx.get(
      firestore
        .collection(CONNECTIONS_COLLECTION)
        .where('studentId', '==', studentId)
        .where('trainerId', '==', trainerId)
        .limit(1)
    );

    if (!querySnap.empty) {
      const doc = querySnap.docs[0];
      const data = doc.data();
      if (data.status === 'pending') {
        throw new AppError('Connection request already pending', { status: 400 });
      }
      if (data.status === 'accepted') {
        throw new AppError('Already connected', { status: 400 });
      }
      if (data.status === 'rejected') {
        // Option to resend request if previously rejected
        tx.update(doc.ref, { status: 'pending', updatedAt: now });
        return { id: doc.id, status: 'pending' };
      }
    }

    // Create new connection
    const newRef = firestore.collection(CONNECTIONS_COLLECTION).doc();
    tx.set(newRef, {
      studentId,
      trainerId,
      requesterId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return { id: newRef.id, status: 'pending' };
  });
}

async function updateConnectionStatus({ connectionId, currentUserId, status }) {
  if (!['accepted', 'rejected'].includes(status)) {
    throw new AppError('Invalid status', { status: 400 });
  }

  const connRef = firestore.collection(CONNECTIONS_COLLECTION).doc(connectionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(connRef);
    if (!snap.exists) {
      throw new AppError('Connection not found', { status: 404 });
    }

    const data = snap.data();
    // Only the person who DID NOT request the connection can accept or reject it
    const requesterId = data.requesterId || data.studentId; // Fallback to studentId for old records
    if (requesterId === currentUserId) {
      throw new AppError('Forbidden: You cannot respond to your own connection request', { status: 403 });
    }

    // Verify current user is part of the connection
    if (data.studentId !== currentUserId && data.trainerId !== currentUserId) {
      throw new AppError('Forbidden: You are not a participant in this connection', { status: 403 });
    }

    tx.update(connRef, {
      status,
      updatedAt: now,
    });

    if (status === 'accepted') {
      const chatRef = firestore.collection('chats').doc(connectionId);
      tx.set(chatRef, {
        connectionId,
        participants: [data.studentId, data.trainerId],
        lastMessageAt: now,
      }, { merge: true });
    }

    return { id: connRef.id, status };
  });
}

async function listConnectionsByUser(userId, role) {
  const field = role === 'trainer' ? 'trainerId' : 'studentId';
  const snap = await firestore
    .collection(CONNECTIONS_COLLECTION)
    .where(field, '==', userId)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getConnectionById(connectionId) {
  const snap = await firestore.collection(CONNECTIONS_COLLECTION).doc(connectionId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = {
  requestConnection,
  updateConnectionStatus,
  listConnectionsByUser,
  getConnectionById,
};
