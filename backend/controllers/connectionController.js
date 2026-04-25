const connectionRepository = require('../repositories/connectionRepository');
const userRepository = require('../repositories/userRepository');

async function requestConnection(req, res, next) {
  try {
    const requesterId = req.user.uid;
    const role = req.user.role || req.user.customClaims?.role;
    const { peerId } = req.body;
    
    // For backwards compatibility with old frontend payload
    const targetId = peerId || req.body.trainerId;

    if (!targetId) {
      return res.status(400).json({ status: 'error', message: 'peerId is required' });
    }

    let studentId, trainerId;
    if (role === 'trainer') {
      trainerId = requesterId;
      studentId = targetId;
    } else {
      studentId = requesterId;
      trainerId = targetId;
    }

    const result = await connectionRepository.requestConnection({ studentId, trainerId, requesterId });
    res.success(result, 'Connection request sent');
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const currentUserId = req.user.uid;
    const { id: connectionId } = req.params;
    const { status } = req.body;

    const result = await connectionRepository.updateConnectionStatus({ connectionId, currentUserId, status });
    res.success(result, `Connection ${status}`);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const userId = req.user.uid;
    const role = req.user.role || req.user.customClaims?.role;

    const connections = await connectionRepository.listConnectionsByUser(userId, role);

    // Enrich with peer info
    const enriched = await Promise.all(
      connections.map(async (conn) => {
        const peerId = role === 'trainer' ? conn.studentId : conn.trainerId;
        let peerName = null;
        try {
          const peer = await userRepository.getUserById(peerId);
          peerName = peer?.name || null;
        } catch (_) {}
        return {
          ...conn,
          peerId,
          peerName,
          createdAtMs: conn.createdAt?.toDate?.()?.getTime?.() || null,
        };
      })
    );

    res.success({ connections: enriched }, 'Connections loaded');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requestConnection,
  updateStatus,
  listMine,
};
