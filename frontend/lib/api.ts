import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedToId?: string;
  createdAt: string;
  resolvedAt?: string;
  messages?: TicketMessage[];
  sla?: TicketSLA;
  attachments?: TicketAttachment[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  role: 'user' | 'assistant' | 'support';
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  transcription: string | null;
  transcriptionStatus: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface TicketSLA {
  id: string;
  category: string;
  priority: string;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
}

export interface CreateTicketRequest {
  category: string;
  subject: string;
  description: string;
  priority: string;
  matchId?: string;
}

export interface SendMessageRequest {
  content: string;
  role: 'user' | 'assistant';
  isInternal?: boolean;
}

// User endpoints
export const ticketsAPI = {
  create: async (data: CreateTicketRequest) => {
    return apiClient.post<Ticket>('/api/support/tickets', data);
  },

  list: async (params?: { status?: string; category?: string; limit?: number; offset?: number }) => {
    return apiClient.get<Ticket[]>('/api/support/tickets', { params });
  },

  get: async (id: string) => {
    return apiClient.get<Ticket>(`/api/support/tickets/${id}`);
  },

  sendMessage: async (ticketId: string, data: SendMessageRequest) => {
    return apiClient.post(`/api/support/tickets/${ticketId}/messages`, data);
  },

  uploadAttachments: async (ticketId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return apiClient.post<TicketAttachment[]>(
      `/api/support/tickets/${ticketId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  attachmentUrl: (ticketId: string, attachmentId: string) =>
    `${API_URL}/api/support/tickets/${ticketId}/attachments/${attachmentId}/download`,

  streamChat: (ticketId: string, message: string) => {
    return fetch(`${API_URL}/api/chat/support/${ticketId}?message=${encodeURIComponent(message)}`, {
      credentials: 'include',
      headers: {
        'Accept': 'text/event-stream',
      },
    });
  },
};

// Admin endpoints
export const adminAPI = {
  listTickets: async (params?: {
    status?: string;
    category?: string;
    priority?: string;
    assignee?: string;
    slaStatus?: string;
    limit?: number;
    offset?: number;
  }) => {
    return apiClient.get<Ticket[]>('/api/admin/support/tickets', { params });
  },

  assignTicket: async (ticketId: string, assignedToId: string) => {
    return apiClient.post(`/api/admin/support/tickets/${ticketId}/assign`, { assignedToId });
  },

  updateTicket: async (ticketId: string, data: { status?: string; priority?: string; internalNote?: string }) => {
    return apiClient.patch(`/api/admin/support/tickets/${ticketId}`, data);
  },

  getDashboard: async () => {
    return apiClient.get<{
      openCount: number;
      avgResolutionTime: number;
      slaHealth: number;
      topCategories: Array<{ category: string; count: number }>;
    }>('/api/admin/support/dashboard');
  },
};

export default apiClient;
