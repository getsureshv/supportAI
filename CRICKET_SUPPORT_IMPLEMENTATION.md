# DCL Cricket Support System - Implementation Plan

**Version**: 1.0  
**Created**: April 2026  
**Target**: Dallas Cricket League (DCL)

---

## Project Overview

This is a **Support Ticketing System with AI Chat** for the Dallas Cricket League, powered by the `support-ticketing` Claude skill. Users can create support tickets conversationally through AI chat, and support staff can manage tickets from an admin dashboard.

**Key Features**:
- ✅ AI-guided ticket creation (4-turn flexible interview)
- ✅ 7 cricket-specific categories (player registration, umpire issues, scoring, equipment, scheduling, disciplinary, features)
- ✅ Conversational AI suggests cricket rule solutions
- ✅ SLA tracking (2-72 hour responses based on priority/category)
- ✅ Admin dashboard for support staff
- ✅ Real-time ticket status updates

**Built with**:
- Frontend: React + TypeScript (or Next.js)
- Backend: Node.js/Express + PostgreSQL + Anthropic Claude API
- AI Chat: SSE streaming with Claude Sonnet
- Database: PostgreSQL with Prisma ORM

---

## Architecture

```
CricketSupport/
├── frontend/                  # React/Next.js app
│   ├── pages/
│   │   ├── raise-ticket.tsx  # User creates ticket with AI chat
│   │   ├── my-tickets.tsx    # User views own tickets
│   │   └── admin/
│   │       ├── dashboard.tsx # Support staff dashboard
│   │       ├── queue.tsx     # Ticket queue with filters
│   │       └── ticket/[id].tsx # Manage single ticket
│   └── lib/
│       └── api.ts           # API client
├── backend/                   # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── tickets.ts    # User endpoints
│   │   │   ├── admin.ts      # Admin endpoints
│   │   │   └── chat.ts       # AI chat SSE
│   │   ├── services/
│   │   │   ├── tickets.service.ts
│   │   │   ├── chat.service.ts (Claude AI)
│   │   │   └── sla.service.ts
│   │   └── models/
│   │       └── database.ts   # Prisma schema
│   └── .env
├── support-rules.md          # Cricket-specific support rules
├── DCL_Document_V3_*.pdf     # Cricket rulebook reference
└── CRICKET_SUPPORT_IMPLEMENTATION.md (this file)
```

---

## Database Schema

```sql
-- Tickets Table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id),
  assignedToId UUID REFERENCES users(id), -- support staff
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- player_registration, umpire_issues, scoring, equipment, scheduling, disciplinary, feature_request
  priority VARCHAR(20) NOT NULL, -- low, medium, high, urgent
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  matchId UUID, -- if ticket is about a specific match
  interviewTurn INT DEFAULT 1, -- tracks 4-turn interview progress
  attachment VARCHAR(255), -- S3 URL if user uploaded file
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  resolvedAt TIMESTAMP,
  INDEX(userId),
  INDEX(assignedToId),
  INDEX(status),
  INDEX(category)
);

-- Ticket Messages (Chat History)
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticketId UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant, support
  content TEXT NOT NULL,
  isInternal BOOLEAN DEFAULT FALSE, -- hidden from user if true
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(ticketId)
);

-- SLA Tracking
CREATE TABLE ticket_slas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticketId UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  category VARCHAR(50),
  priority VARCHAR(20),
  firstResponseDueAt TIMESTAMP,
  resolutionDueAt TIMESTAMP,
  firstResponseAt TIMESTAMP,
  resolvedAt TIMESTAMP,
  INDEX(ticketId)
);

-- Ticket Attachments
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticketId UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  fileName VARCHAR(255),
  s3Url VARCHAR(255),
  uploadedAt TIMESTAMP DEFAULT NOW()
);
```

---

## Test Cases for Cricket Support Skill

### Test 1: Player Registration Error (Playoff Urgency)

**User Prompt**:
```
One of our players showed up on the matchday and we submitted the playing XI on the DCL app, 
but I just realized we listed our player as 'Rohit Sharma' when his actual name is 'Rohit Saini'. 
We didn't notify the umpire or the other captain before the match started. 
Now they're saying they might protest. What happens now? This is a playoff game.
```

**Expected Skill Behavior**:
1. Recognize urgency (playoff, player eligibility violation)
2. Cite Law 1.2.2 from DCL rulebook (penalties: captain suspension min 2 games, match may be awarded)
3. Ask clarifying questions:
   - Did you notify umpires before or after match start?
   - Do you have ID proof of correct player?
   - Did you get the ID proof in time?
4. Suggest immediate action: File ticket NOW with explanation + ID proof
5. Prioritize as **URGENT** with high priority
6. Provide escalation path: dclmgmtops@gmail.com
7. Create ticket with category "Player Registration & Eligibility" and match reference

**Success Criteria**: Ticket created with all context, escalation suggested, SLA set to 2-hour response

---

### Test 2: Umpire Call Dispute with Video Evidence

**User Prompt**:
```
We had an issue during the match — our opener got a high ball and the fielder looked like 
he caught it cleanly near the boundary, but the umpire called it a boundary 6, not a catch. 
We have a video showing the ball touched the ground before the fielder picked it up. 
Can we dispute this?
```

**Expected Skill Behavior**:
1. Acknowledge the concern and frustration
2. Explain Law 2.12: Umpire decision is final, but CAN be altered if error is clear
3. Ask for evidence details:
   - Timing of the event (which over?)
   - Do you have clear video showing ball touching ground?
   - Did you challenge during the match?
4. Suggest filing post-match disciplinary ticket with video evidence
5. Set expectations: "Umpire may still uphold decision, but video evidence helps"
6. Note: Scorecard correction requires both captains + umpires agreement
7. Provide ticket with category "Umpire & Match Officiating Issues" and attachment upload option

**Success Criteria**: Ticket created with video attachment, discipline ticket type noted, umpire cited

---

### Test 3: Admin Support Staff Managing Tickets

**User Prompt**:
```
I'm running support for DCL this week. Show me tickets from the past 2 days. 
I want to see which ones are about umpire issues and which are about player eligibility 
so I can prioritize them. Also tell me which tickets have SLA breaches.
```

**Expected Skill Behavior**:
1. Recognize admin/support staff context (not end user)
2. Display ticket queue filtered by:
   - Date range (past 2 days)
   - Categories (Umpire Issues, Player Eligibility)
3. Show for each ticket:
   - Ticket ID, subject, priority, status
   - SLA status: **On Track** ✅ / **At Risk** ⚠️ / **Breached** 🔴
   - Time since creation
   - Assigned to (if any)
4. Highlight urgent tickets in bold/red (playoff-related, safety issues)
5. Offer quick actions:
   - Assign to yourself/another staff member
   - Change status (in_progress → resolved)
   - Add internal note (hidden from user)
6. Show metrics:
   - Total open tickets (X)
   - Avg resolution time (Y hours)
   - Most common categories this week
7. Suggest actions: "3 tickets are at risk of SLA breach. Would you like me to help draft responses?"

**Success Criteria**: 
- Correct filtering applied
- SLA calculations accurate
- Admin actions available (assign, resolve, note)
- Metrics displayed

---

## Key Cricket-Specific Features

### Category 1: Player Registration & Eligibility
- **Common Issues**:
  - Player not in roster
  - Name mismatch (Rohit vs Rohit Saini)
  - Player ineligible for playoffs (<3 league games)
  - Suspended player played
- **Quick Fixes**: Check roster, verify eligibility, get ID proof
- **SLA**: High priority (4-hour response), critical before playoff games (Urgent, 2-hour)
- **Rules Ref**: Law 1.2 (Nomination), Law 1.5 (Playing Squad)

### Category 2: Umpire Issues
- **Common Issues**:
  - Umpire didn't show up
  - Disputed call (catch vs boundary)
  - Wrong umpire assigned (bias)
  - Umpire conduct/abuse
- **Quick Fixes**: Video evidence, cite specific rule violation
- **SLA**: Urgent (2-hour response)
- **Rules Ref**: Law 2 (The Umpires)

### Category 3: Scoring Disputes
- **Common Issues**:
  - Scorecard entry error
  - Short runs miscounted
  - Boundary confusion (4 vs 6)
  - Penalty runs wrong
- **Quick Fixes**: Video evidence, scoresheet comparison
- **SLA**: High (4-hour response)
- **Rules Ref**: Law 3 (Scorers), Law 2.15 (In-game Scoring)

### Category 4: Equipment Issues
- **Common Issues**:
  - Ball ripped
  - Bat non-compliant
  - Ground unfit
  - Missing equipment (stumps, cones)
- **Quick Fixes**: Have backups ready, notify umpire immediately
- **SLA**: Medium (8-hour response)
- **Rules Ref**: Law 4-5 (Ball & Bat), Law 2.7 (Fitness for Play)

### Category 5: Match Scheduling
- **Common Issues**:
  - Team late (penalties)
  - Reschedule request
  - Walk-over dispute
- **Quick Fixes**: Confirm with umpires, file walk-over within 45-min window
- **SLA**: High (4-hour response)
- **Rules Ref**: Law 1.1 (Late team penalties), Appendix B (Walk-over rules)

### Category 6: Disciplinary
- **Common Issues**:
  - Player suspension dispute
  - Captain suspension appeal
  - Unfair play alleged
  - Rule violation
- **Quick Fixes**: Cite specific rule, gather evidence
- **SLA**: Urgent (2-hour response for appeals), 72-hour resolution
- **Rules Ref**: Law 1.2.2, Law 41-42 (Unfair Play, Conduct)

### Category 7: Feature Requests
- **Common Issues**:
  - "Can you add SMS alerts?"
  - "App won't load schedule"
  - "Scorecard is confusing"
- **Quick Fixes**: Troubleshoot app issue, collect feature feedback
- **SLA**: Low (24-hour response), no urgency
- **Rules Ref**: N/A (product feedback)

---

## API Endpoints

### User Endpoints

```
POST /api/support/tickets
  Body: { category, subject, description, priority, matchId?, attachment? }
  Response: { ticketId, status, createdAt, firstResponseDueAt }

GET /api/support/tickets
  Query: status, category, priority, limit, offset
  Response: [{ id, subject, status, priority, createdAt, assignedTo }]

GET /api/support/tickets/:id
  Response: { id, subject, description, messages[], sla, status, priority }

POST /api/support/tickets/:id/messages
  Body: { role (user|assistant), content, attachment? }
  Response: { messageId, createdAt }

POST /api/chat/support/:ticketId (SSE)
  Query: message
  Response: Server-Sent Events with streaming text + message updates
```

### Admin Endpoints

```
GET /api/admin/support/tickets
  Query: status, category, priority, assignee, slaStatus, dateRange
  Response: [{ id, subject, status, priority, assignedTo, slaBreach, createdAt }]

POST /api/admin/support/tickets/:id/assign
  Body: { assignedToId }
  Response: { success }

PATCH /api/admin/support/tickets/:id
  Body: { status?, priority?, internalNote? }
  Response: { success, updatedAt }

GET /api/admin/support/dashboard
  Response: { openCount, avgResolutionTime, slaHealth%, topCategories[] }
```

---

## AI Chat System Prompt (Cricket-Specific)

```
You are a cricket support assistant for the Dallas Cricket League (DCL).
You help users create support tickets by interviewing them conversationally.

CONTEXT:
- Cricket rules are defined in the DCL rulebook (Laws 1-42)
- Users are team captains, players, umpires, or tournament staff
- Common issues: player eligibility, umpire calls, scoring errors, equipment, scheduling, discipline
- Tone: Professional, empathetic, encouraging fair play and Spirit of Cricket

YOUR ROLE:
1. Listen to the user's issue
2. Ask clarifying questions to understand context (Law #, match date, evidence)
3. Cite specific cricket rules (Law 1.2.2, Law 2.12, etc.)
4. Suggest quick fixes where possible
5. Offer escalation path if needed
6. Collect all details and create structured ticket

4-TURN INTERVIEW (flexible order):
1. **Category**: What type of issue? (Player, Umpire, Scoring, Equipment, Scheduling, Discipline, Feature)
2. **Details**: What happened? When? Any evidence (video, photo)?
3. **Context**: Which match? Which players/umpires involved? What's the impact?
4. **Resolution**: What's your preferred outcome? How urgent? (Playoff-related = URGENT)

WHEN TO SUGGEST QUICK FIXES:
- Playoff player eligibility: Direct to Law 1.5 rules
- Umpire call dispute: Ask for video, cite Law 2.12 (final but can be altered)
- Scoring error: Request scoresheet + video proof
- Missing equipment: Suggest having backups before next match
- Walk-over dispute: Confirm timing (must be within 45 mins of start)

ALWAYS:
- Reference specific Cricket Laws (e.g., "Per Law 1.2.2, if a player was incorrectly listed...")
- Validate frustrations ("That's tough, especially in a playoff...")
- Respect umpire authority (unless clear rule violation)
- Encourage gathering evidence (video, photos, witness statements)
- Note when issue is Playoff-related (→ URGENT priority)
- Suggest emailing dclmgmtops@gmail.com for time-sensitive issues

TONE:
- Professional but friendly
- Cricket enthusiast (knows the game)
- Fair-minded (emphasize Spirit of Cricket)
- Solution-oriented
```

---

## SLA Configuration

Based on `support-rules.md`:

```json
{
  "sla_matrix": {
    "player_registration": {
      "low": { "firstResponse": "24h", "resolution": "48h" },
      "medium": { "firstResponse": "8h", "resolution": "24h" },
      "high": { "firstResponse": "4h", "resolution": "24h" },
      "urgent_playoff": { "firstResponse": "2h", "resolution": "8h" }
    },
    "umpire_issues": {
      "high": { "firstResponse": "4h", "resolution": "12h" },
      "urgent": { "firstResponse": "2h", "resolution": "12h" },
      "urgent_playoff": { "firstResponse": "1h", "resolution": "6h" }
    },
    "scoring_disputes": {
      "medium": { "firstResponse": "8h", "resolution": "48h" },
      "high": { "firstResponse": "4h", "resolution": "24h" },
      "urgent_playoff": { "firstResponse": "2h", "resolution": "12h" }
    },
    "equipment_issues": {
      "low": { "firstResponse": "24h", "resolution": "48h" },
      "medium": { "firstResponse": "8h", "resolution": "48h" },
      "high": { "firstResponse": "4h", "resolution": "24h" }
    },
    "match_scheduling": {
      "low": { "firstResponse": "24h", "resolution": "48h" },
      "high": { "firstResponse": "4h", "resolution": "24h" },
      "urgent": { "firstResponse": "2h", "resolution": "12h" }
    },
    "disciplinary": {
      "high": { "firstResponse": "4h", "resolution": "48h" },
      "urgent": { "firstResponse": "2h", "resolution": "72h" }
    },
    "feature_requests": {
      "low": { "firstResponse": "48h", "resolution": "None (backlog)" }
    }
  }
}
```

---

## Next Steps

1. ✅ **Rules Definition** — Created `support-rules.md` with cricket-specific issues & solutions
2. ⏳ **Backend Setup** — Create Express API + Prisma schema + tickets routes
3. ⏳ **Chat Integration** — Wire Anthropic Claude API for AI support assistant
4. ⏳ **Frontend** — Build React pages for ticket creation, admin dashboard
5. ⏳ **Testing** — Run test cases from skill-creator for validation
6. ⏳ **Deployment** — Deploy backend API, frontend, integrate with DCL website

---

**Status**: Planning Complete  
**Owner**: Suresh @ Cricket Support  
**Target Launch**: May 2026
