# Cricket Support System - UI Design System

**Figma File**: https://www.figma.com/design/QEh3r1UOdoaTJ3RpuSD8fS

## Design System

### Color Palette

```
Primary:      #1B5E20 (Cricket Green)
Primary Dark: #0D3018
Primary Light:#2E7D32
Accent:       #FFB300 (Gold)
Accent Dark:  #F57F17
Success:      #4CAF50
Warning:      #FFC107
Error:        #C62828
White:        #FFFFFF
Gray Light:   #F5F5F5
Gray Border:  #E0E0E0
Dark:         #333333
```

### Typography

```
Headlines (H1):    32px, Bold, Primary
Headlines (H2):    24px, Bold, Primary
Titles:            18px, SemiBold, Dark
Body:              14px, Regular, Dark
Label:             12px, SemiBold, Dark
Button:            14px, SemiBold, White
```

### Components

#### Navigation Bar
- Height: 70px
- Background: Primary (Cricket Green)
- Logo: "🏏 DCL Support" in white
- Links: Raise Ticket, My Tickets, Admin
- Hover state: Primary Light background

#### Buttons
- Primary: Green background, white text
- Secondary: Light gray, dark text
- Small: 40px height
- Medium: 48px height (standard)
- Large: 56px height (CTAs)
- Corner radius: 6px
- Hover: Darken by 10%

#### Form Inputs
- Height: 40-48px
- Border: 1px Light Gray
- Background: #F5F5F5
- Focus: Border color → Primary, shadow
- Corner radius: 6px
- Padding: 12px horizontal

#### Cards
- Background: White
- Border: 1px Light Gray
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Corner radius: 8px
- Padding: 20px
- Hover: Shadow increase

#### Badges
- Priority Low: Blue badge
- Priority Medium: Yellow badge
- Priority High: Orange badge
- Priority Urgent: Red badge
- Status Open: Blue text
- Status In Progress: Orange text
- Status Resolved: Green text

### Spacing

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
```

---

## Pages

### 1. Home Page (Landing)

```
Layout:
┌─────────────────────────────────┐
│         Navigation (70px)         │  [Dark Green]
├─────────────────────────────────┤
│                                   │
│    Hero Section (250px)          │  [Green]
│    🏏 Welcome to DCL Support     │  
│    "Get help with cricket issues" │
│    [Raise Ticket →]  [Secondary] │
│                                   │
├─────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │Quick │  │ Fast │  │Cricket│  │  Features (3 cards)
│  │Help  │  │ Resp │  │ Rules │  │
│  └──────┘  └──────┘  └──────┘  │
│                                   │
└─────────────────────────────────┘
```

**Elements**:
- Navigation with logo and links
- Hero section: Title, subtitle, CTA button
- 3 feature cards: Quick Help, Fast Response, Cricket Rules
- Footer with links

---

### 2. Raise Ticket Page (Main Feature)

```
Layout: 60% Form | 40% Chat

┌─────────────────────────────────────────────┐
│ Navigation                                    │
├──────────────────┬──────────────────────────┤
│   FORM (60%)     │    CHAT (40%)            │
│                  │                           │
│ [Category ▼]    │ ┌────────────────────┐   │
│ [Subject____]    │ │ 🤖 AI Assistant   │   │
│ [Description__]  │ ├────────────────────┤   │
│ [Priority ▼]     │ │ How can I help?   │   │
│                  │ └────────────────────┘   │
│ [Create Ticket]  │                          │
│                  │ ┌────────────────────┐   │
│                  │ │ Player eligibility │   │
│                  │ │ issue              │   │
│                  │ └────────────────────┘   │
│                  │                          │
│                  │ [Message input____→]    │
└──────────────────┴──────────────────────────┘
```

**Key Features**:
- Left: Clean form with 4 fields + Submit button
- Right: Chat with AI assistant, real-time responses
- Form summarized on right when ticket created
- Responsive: Stacks on mobile

---

### 3. My Tickets Page

```
Layout:

┌──────────────────────────────────────┐
│ Navigation                             │
├──────────────────────────────────────┤
│ [All] [Open] [In Progress] [Resolved]│
├──────────────────────────────────────┤
│ ◾ Ticket #1 - Player Registration      │
│   High Priority | Open | 2 days ago   │
├──────────────────────────────────────┤
│ ◾ Ticket #2 - Umpire Dispute          │
│   Urgent | In Progress | 4 hours ago  │
├──────────────────────────────────────┤
│ ◾ Ticket #3 - Scoring Error           │
│   Medium | Resolved | 1 day ago       │
└──────────────────────────────────────┘
```

**Features**:
- Filter bar with status buttons
- Ticket cards with:
  - Subject/title
  - Priority badge (color-coded)
  - Status indicator
  - Time created
  - Colored left border (Green=Open, Orange=In Progress, Gray=Closed)
- Click to view details

---

### 4. Admin Dashboard

```
Layout:

┌──────────────────────────────────────────────┐
│ Navigation                                    │
├──────────────────────────────────────────────┤
│ Support Dashboard                             │
│                                               │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Open  │ │ Avg  │ │SLA   │ │Total │        │
│ │ 12   │ │4.2h  │ │92%   │ │ 156  │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                               │
│ Top Categories                                │
│ ┌─────────────────────────────────────┐     │
│ │ Player Registration    ████ 28       │     │
│ │ Umpire Issues          ███  18       │     │
│ │ Scoring Disputes       ██   12       │     │
│ │ Feature Requests       █    5        │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ Quick Actions:                                │
│ [View Open] [At Risk SLA] [Breached SLA]    │
└──────────────────────────────────────────────┘
```

**Metrics**:
- 4 stat cards: Open Count, Avg Resolution Time, SLA Health %, Total Resolved
- Color coding: Green for healthy, Yellow for warning, Red for critical
- Top categories chart
- Quick action buttons

---

### 5. Admin Ticket Queue

```
Layout: Table View

┌─────────────────────────────────────────────────────────────┐
│ Navigation                                                   │
├─────────────────────────────────────────────────────────────┤
│ Status: [All ▼]  Category: [All ▼]  Priority: [All ▼]      │
├──────┬────────┬────────┬─────────┬──────┬────────┬─────────┤
│Subject│Category│Priority│ Status  │ SLA  │Created │ Action  │
├──────┼────────┼────────┼─────────┼──────┼────────┼─────────┤
│ Issue│ Player │ High   │ Open    │ ✅   │2h ago │[View →] │
├──────┼────────┼────────┼─────────┼──────┼────────┼─────────┤
│ Issue│ Umpire │ Urgent │InProgress│⚠️   │30m ago│[View →] │
├──────┼────────┼────────┼─────────┼──────┼────────┼─────────┤
│ Issue│ Scoring│ Medium │ Open    │ 🔴   │8h ago │[View →] │
└──────┴────────┴────────┴─────────┴──────┴────────┴─────────┘
```

**Features**:
- Filter dropdowns (Status, Category, Priority)
- Sortable table columns
- SLA status badges (✅ On Track, ⚠️ At Risk, 🔴 Breached)
- Action buttons (View/Manage)
- Hover effects on rows

---

## Responsive Design

### Mobile (< 768px)

- Navigation: Hamburger menu
- Raise Ticket: Stack vertically (Form on top, Chat below)
- Cards: Full width
- Table: Horizontal scroll or card view

### Tablet (768px - 1024px)

- Raise Ticket: Side-by-side but narrower
- Cards: 2 columns
- Table: Slightly condensed

### Desktop (> 1024px)

- Full design as specified
- Optimal spacing and typography

---

## Interaction Patterns

### Loading States
- Spinner icon with "Loading..." text
- Disabled buttons with opacity

### Error States
- Red error message below field
- Error badge on form section
- Toast notification (top-right)

### Success States
- Green checkmark
- Success toast: "Ticket created successfully!"
- Auto-redirect after 2 seconds

### Hover States
- Buttons: Darker shade (+10% saturation)
- Cards: Shadow increase (0 4px 12px)
- Links: Underline appears

---

## Accessibility

- **Color contrast**: All text meets WCAG AA standards
- **Focus states**: Visible focus ring (primary color)
- **Keyboard navigation**: Tab order matches visual order
- **Form labels**: Always associated with inputs
- **Alt text**: All icons have tooltips or aria-label
- **Semantic HTML**: Proper heading hierarchy

---

## Design Files

**Figma**: https://www.figma.com/design/QEh3r1UOdoaTJ3RpuSD8fS

**Components** (to build in Figma):
- [ ] Navigation component
- [ ] Form input component
- [ ] Button variations (primary, secondary, small, large)
- [ ] Card component
- [ ] Badge component (status, priority, SLA)
- [ ] Modal/Dialog
- [ ] Tooltip
- [ ] Toast notification
- [ ] Dropdown/Select

---

## Implementation Notes

1. **Color variables**: Use CSS custom properties (--primary, --accent, etc.)
2. **Spacing system**: Use 8px grid (4px, 8px, 16px, 24px, 32px, 48px)
3. **Typography scales**: Use modular scale (e.g., 12px base, 1.5x multiplier)
4. **Shadow system**: 3 levels (light, medium, dark)
5. **Border radius**: 6px standard, 8px cards, 4px small components
6. **Transitions**: 200ms ease-in-out for hover effects

---

**Design System Version**: 1.0  
**Last Updated**: April 2026  
**Cricket Support Team**
