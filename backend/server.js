const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();

// ── Startup environment validation ──────────────────────────────────────────
// Fail fast if critical variables are missing so the server never runs in an
// insecure or broken state.
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('FATAL: Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

// Using Prisma with PostgreSQL/Neon; no mongoose connect required here.

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        scriptSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ── HTTPS redirect in production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// Restrict origins. Set ALLOWED_ORIGINS as comma-separated list in .env for
// production (e.g. "https://bloodate.com,https://www.bloodate.com").
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no Origin header (e.g. curl, Postman, same-origin)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    maxAge: 86400,
  })
);

app.use(express.json());

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limiter for auth endpoints — protects against brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skipSuccessfulRequests: false,
});

// General limiter for all other API routes.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── ensure upload dirs exist for multer and local copies ─────────────────────
const fs = require('fs');
const path = require('path');
const tmpDir = path.resolve(__dirname, 'tmp');
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Routes ────────────────────────────────────────────────────────────────────
const donorsRouter = require('./routes/donors');
app.use('/api/donors', donorsRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);
const hospitalsRouter = require('./routes/hospitals');
app.use('/api/hospitals', hospitalsRouter);
const stockRouter = require('./routes/stock');
app.use('/api/stock', stockRouter);
const requestsRouter = require('./routes/requests');
app.use('/api/requests', requestsRouter);
const uploadsRouter = require('./routes/uploads');
app.use('/api/uploads', uploadsRouter);
const eligibilityRouter = require('./routes/eligibility');
app.use('/api/eligibility', eligibilityRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Global error handler ──────────────────────────────────────────────────────
// Catches errors forwarded via next(err) from any route or asyncHandler.
// Intentionally kept last — after all routes.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
