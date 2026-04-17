import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import ticketsRouter from './routes/tickets.js';
import adminRouter from './routes/admin.js';
import chatRouter from './routes/chat.js';

config({ override: true });

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, version: '1.0.0' });
});

app.use('/api/support', ticketsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);

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

async function bootstrap() {
  await prisma.user
    .upsert({
      where: { id: 'demo-user-1' },
      update: {},
      create: { id: 'demo-user-1', email: 'demo@dcl.local', name: 'Demo User', role: 'user' },
    })
    .catch(err => console.error('Could not seed demo user:', err.message));

  app.listen(PORT, () => {
    console.log(`Cricket Support API running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}

bootstrap();
