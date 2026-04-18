import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatService, ChatMessage } from '../services/ChatService.js';
import { ticketsService } from '../services/TicketsService.js';

const prisma = new PrismaClient();
const router = Router();

router.get('/support/:ticketId', async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const userMessage = (req.query.message as string) || '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) {
      send({ type: 'error', error: 'Ticket not found' });
      return res.end();
    }

    const history = ticket.messages;
    const messages: ChatMessage[] = [];

    if (history.length === 0) {
      const attachmentSection = buildAttachmentSection(ticket.attachments);
      const seed = `I just created a support ticket with these details:
- Category: ${ticket.category}
- Priority: ${ticket.priority}
- Subject: ${ticket.subject}
- Description: ${ticket.description}${attachmentSection}

Please acknowledge what I've shared (referencing any uploaded evidence), then ask any follow-up questions you need (match date, people involved, additional evidence) to help resolve this.`;
      messages.push({ role: 'user', content: seed });
      await ticketsService.addMessage(ticketId, 'user', seed, true).catch(() => null);
    } else {
      for (const m of history) {
        messages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        });
      }
    }

    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
      await ticketsService.addMessage(ticketId, 'user', userMessage).catch(() => null);
    }

    let fullReply = '';
    for await (const chunk of chatService.streamChatResponse(messages)) {
      fullReply += chunk;
      send({ type: 'text', text: chunk });
    }

    if (fullReply) {
      await ticketsService.addMessage(ticketId, 'assistant', fullReply).catch(() => null);
    }

    send({ type: 'done' });
    res.end();
  } catch (err: any) {
    send({ type: 'error', error: err.message });
    res.end();
  }
});

function buildAttachmentSection(attachments: Array<{ fileName: string; mimeType: string; transcription: string | null; transcriptionStatus: string }>): string {
  if (!attachments.length) return '';
  const parts = attachments.map((a, i) => {
    const header = `\n### Attachment ${i + 1}: ${a.fileName} (${a.mimeType})`;
    if (a.transcriptionStatus === 'completed' && a.transcription) {
      return `${header}\n${a.transcription}`;
    }
    if (a.transcriptionStatus === 'pending') {
      return `${header}\n[Transcription in progress — the user may mention contents that haven't been processed yet]`;
    }
    return `${header}\n[Transcription unavailable]`;
  });
  return `\n\n## Uploaded evidence:${parts.join('\n')}`;
}

export default router;
