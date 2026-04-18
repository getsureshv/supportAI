import { Router, Request, Response } from 'express';
import { ticketsService } from '../services/TicketsService.js';

const router = Router();

router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { category, subject, description, priority, matchId } = req.body;
    if (!category || !subject || !description || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const ticket = await ticketsService.createTicket({
      userId: req.user!.id,
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
      userId: req.user!.id,
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
    const ticket = await ticketsService.getTicket(req.params.id);
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

export default router;
