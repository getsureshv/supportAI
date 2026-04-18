import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import { extname, join } from 'path';
import { PrismaClient } from '@prisma/client';
import { ticketsService } from '../services/TicketsService.js';
import { transcriptionService } from '../services/TranscriptionService.js';

const prisma = new PrismaClient();
const router = Router();

const DEMO_USER_ID = 'demo-user-1';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { category, subject, description, priority, matchId } = req.body;
    if (!category || !subject || !description || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const ticket = await ticketsService.createTicket({
      userId: DEMO_USER_ID,
      category,
      subject,
      description,
      priority,
      matchId,
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const { status, category, priority } = req.query;
    const tickets = await ticketsService.listTickets({
      userId: DEMO_USER_ID,
      status: status as string | undefined,
      category: category as string | undefined,
      priority: priority as string | undefined,
    });
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        sla: true,
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { role, content } = req.body;
    const msg = await ticketsService.addMessage(req.params.id, role || 'user', content);
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload one or more attachments. Each file is saved to disk, recorded in
// the database, and then transcribed asynchronously so the response doesn't
// block on Claude vision calls.
router.post(
  '/tickets/:id/attachments',
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const ticketId = req.params.id;
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

      const created = await Promise.all(
        files.map(f =>
          prisma.ticketAttachment.create({
            data: {
              ticketId,
              fileName: f.originalname,
              mimeType: f.mimetype,
              fileSize: f.size,
              storagePath: f.path,
              transcriptionStatus: 'pending',
            },
          }),
        ),
      );

      // Kick off transcription in the background so the UI isn't blocked.
      for (const att of created) {
        transcribeInBackground(att.id, att.storagePath, att.mimeType, att.fileName);
      }

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get('/tickets/:id/attachments/:attachmentId/download', async (req: Request, res: Response) => {
  try {
    const att = await prisma.ticketAttachment.findFirst({
      where: { id: req.params.attachmentId, ticketId: req.params.id },
    });
    if (!att) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', att.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${att.fileName}"`);
    createReadStream(att.storagePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function transcribeInBackground(
  attachmentId: string,
  storagePath: string,
  mimeType: string,
  fileName: string,
) {
  try {
    const text = await transcriptionService.transcribe(storagePath, mimeType, fileName);
    await prisma.ticketAttachment.update({
      where: { id: attachmentId },
      data: { transcription: text, transcriptionStatus: 'completed' },
    });
    console.log(`[Transcription] done: ${fileName} → ${text.length} chars`);
  } catch (err: any) {
    console.error(`[Transcription] failed for ${fileName}:`, err.message);
    await prisma.ticketAttachment
      .update({
        where: { id: attachmentId },
        data: { transcriptionStatus: 'failed', transcription: `[error: ${err.message}]` },
      })
      .catch(() => null);
  }
}

export default router;
