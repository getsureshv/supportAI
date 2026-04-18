import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import { extname, join } from 'path';
import { PrismaClient } from '@prisma/client';
import { chatService, ChatMessage, UserContext } from '../services/ChatService.js';
import { ticketsService } from '../services/TicketsService.js';
import { transcriptionService } from '../services/TranscriptionService.js';

const prisma = new PrismaClient();
const router = Router();

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

function toChatMessages(rows: { role: string; content: string }[]): ChatMessage[] {
  return rows.map(r => ({
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: r.content,
  }));
}

function userContextFromReq(req: Request): UserContext {
  const u = req.user!;
  return { name: u.name, team: u.team, role: u.role, email: u.email };
}

// Build a single synthetic "user" message that injects any completed
// attachment transcriptions into the AI's context.
async function buildAttachmentsContextMessage(sessionId: string): Promise<ChatMessage | null> {
  const atts = await prisma.attachment.findMany({
    where: { sessionId, transcriptionStatus: 'completed', NOT: { transcription: null } },
    orderBy: { createdAt: 'asc' },
  });
  if (!atts.length) return null;

  const body = atts
    .map((a, i) => {
      return `### Attachment ${i + 1}: ${a.fileName} (${a.mimeType})\n${a.transcription}`;
    })
    .join('\n\n');

  return {
    role: 'user',
    content: `[Context: the user has uploaded these evidence files. Use them when answering.]\n\n${body}`,
  };
}

// Create a new chat session and return the opening AI reply.
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const session = await prisma.chatSession.create({
      data: { userId: req.user!.id },
    });

    const opener = {
      message: `Hi ${req.user!.name.split(' ')[0]}! I can help with DCL support. What's going on?`,
      options: chatService.initialCategories().slice(0, 4),
      is_resolution: false,
      suggest_ticket: false,
    };

    const saved = await prisma.chatSessionMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: opener.message,
        options: JSON.stringify(opener.options),
      },
    });

    res.status(201).json({
      session,
      opener: { ...opener, id: saved.id, createdAt: saved.createdAt },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Not found' });
    const messages = session.messages.map(m => ({
      ...m,
      options: m.options ? JSON.parse(m.options) : null,
    }));
    res.json({ ...session, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content required' });
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const userMsg = await prisma.chatSessionMessage.create({
      data: { sessionId, role: 'user', content },
    });

    const history = toChatMessages([...session.messages, userMsg]);

    // Fold attachment transcriptions into the context so the AI can reference them
    const attachmentCtx = await buildAttachmentsContextMessage(sessionId);
    const contextMessages = attachmentCtx ? [attachmentCtx, ...history] : history;

    const reply = await chatService.generateStructuredReply(
      contextMessages,
      userContextFromReq(req),
    );

    if (reply.suggest_ticket && !reply.options.some(o => /raise.*ticket/i.test(o))) {
      reply.options = ['Raise a ticket', ...reply.options].slice(0, 4);
    }

    const assistantMsg = await prisma.chatSessionMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: reply.message,
        options: JSON.stringify(reply.options),
      },
    });

    if (reply.is_resolution && !session.resolved) {
      await prisma.chatSession.update({ where: { id: sessionId }, data: { resolved: true } });
    }

    res.json({
      user: { ...userMsg },
      assistant: {
        id: assistantMsg.id,
        role: 'assistant',
        content: reply.message,
        options: reply.options,
        is_resolution: reply.is_resolution,
        suggest_ticket: reply.suggest_ticket,
        createdAt: assistantMsg.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[chat-sessions] reply failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload one or more evidence files to a session.
// Transcription runs in the background so the UI isn't blocked.
router.post(
  '/sessions/:id/attachments',
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id;
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: req.user!.id },
      });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

      const created = await Promise.all(
        files.map(f =>
          prisma.attachment.create({
            data: {
              sessionId,
              fileName: f.originalname,
              mimeType: f.mimetype,
              fileSize: f.size,
              storagePath: f.path,
              transcriptionStatus: 'pending',
            },
          }),
        ),
      );

      for (const att of created) {
        transcribeInBackground(att.id, att.storagePath, att.mimeType, att.fileName);
      }

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get('/sessions/:id/attachments', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const atts = await prisma.attachment.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(atts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  '/sessions/:id/attachments/:attId/download',
  async (req: Request, res: Response) => {
    try {
      const att = await prisma.attachment.findFirst({
        where: { id: req.params.attId, sessionId: req.params.id },
      });
      if (!att) return res.status(404).json({ error: 'Not found' });

      // Ownership check through the session
      const session = await prisma.chatSession.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!session) return res.status(404).json({ error: 'Not found' });

      res.setHeader('Content-Type', att.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${att.fileName}"`);
      createReadStream(att.storagePath).pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Escalate a chat session into a full ticket.
router.post('/sessions/:id/escalate', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        attachments: true,
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.ticketId) {
      return res.json({ ticketId: session.ticketId, alreadyEscalated: true });
    }

    const transcript = toChatMessages(session.messages);

    // Include attachment transcriptions so the synthesized ticket reflects them
    const attachmentCtx = await buildAttachmentsContextMessage(sessionId);
    const contextForSynth = attachmentCtx ? [attachmentCtx, ...transcript] : transcript;

    const synth = await chatService.synthesizeTicket(contextForSynth, userContextFromReq(req));

    const ticket = await ticketsService.createTicket({
      userId: req.user!.id,
      subject: synth.subject,
      description: synth.description,
      category: synth.category,
      priority: synth.priority,
    });

    for (const m of session.messages) {
      await ticketsService.addMessage(ticket.id, m.role, m.content, false).catch(() => null);
    }

    // Link existing attachments to the new ticket
    if (session.attachments.length) {
      await prisma.attachment.updateMany({
        where: { sessionId },
        data: { ticketId: ticket.id },
      });
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { ticketId: ticket.id, resolved: true },
    });

    res.status(201).json({ ticketId: ticket.id });
  } catch (err: any) {
    console.error('[chat-sessions] escalate failed:', err);
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
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { transcription: text, transcriptionStatus: 'completed' },
    });
    console.log(`[Transcription] done: ${fileName} → ${text.length} chars`);
  } catch (err: any) {
    console.error(`[Transcription] failed for ${fileName}:`, err.message);
    await prisma.attachment
      .update({
        where: { id: attachmentId },
        data: { transcriptionStatus: 'failed', transcription: `[error: ${err.message}]` },
      })
      .catch(() => null);
  }
}

export default router;
