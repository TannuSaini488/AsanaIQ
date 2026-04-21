const sessionService = require('../services/sessionService');
const aiService = require('../services/aiService');
const config = require('../config');
const {
  bookSessionSchema,
  sessionIdParamsSchema,
  sessionStateActionSchema,
  trainerNotesSchema,
} = require('../validators/sessionValidator');

async function book(req, res, next) {
  try {
    const { trainerId, slotId } = bookSessionSchema.parse(req.body);
    const result = await sessionService.bookSession({
      user: req.user,
      trainerId,
      slotId,
    });
    res.success(result, 'Session booked');
  } catch (err) {
    next(err);
  }
}

async function updateState(req, res, next) {
  try {
    const { id: sessionId } = sessionIdParamsSchema.parse(req.params);
    const { action } = sessionStateActionSchema.parse(req.body);
    const result = await sessionService.transitionSessionState({
      sessionId,
      action,
      user: req.user,
    });
    if (result.status === 'completed') {
      try {
        await aiService.generateSummaryForCompletedSession({
          sessionId,
          apiKey: config.geminiApiKey,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[session] auto summary failed', { sessionId, message: err?.message });
      }
    }
    res.success(result, 'Session state updated');
  } catch (err) {
    next(err);
  }
}

async function upsertTrainerNotes(req, res, next) {
  try {
    const { id: sessionId } = sessionIdParamsSchema.parse(req.params);
    const { trainerNotes } = trainerNotesSchema.parse(req.body);
    const session = await sessionService.updateTrainerNotes({
      sessionId,
      trainerNotes,
      user: req.user,
    });
    res.success({ session }, 'Trainer notes updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { book, updateState, upsertTrainerNotes };
