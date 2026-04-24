// Centralized error handler using the project-standard error response format.
module.exports = function errorHandler(err, req, res, _next) {
  const isZodError = err?.name === 'ZodError' || Array.isArray(err?.issues);
  const status = isZodError ? 400 : err.status || err.statusCode || 500;
  const code = isZodError ? 'VALIDATION_ERROR' : err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
  const message = isZodError
    ? 'Validation failed'
    : err?.expose
      ? err.message || 'Request failed'
      : status >= 500
        ? 'Internal Server Error'
        : err.message || 'Request failed';

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', { path: req.path, status, code, message: err.message });
  }

  if (err?.retryAfterSeconds && Number.isFinite(Number(err.retryAfterSeconds))) {
    res.set('Retry-After', String(Math.ceil(Number(err.retryAfterSeconds))));
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};
