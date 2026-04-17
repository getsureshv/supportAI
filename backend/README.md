# Cricket Support Backend API

Express.js backend for the Dallas Cricket League Support Ticketing System.

## Features

- ✅ **Ticket Management** — Create, read, update, delete tickets
- ✅ **AI Chat Integration** — Real-time streaming with Claude API via SSE
- ✅ **SLA Tracking** — Automatic SLA calculation per category/priority
- ✅ **Admin Features** — Ticket assignment, status updates, dashboard
- ✅ **Cricket-Specific** — Rules-based categorization and quick fixes
- ✅ **Message History** — Store ticket conversation history

## Tech Stack

- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Anthropic Claude API (SSE streaming)
- **Language**: TypeScript

## Project Structure

```
src/
├── index.ts              # Express app setup
├── routes/
│   ├── tickets.ts        # User ticket endpoints
│   ├── admin.ts          # Admin endpoints
│   └── chat.ts           # Chat streaming
├── services/
│   ├── TicketsService.ts # Ticket CRUD + SLA
│   ├── ChatService.ts    # Claude AI integration
│   └── AdminService.ts   # Admin logic
└── middleware/
    └── auth.ts           # Authentication

prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Sample data

.env.example              # Environment template
```

## Installation

```bash
cd backend
npm install
```

## Setup Database

```bash
# Create PostgreSQL database
createdb cricket_support

# Push schema
npm run db:push

# (Optional) Seed data
npm run db:seed
```

## Development

```bash
npm run dev
```

Runs on `http://localhost:4001`

## API Endpoints

### User Endpoints

```
POST /api/support/tickets
  Body: { category, subject, description, priority, matchId? }
  Response: { id, status, createdAt, sla }

GET /api/support/tickets?status=open&category=player_registration
  Response: Ticket[]

GET /api/support/tickets/:id
  Response: Ticket (with messages)

POST /api/support/tickets/:id/messages
  Body: { content, role }

GET /api/chat/support/:ticketId?message=...
  Response: Server-Sent Events (streaming chat)
```

### Admin Endpoints

```
GET /api/admin/support/tickets?status=open&slaStatus=at_risk
  Response: Ticket[]

POST /api/admin/support/tickets/:id/assign
  Body: { assignedToId }

PATCH /api/admin/support/tickets/:id
  Body: { status, priority, internalNote? }

GET /api/admin/support/dashboard
  Response: { openCount, avgResolutionTime, slaHealth%, topCategories[] }
```

## Database Schema

**Ticket**
- id (UUID)
- userId (FK)
- assignedToId (FK, nullable)
- subject, description, category, priority, status
- matchId (FK, optional)
- interviewTurn (tracks 4-turn progress)
- createdAt, updatedAt, resolvedAt

**TicketMessage**
- id, ticketId (FK), role, content, isInternal

**TicketSLA**
- id, ticketId (FK, unique)
- category, priority
- firstResponseDueAt, resolutionDueAt
- firstResponseAt, resolvedAt

## SLA Configuration

Based on category + priority from `support-rules.md`:

| Category | Priority | First Response | Resolution |
|----------|----------|---|---|
| Player Reg | High | 4h | 24h |
| Umpire Issues | Urgent | 2h | 12h |
| Scoring | High | 4h | 24h |
| Equipment | Medium | 8h | 48h |
| Scheduling | High | 4h | 24h |
| Disciplinary | Urgent | 2h | 72h |
| Feature Req | Low | 48h | None |

## Chat System

Uses Anthropic Claude API with Server-Sent Events (SSE) for real-time streaming:

1. Client sends message to `/api/chat/support/:ticketId`
2. Backend calls Claude with conversation history
3. Response streams as `data: {type, text}` events
4. Client renders streamed text in real-time
5. Message stored in database

### System Prompt

Cricket-specific guidance for ticket creation interview:
- 4-turn flexible flow (Category → Details → Context → Resolution)
- Cites specific cricket laws
- Suggests quick fixes
- Detects urgency (playoff = URGENT)

## Environment Variables

Create `.env`:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/cricket_support
PORT=4001
ANTHROPIC_API_KEY=sk-...
FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

## Status

**In Progress**: Core services and routes  
**Pending**: Complete route handlers, authentication, tests

## Next Steps

1. ✅ Schema and services
2. ⏳ API routes implementation
3. ⏳ SSE chat streaming
4. ⏳ Authentication middleware
5. ⏳ Error handling
6. ⏳ Tests

## Author

Cricket Support Team | April 2026
