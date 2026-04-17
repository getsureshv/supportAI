import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors({ credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, version: '1.0.0' });
});

// TODO: Import and use routes
// import ticketsRouter from './routes/tickets.js';
// import adminRouter from './routes/admin.js';
// import chatRouter from './routes/chat.js';

// app.use('/api/support', ticketsRouter);
// app.use('/api/admin', adminRouter);
// app.use('/api/chat', chatRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    statusCode: err.status || 500,
  });
});

app.listen(PORT, () => {
  console.log(`🏏 Cricket Support API running on http://localhost:${PORT}`);
  console.log(`📖 Swagger docs at http://localhost:${PORT}/api/docs`);
});
