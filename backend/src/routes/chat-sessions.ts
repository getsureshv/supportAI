import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatService, ChatMessage, UserContext } from '../services/ChatService.js';
import { ticketsService } from '../services/TicketsService.js';

const prisma = new PrismaClient();
const router = Router();

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

// Create a new chat session and return the opening AI reply.
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const session = await prisma.chatSession.create({
      data: { userId: req.user!.id },
    });

    // Opening AI message — always the same category-picker so we don't burn an LLM call.
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
      opener: {
        ...opener,
        id: saved.id,
        createdAt: saved.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Return an existing session with messages, for resume/reload.
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
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

// Send a user message and receive the AI's structured reply. Not streamed —
// tool-use needs a fully-formed options array.
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

    // Save user turn
    const userMsg = await prisma.chatSessionMessage.create({
      data: { sessionId, role: 'user', content },
    });

    // Build transcript and generate structured reply
    const history = toChatMessages([...session.messages, userMsg]);
    const reply = await chatService.generateStructuredReply(history, userContextFromReq(req));

    // Ensure "Raise a ticket" chip is present when the AI suggests escalation
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
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { resolved: true },
      });
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

// Escalate a chat session into a full ticket.
router.post('/sessions/:id/escalate', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.ticketId) {
      return res.json({ ticketId: session.ticketId, alreadyEscalated: true });
    }

    const transcript = toChatMessages(session.messages);
    const synth = await chatService.synthesizeTicket(
      transcript,
      userContextFromReq(req),
    );

    const ticket = await ticketsService.createTicket({
      userId: req.user!.id,
      subject: synth.subject,
      description: synth.description,
      category: synth.category,
      priority: synth.priority,
    });

    // Copy transcript into TicketMessage so admins see the conversation.
    for (const m of session.messages) {
      await ticketsService.addMessage(ticket.id, m.role, m.content, false).catch(() => null);
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

export default router;
