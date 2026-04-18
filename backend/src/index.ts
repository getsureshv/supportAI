import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import ticketsRouter from './routes/tickets.js';
import adminRouter from './routes/admin.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import teamsRouter from './routes/teams.js';
import chatSessionsRouter from './routes/chat-sessions.js';
import { requireAuth } from './middleware/requireAuth.js';

config({ override: true });

const app = express();
const PORT = process.env.PORT || 4001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, version: '2.0.0' });
});

// Public auth endpoints (no auth required)
app.use('/api/auth', authRouter);

// Protected endpoints (require JWT cookie or Bearer token)
app.use('/api/teams', requireAuth, teamsRouter);
app.use('/api/chat-sessions', requireAuth, chatSessionsRouter);
app.use('/api/support', requireAuth, ticketsRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/chat', requireAuth, chatRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    statusCode: err.status || 500,
  });
});

app.listen(PORT, () => {
  console.log(`Cricket Support API running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('ℹ  GOOGLE_CLIENT_ID not set → demo login enabled at POST /api/auth/demo');
  }
});
