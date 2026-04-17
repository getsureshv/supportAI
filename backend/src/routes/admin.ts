import { Router, Request, Response } from 'express';
import { ticketsService } from '../services/TicketsService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/support/tickets', async (req: Request, res: Response) => {
  try {
    const { status, category, priority } = req.query;
    const tickets = await ticketsService.listTickets({
      status: status as string | undefined,
      category: category as string | undefined,
      priority: priority as string | undefined,
    });
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/support/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const ticket = await ticketsService.updateTicketStatus(req.params.id, status);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/support/tickets/:id/assign', async (req: Request, res: Response) => {
  try {
    const { assignedToId } = req.body;
    const ticket = await ticketsService.assignTicket(req.params.id, assignedToId);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/support/dashboard', async (_req: Request, res: Response) => {
  try {
    const [openCount, resolvedTickets, categoryGroups] = await Promise.all([
      prisma.ticket.count({ where: { status: 'open' } }),
      prisma.ticket.findMany({
        where: { status: { in: ['resolved', 'closed'] } },
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.ticket.groupBy({
        by: ['category'],
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    let avgResolutionHours = 0;
    if (resolvedTickets.length) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        if (t.resolvedAt) return sum + (t.resolvedAt.getTime() - t.createdAt.getTime());
        return sum;
      }, 0);
      avgResolutionHours = Math.round((totalMs / resolvedTickets.length / 3600000) * 10) / 10;
    }

    const total = await prisma.ticket.count();
    const slas = await prisma.ticketSLA.findMany();
    const breached = slas.filter(
      s => s.resolutionDueAt && !s.resolvedAt && s.resolutionDueAt < new Date(),
    ).length;
    const slaHealth = total ? Math.round(((total - breached) / total) * 100) : 100;

    res.json({
      openCount,
      avgResolutionHours,
      slaHealth,
      totalResolved: resolvedTickets.length,
      topCategories: categoryGroups.map(g => ({ category: g.category, count: g._count._all })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
