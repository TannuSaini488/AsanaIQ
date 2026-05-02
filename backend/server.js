const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const responseHandler = require('./middlewares/responseHandler');
const errorHandler = require('./middlewares/errorHandler');
const initSocket = require('./socket');

const app = express();
const httpServer = http.createServer(app);

// Attach Socket.io
initSocket(httpServer);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.includes('*')
      ? {}
      : {
          origin: allowedOrigins,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
  ),
);

app.use(
  express.json({
    limit: process.env.BODY_LIMIT || '1mb',
  }),
);
app.use(responseHandler);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // Increased for smoother local testing
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/ai', aiLimiter);

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Not Found',
    },
  });
});

app.use(errorHandler);

const start = () => {
  const { port, env } = config;
  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] Server listening on port ${port} in ${env} mode`);
  });
};

start();

module.exports = app; // Trigger restart 6 - Ensuring free fallback is active
