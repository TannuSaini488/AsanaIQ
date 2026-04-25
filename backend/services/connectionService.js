const connectionRepository = require('../repositories/connectionRepository');
const AppError = require('../utils/appError');

async function validateConnectionAccess({ connectionId, userId }) {
  const connection = await connectionRepository.getConnectionById(connectionId);
  if (!connection) {
    throw new AppError('Connection not found', { status: 404, code: 'CONNECTION_NOT_FOUND' });
  }
  if (connection.studentId !== userId && connection.trainerId !== userId) {
    throw new AppError('Access denied', { status: 403, code: 'FORBIDDEN' });
  }
  if (connection.status !== 'accepted') {
    throw new AppError('Connection not accepted', { status: 403, code: 'FORBIDDEN' });
  }
  return connection;
}

module.exports = {
  validateConnectionAccess,
};
