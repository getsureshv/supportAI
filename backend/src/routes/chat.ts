import { Router, Request, Response } from 'express';
import { chatService, ChatMessage } from '../services/ChatService.js';
import { ticketsService } from '../services/TicketsService.js';

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
    const ticket = await ticketsService.getTicket(ticketId);
    if (!ticket) {
      send({ type: 'error', error: 'Ticket not found' });
      return res.end();
    }

    const history = ticket.messages || [];

    const messages: ChatMessage[] = [];

    // If this is the first chat turn, seed with the ticket context so the AI
    // doesn't ask the user to re-explain what they already put in the form.
    if (history.length === 0) {
      const seed = `I just created a support ticket with these details:
- Category: ${ticket.category}
- Priority: ${ticket.priority}
- Subject: ${ticket.subject}
- Description: ${ticket.description}

Please acknowledge what I've shared, then ask any follow-up questions you need (match date, people involved, evidence available, etc.) to help resolve this.`;
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

export default router;
