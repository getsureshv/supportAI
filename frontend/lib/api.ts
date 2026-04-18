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
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  role: 'user' | 'assistant' | 'support';
  content: string;
  isInternal: boolean;
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

export interface Team {
  id: string;
  name: string;
  division: string | null;
}

export interface ChatSession {
  id: string;
  userId: string;
  ticketId: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  options: string[] | null;
  is_resolution?: boolean;
  suggest_ticket?: boolean;
  createdAt: string;
}

export interface SessionCreateResponse {
  session: ChatSession;
  opener: {
    id: string;
    message: string;
    options: string[];
    is_resolution: boolean;
    suggest_ticket: boolean;
    createdAt: string;
  };
}

export interface SessionMessageResponse {
  user: {
    id: string;
    role: 'user';
    content: string;
    createdAt: string;
  };
  assistant: {
    id: string;
    role: 'assistant';
    content: string;
    options: string[];
    is_resolution: boolean;
    suggest_ticket: boolean;
    createdAt: string;
  };
}

// Tickets
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
  streamChat: (ticketId: string, message: string) => {
    return fetch(`${API_URL}/api/chat/support/${ticketId}?message=${encodeURIComponent(message)}`, {
      credentials: 'include',
      headers: { Accept: 'text/event-stream' },
    });
  },
};

// Admin
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
  updateTicket: async (
    ticketId: string,
    data: { status?: string; priority?: string; internalNote?: string },
  ) => {
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

// Teams
export const teamsAPI = {
  list: async () => apiClient.get<Team[]>('/api/teams'),
};

// Chat sessions (new chat-first flow)
export const chatSessionsAPI = {
  create: async () =>
    apiClient.post<SessionCreateResponse>('/api/chat-sessions/sessions'),
  get: async (id: string) =>
    apiClient.get<
      ChatSession & { messages: StructuredChatMessage[] }
    >(`/api/chat-sessions/sessions/${id}`),
  sendMessage: async (id: string, content: string) =>
    apiClient.post<SessionMessageResponse>(
      `/api/chat-sessions/sessions/${id}/messages`,
      { content },
    ),
  escalate: async (id: string) =>
    apiClient.post<{ ticketId: string; alreadyEscalated?: boolean }>(
      `/api/chat-sessions/sessions/${id}/escalate`,
    ),
};

export default apiClient;
