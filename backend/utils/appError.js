class AppError extends Error {
  constructor(message, { status = 500, code, expose = false, retryAfterSeconds = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = expose;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

module.exports = AppError;
