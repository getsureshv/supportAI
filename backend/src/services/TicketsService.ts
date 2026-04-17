import { PrismaClient, Ticket, TicketStatus, TicketPriority } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTicketInput {
  userId: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  matchId?: string;
}

export interface TicketFilters {
  userId?: string;
  status?: TicketStatus;
  category?: string;
  priority?: TicketPriority;
  assignedToId?: string;
  limit?: number;
  offset?: number;
}

export class TicketsService {
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const ticket = await prisma.ticket.create({
      data: {
        userId: input.userId,
        category: input.category as any,
        subject: input.subject,
        description: input.description,
        priority: input.priority as TicketPriority,
        status: 'open' as TicketStatus,
        matchId: input.matchId,
      },
    });

    // Calculate and create SLA
    await this.calculateAndCreateSLA(ticket.id, input.category, input.priority);

    return ticket;
  }

  async getTicket(id: string): Promise<(Ticket & { messages: any[] }) | null> {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        sla: true,
      },
    }) as any;
  }

  async listTickets(filters: TicketFilters): Promise<Ticket[]> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    return prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    });
  }

  async updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
    const resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status, resolvedAt },
    });

    // Update SLA if resolved
    if (resolvedAt) {
      await prisma.ticketSLA.update({
        where: { ticketId: id },
        data: { resolvedAt },
      });
    }

    return ticket;
  }

  async assignTicket(id: string, assignedToId: string): Promise<Ticket> {
    return prisma.ticket.update({
      where: { id },
      data: { assignedToId, status: 'in_progress' as TicketStatus },
    });
  }

  async addMessage(ticketId: string, role: string, content: string, isInternal: boolean = false) {
    return prisma.ticketMessage.create({
      data: {
        ticketId,
        role,
        content,
        isInternal,
      },
    });
  }

  async getMessages(ticketId: string) {
    return prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async calculateAndCreateSLA(ticketId: string, category: string, priority: string) {
    // SLA rules based on support-rules.md
    const slaTimes: Record<string, Record<string, { firstResponse: number; resolution: number }>> = {
      player_registration: {
        low: { firstResponse: 24, resolution: 48 },
        medium: { firstResponse: 8, resolution: 24 },
        high: { firstResponse: 4, resolution: 24 },
        urgent: { firstResponse: 2, resolution: 8 },
      },
      umpire_issues: {
        high: { firstResponse: 4, resolution: 12 },
        urgent: { firstResponse: 2, resolution: 12 },
      },
      scoring_disputes: {
        medium: { firstResponse: 8, resolution: 48 },
        high: { firstResponse: 4, resolution: 24 },
        urgent: { firstResponse: 2, resolution: 12 },
      },
      equipment_issues: {
        low: { firstResponse: 24, resolution: 48 },
        medium: { firstResponse: 8, resolution: 48 },
        high: { firstResponse: 4, resolution: 24 },
      },
      match_scheduling: {
        low: { firstResponse: 24, resolution: 48 },
        high: { firstResponse: 4, resolution: 24 },
        urgent: { firstResponse: 2, resolution: 12 },
      },
      disciplinary: {
        high: { firstResponse: 4, resolution: 48 },
        urgent: { firstResponse: 2, resolution: 72 },
      },
      feature_request: {
        low: { firstResponse: 48, resolution: 0 }, // No strict resolution SLA
      },
    };

    const catTimes = slaTimes[category] || slaTimes.feature_request;
    const times = catTimes[priority] || { firstResponse: 24, resolution: 48 };

    const now = new Date();
    const firstResponseDueAt = new Date(now.getTime() + times.firstResponse * 60 * 60 * 1000);
    const resolutionDueAt = times.resolution ? new Date(now.getTime() + times.resolution * 60 * 60 * 1000) : null;

    await prisma.ticketSLA.create({
      data: {
        ticketId,
        category,
        priority,
        firstResponseDueAt,
        resolutionDueAt,
      },
    });
  }
}

export const ticketsService = new TicketsService();
