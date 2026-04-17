# Cricket Support Frontend

Next.js 14 React application for the Dallas Cricket League Support Ticketing System.

## Features

- ✅ **User Ticket Creation** — Form-based ticket creation with category selection
- ✅ **AI Chat Integration** — Real-time chat with support AI via SSE streaming
- ✅ **Ticket Browsing** — View all user tickets with filtering and sorting
- ✅ **Admin Dashboard** — Stats, metrics, SLA health tracking
- ✅ **Admin Ticket Queue** — Filterable table of all tickets with SLA status
- ✅ **Responsive Design** — Mobile-friendly Tailwind CSS styling
- ✅ **Cricket-Specific UI** — Categories, rules, quick tips based on cricket context

## Project Structure

```
app/
├── layout.tsx              # Root layout with navigation
├── page.tsx                # Home page
├── support/
│   ├── raise/
│   │   └── page.tsx       # Create new ticket
│   └── tickets/
│       ├── page.tsx       # List user's tickets
│       └── [id]/
│           └── page.tsx   # View single ticket
└── admin/
    └── support/
        ├── page.tsx       # Admin dashboard
        └── tickets/
            ├── page.tsx   # Admin ticket queue
            └── [id]/
                └── page.tsx # Manage single ticket

components/
├── TicketForm.tsx         # Ticket creation form
├── TicketChat.tsx         # AI chat component with SSE
└── TicketCard.tsx         # Reusable ticket card

lib/
└── api.ts                 # API client with typed endpoints

globals.css               # Tailwind + custom styles
tailwind.config.js        # Tailwind configuration
next.config.js            # Next.js configuration
```

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Runs on `http://localhost:3001`

## Environment

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4001
```

## API Integration

All API calls go through `lib/api.ts`. Available endpoints:

**User**:
- `POST /api/support/tickets` — Create ticket
- `GET /api/support/tickets` — List user's tickets
- `GET /api/support/tickets/:id` — Get ticket detail
- `POST /api/support/tickets/:id/messages` — Send message
- `GET /api/chat/support/:id` — Stream AI chat (SSE)

**Admin**:
- `GET /api/admin/support/tickets` — List all tickets (with filters)
- `POST /api/admin/support/tickets/:id/assign` — Assign ticket
- `PATCH /api/admin/support/tickets/:id` — Update status/priority
- `GET /api/admin/support/dashboard` — Get stats

## Styling

- **Colors**: Cricket green, gold, red (defined in `tailwind.config.js`)
- **Components**: Form inputs, buttons, badges, cards
- **Responsive**: Mobile-first design, grid layouts

## Key Components

### TicketForm
Form for creating new tickets with category, subject, description, priority selection.

### TicketChat
Real-time chat with AI support assistant using Server-Sent Events (SSE) for streaming responses.

### Admin Components (TODO)
- AdminDashboard — Stats and quick actions
- AdminTicketQueue — Filterable ticket table
- AdminTicketDetail — Manage single ticket

## Status

**Complete**: Core pages and components  
**Pending**: Full integration with backend API

## Next Steps

1. Build backend API (Express + Prisma)
2. Wire chat streaming endpoint
3. Test ticket creation and AI chat flow
4. Deploy frontend to production

## Author

Cricket Support Team | April 2026
