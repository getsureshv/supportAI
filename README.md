# 🏏 Cricket Support System - DCL

**AI-powered support ticketing system for the Dallas Cricket League**

A comprehensive support platform with AI-guided ticket creation, real-time chat, and admin dashboard for managing cricket-related issues.

**Status**: Alpha (Ready for development)  
**Version**: 1.0.0  
**Last Updated**: April 17, 2026

---

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (for local dev)
- Anthropic API key (for AI chat)

### Installation

```bash
# Clone repository
git clone https://github.com/getsureshv/cricket-support.git
cd cricket-support

# Frontend setup
cd frontend
npm install
npm run dev  # Runs on http://localhost:3001

# Backend setup (in another terminal)
cd ../backend
npm install
npm run db:push
npm run dev  # Runs on http://localhost:4001
```

### Environment Setup

**Backend** (`.env`):
```
DATABASE_URL="postgresql://user:password@localhost:5432/cricket_support"
PORT=4001
ANTHROPIC_API_KEY=sk-...
FRONTEND_URL=http://localhost:3001
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4001
```

---

## 🎯 Features

### For Users
- ✅ **Ticket Creation** — Form-based or conversational
- ✅ **AI Chat Assistant** — Real-time guidance (SSE streaming)
- ✅ **4-Turn Interview** — Flexible flow: Category → Details → Context → Resolution
- ✅ **Ticket Tracking** — View all tickets with status filtering
- ✅ **Cricket-Specific** — Guided by DCL rulebook (Laws 1-42)

### For Admins
- ✅ **Dashboard** — SLA health, open counts, avg resolution time
- ✅ **Ticket Queue** — Filterable table by status/priority/category
- ✅ **Ticket Management** — Assign, resolve, add internal notes
- ✅ **SLA Tracking** — Automatic calculation per category/priority
- ✅ **Analytics** — Top categories, team performance

### AI Features
- ✅ **Claude Integration** — Anthropic API with SSE streaming
- ✅ **Rule-Based Responses** — Cricket-specific system prompts
- ✅ **Quick Fixes** — Suggests solutions before escalation
- ✅ **Evidence Gathering** — Asks for video, photos, witness details

---

## 📁 Project Structure

```
cricket-support/
├── frontend/                 # Next.js 14 (React)
│   ├── app/
│   │   ├── page.tsx         # Home page
│   │   ├── support/
│   │   │   ├── raise/       # Create ticket
│   │   │   └── tickets/     # View tickets
│   │   └── admin/           # Admin dashboard
│   ├── components/
│   │   ├── TicketForm.tsx
│   │   ├── TicketChat.tsx
│   │   └── ...
│   ├── lib/api.ts           # API client
│   └── README.md
│
├── backend/                  # Express.js + TypeScript
│   ├── src/
│   │   ├── index.ts         # Express app
│   │   ├── services/
│   │   │   ├── TicketsService.ts
│   │   │   ├── ChatService.ts
│   │   │   └── ...
│   │   └── routes/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts
│   └── README.md
│
├── support-rules.md         # Cricket-specific rules & SLAs
├── CRICKET_SUPPORT_IMPLEMENTATION.md
├── DESIGN_SYSTEM.md         # UI/UX guidelines
└── README.md (this file)
```

---

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React + TypeScript
- **Styling**: Tailwind CSS (Cricket green & gold theme)
- **HTTP**: Axios + EventSource (SSE)
- **State**: React hooks + Context API

### Backend Stack
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Anthropic Claude API
- **Streaming**: Server-Sent Events (SSE)
- **Language**: TypeScript

### Database Schema
- **Tickets** — Issue details, status, priority, SLA
- **TicketMessages** — Chat history (user, assistant, support)
- **TicketSLA** — Service level agreement tracking
- **TicketAttachments** — File uploads (S3)

---

## 🎨 Design System

**Figma File**: [Cricket Support System - DCL](https://www.figma.com/design/QEh3r1UOdoaTJ3RpuSD8fS)

### Color Palette
- **Primary**: #1B5E20 (Cricket Green)
- **Accent**: #FFB300 (Gold)
- **Success**: #4CAF50
- **Warning**: #FFC107
- **Error**: #C62828

### Pages
1. **Home Page** — Landing with features & quick actions
2. **Raise Ticket** — Split layout (form 60% | chat 40%)
3. **My Tickets** — User's ticket history with filters
4. **Admin Dashboard** — SLA health, metrics, top categories
5. **Ticket Queue** — Admin table view with management tools

See `DESIGN_SYSTEM.md` for full specifications.

---

## 📊 Ticket Categories

Based on DCL rulebook:

1. **Player Registration & Eligibility** — Law 1.2.2
   - Player not registered, name mismatch, ineligible for playoffs
   - SLA: High (4h response, 24h resolution)

2. **Umpire & Match Officiating Issues** — Law 2
   - Disputed calls, umpire absence, bias
   - SLA: Urgent (2h response, 12h resolution)

3. **Scoring & Scorecard Issues** — Law 3
   - Scorecard errors, miscounted runs, wrong boundaries
   - SLA: High (4h response, 24h resolution)

4. **Equipment & Ground Issues** — Laws 4-6
   - Ball damaged, bat non-compliant, ground unfit
   - SLA: Medium (8h response, 48h resolution)

5. **Match Scheduling & Walk-Overs** — Law 1.1
   - Team late, reschedule request, walk-over dispute
   - SLA: High (4h response, 24h resolution)

6. **Disciplinary & Rules Enforcement** — Laws 41-42
   - Suspension appeal, player conduct, unfair play
   - SLA: Urgent (2h response, 72h resolution)

7. **Feature Requests** — Product feedback
   - App improvements, website suggestions
   - SLA: Low (48h response, no resolution deadline)

---

## 🚀 API Endpoints

### User Endpoints
```
POST   /api/support/tickets              Create ticket
GET    /api/support/tickets              List user's tickets
GET    /api/support/tickets/:id          Get ticket detail
POST   /api/support/tickets/:id/messages Send message
GET    /api/chat/support/:id             Stream AI chat (SSE)
```

### Admin Endpoints
```
GET    /api/admin/support/tickets        List all tickets (filtered)
POST   /api/admin/support/tickets/:id/assign   Assign to staff
PATCH  /api/admin/support/tickets/:id    Update status/priority
GET    /api/admin/support/dashboard      Get dashboard stats
```

---

## 🤖 AI Chat System

### How It Works
1. User submits initial issue details
2. System creates ticket
3. AI chat begins with 4-turn flexible interview:
   - **Turn 1**: Identify category (player, umpire, scoring, equipment, etc.)
   - **Turn 2**: Gather detailed description and impact
   - **Turn 3**: Understand context (match date, people involved, evidence)
   - **Turn 4**: Ask about resolution attempts and preferred outcome
4. AI suggests quick fixes when possible
5. Messages stored in database for reference

### System Prompt
Cricket-specific guidance based on DCL rulebook. References specific Laws (e.g., "Per Law 1.2.2..."). Validates frustrations, respects umpire authority, encourages evidence gathering. Detects playoff urgency (→ URGENT priority).

See `support-rules.md` for complete rules and SLA matrix.

---

## 📖 Documentation

- **`README.md`** (this file) — Project overview
- **`CRICKET_SUPPORT_IMPLEMENTATION.md`** — Technical implementation guide
- **`support-rules.md`** — Cricket-specific support rules & SLAs
- **`DESIGN_SYSTEM.md`** — UI/UX design specifications
- **`frontend/README.md`** — Frontend setup & features
- **`backend/README.md`** — Backend setup & architecture

---

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd ../backend
npm test

# E2E tests (once implemented)
npm run test:e2e
```

### Test Cases (Cricket-Specific)
1. **Player Eligibility** — Wrong player name on playoff game
2. **Umpire Dispute** — Disputed catch call with video evidence
3. **Admin Queue** — Filter tickets by SLA status, assign to staff

See `CRICKET_SUPPORT_IMPLEMENTATION.md` for full test scenarios.

---

## 🔄 CI/CD Pipeline

**Planned**:
- GitHub Actions for lint, test, build
- Deploy frontend to Vercel
- Deploy backend to Railway/Render
- Database migrations via Prisma
- SLA monitoring & alerts

---

## 🛠️ Development Workflow

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/ticket-priority-sorting`
2. Make changes in frontend or backend
3. Test locally
4. Commit with descriptive message
5. Push and create PR
6. Code review + merge to main

### Code Style
- **Frontend**: ESLint + Prettier (Next.js defaults)
- **Backend**: TSLint + Prettier
- **Commits**: Conventional commits (feat:, fix:, docs:, etc.)

---

## 📝 Contributing

### Getting Help
- **Issues**: GitHub Issues for bugs & features
- **Discussions**: GitHub Discussions for questions
- **Slack**: #cricket-support channel (if available)

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

Examples:
- `feat(tickets): add priority sorting to admin queue`
- `fix(chat): fix SSE streaming timeout issue`
- `docs: update SLA matrix for playoff games`

---

## 📋 Roadmap

### Phase 1 (Current)
- ✅ API endpoints
- ✅ Frontend pages
- ✅ AI chat integration
- ✅ SLA tracking
- ⏳ Admin features
- ⏳ Testing

### Phase 2
- Push notifications (email/SMS)
- Knowledge base integration
- Automatic escalation
- Mobile app (React Native)
- Advanced analytics

### Phase 3
- Multi-league support
- Custom workflow rules
- Integration with score tracking
- Machine learning for categorization

---

## 🔐 Security

- **Authentication**: (To be implemented)
- **Authorization**: Role-based access (user, admin, support)
- **Data**: PostgreSQL with encrypted sensitive fields
- **API**: Rate limiting, CORS configured
- **Secrets**: Environment variables, never in code

---

## 📞 Support

- **Documentation**: See docs above
- **Issues**: GitHub Issues
- **Email**: suresh@portpro.io
- **Phone**: Available during business hours

---

## 📄 License

[Add appropriate license - e.g., MIT, Apache 2.0]

---

## 👥 Team

- **Product**: Suresh Veerabhadraiah
- **Design**: Figma community
- **Development**: Claude AI (Code generation)

---

## 🎯 Next Steps

1. ✅ Create git repository
2. ⏳ Complete backend API routes
3. ⏳ Implement authentication
4. ⏳ Set up database (PostgreSQL)
5. ⏳ Run integration tests
6. ⏳ Deploy to staging
7. ⏳ User acceptance testing
8. ⏳ Production deployment

---

**Cricket Support System**  
*Making cricket support seamless with AI*  
🏏 Powered by Claude & Anthropic API  
April 2026
