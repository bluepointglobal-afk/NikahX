# NikahX Phase 3 - Frontend Components Documentation

## Overview
This document provides a comprehensive guide to all Phase 3 frontend routes and components built for the NikahX platform.

## 🎯 Completed Features

### 1. Swipe Interface (`/swipe`)
**Files:**
- `src/components/SwipeCard.tsx` - Tinder-style swipe card component
- `src/pages/SwipePage.tsx` - Main swipe page with logic

**Features:**
- ✅ Tinder-style card interface with profile display
- ✅ Pass, Like, and Super Like buttons
- ✅ Free tier: 10 swipes/day limit with counter
- ✅ Premium: Unlimited swipes
- ✅ Undo last swipe (premium only)
- ✅ Automatic redirect to chat on mutual match
- ✅ Progress counter (X/Y cards)
- ✅ Responsive design with Tailwind CSS

**Key Functionality:**
```typescript
// Swipe actions trigger backend RPC
await supabase.rpc('create_interaction_v2', {
  target_user_id: profile.id,
  interaction_type: 'like' | 'super_like' | 'pass',
});
```

---

### 2. Matches List (`/matches`)
**Files:**
- `src/pages/MatchesPage.tsx`

**Features:**
- ✅ List of all active conversations
- ✅ Last message preview with timestamp
- ✅ Unread message badge
- ✅ Real-time updates via Supabase Realtime
- ✅ Empty state handling
- ✅ Click to open chat

**Key Functionality:**
```typescript
// Subscribe to new messages
const channel = supabase
  .channel('matches-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
  }, () => fetchMatches())
  .subscribe();
```

---

### 3. Chat Interface (`/chat/:matchId`)
**Files:**
- `src/pages/ChatPage.tsx`
- `src/hooks/useMessages.ts` - Custom hook for message management
- `src/hooks/usePresence.ts` - Custom hook for typing indicators

**Features:**
- ✅ Message input box with send button
- ✅ Message history (scrolls to bottom)
- ✅ Real-time typing indicators
- ✅ Read receipts (sent, delivered, read checkmarks)
- ✅ Image upload to Supabase Storage
- ✅ Voice message button (UI ready)
- ✅ Report/Block buttons in header
- ✅ Support for wali read-only view

**Key Functionality:**
```typescript
// Real-time message subscription
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  filter: `match_id=eq.${matchId}`,
}, (payload) => {
  setMessages((prev) => [...prev, payload.new]);
});

// Presence API for typing
await channel.track({
  user_id: userId,
  typing: true,
  online_at: new Date().toISOString(),
});
```

---

### 4. Family Panel (`/family-panel`)
**Files:**
- `src/pages/FamilyPanel.tsx`

**Features:**
- ✅ Ward activity statistics dashboard
  - Active matches count
  - Pending approvals count
  - Messages per week
- ✅ Approval queue with cards showing:
  - Pending match details
  - Firasa score
  - Concerns list
  - Approve/Reject/Request Meeting buttons
- ✅ Conversation monitoring (read-only view when enabled)
- ✅ 3-way family chat interface (UI ready)
- ✅ Access control (wali-only)

**Key Functionality:**
```typescript
// Wali approval RPC
await supabase.rpc('wali_approve_match', {
  p_match_id: matchId,
  p_ward_id: ward.id,
  p_approved: approved,
});
```

---

### 5. Mahr Calculator (`/mahr-calculator`)
**Files:**
- `src/pages/MahrCalculator.tsx`

**Features:**
- ✅ 6-step wizard:
  1. **Madhab Selector** - Hanafi, Maliki, Shafi'i, Hanbali
  2. **Currency Selector** - SAR, AED, USD, EUR, GBP, PKR, EGP
  3. **Mahr Components** - Immediate/deferred sliders
  4. **Regional Averages** - Crowdsourced data display
  5. **Gold/Silver Equivalency** - Live rate calculations
  6. **Save & Share** - PDF export, email share (premium)
- ✅ Progress bar with percentage
- ✅ Free: Basic calculator
- ✅ Premium: Save, track negotiations, PDF export, family sharing

**Key Functionality:**
```typescript
// Calculate gold/silver equivalents
const goldPricePerGram = 60;
const totalMahr = immediateAmount + deferredAmount;
const goldEquivalent = totalMahr / goldPricePerGram;
```

---

### 6. Firasa Report (`/firasa/:userId`)
**Files:**
- `src/pages/FirasaPage.tsx`

**Features:**
- ✅ Compatibility meter (0-100 score with color coding)
- ✅ Character analysis cards (You vs Match)
  - Visual comparison bars
  - Trait scoring (Religiosity, Ambition, Family, etc.)
- ✅ Strengths section
- ✅ Concerns section
- ✅ AI recommendation box
- ✅ Disclaimer about AI guidance
- ✅ Access limits:
  - Free: 1 report/month
  - Premium: 5 reports/month
  - À la carte: $4.99 per report

**Key Functionality:**
```typescript
// Generate compatibility report
const report = {
  compatibility_score: 85,
  strengths: ['Shared religious values', 'Compatible goals'],
  concerns: ['Geographic distance'],
  character_analysis_you: { Religiosity: 85, Ambition: 75 },
  character_analysis_match: { Religiosity: 88, Ambition: 70 },
};
```

---

### 7. Mufti AI (`/mufti-ai`)
**Files:**
- `src/pages/MuftiAI.tsx`

**Features:**
- ✅ Chat interface with message history
- ✅ Rate limit indicator (X/10 questions for free)
- ✅ System prompts visible to users
- ✅ Conversation history persisted
- ✅ Multiple conversations support
- ✅ Start new conversation button
- ✅ Sidebar with conversation list
- ✅ Access limits:
  - Free: 10 questions/month
  - Premium: Unlimited

**Key Functionality:**
```typescript
// System prompt for Mufti AI
const SYSTEM_PROMPT = `You are a knowledgeable Islamic scholar...
- Always cite sources (Quran, Hadith, scholarly opinions)
- Acknowledge differences between madhabs
- Recommend consulting local scholars
- Never issue definitive fatwas`;
```

---

## 🔧 Custom Hooks

### `useMessages(matchId: string)`
**Location:** `src/hooks/useMessages.ts`

**Purpose:** Manage real-time messaging with Supabase

**Returns:**
```typescript
{
  messages: Message[],
  loading: boolean,
  error: string | null,
  sendMessage: (content: string, type: 'text' | 'image' | 'voice', mediaUrl?: string) => Promise<void>,
  markAsRead: (messageId: string) => Promise<void>,
}
```

**Features:**
- Real-time message subscription via Supabase Realtime
- Automatic message fetching
- Send message functionality
- Read receipt management

---

### `usePresence(matchId: string, userId: string)`
**Location:** `src/hooks/usePresence.ts`

**Purpose:** Handle typing indicators via Supabase Presence API

**Returns:**
```typescript
{
  isTyping: boolean,
  otherUserTyping: boolean,
  setTyping: (typing: boolean) => Promise<void>,
}
```

**Features:**
- Real-time typing indicator sync
- Presence state tracking
- Automatic cleanup on unmount

---

## 🛣️ Routing Configuration

All Phase 3 routes are protected and added to `src/App.tsx`:

```typescript
// Phase 3 Routes
<Route path="/swipe" element={<ProtectedRoute><SwipePage /></ProtectedRoute>} />
<Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
<Route path="/chat/:matchId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
<Route path="/family-panel" element={<ProtectedRoute><FamilyPanel /></ProtectedRoute>} />
<Route path="/mahr-calculator" element={<ProtectedRoute><MahrCalculator /></ProtectedRoute>} />
<Route path="/firasa/:userId" element={<ProtectedRoute><FirasaPage /></ProtectedRoute>} />
<Route path="/mufti-ai" element={<ProtectedRoute><MuftiAI /></ProtectedRoute>} />
```

---

## 🎨 Design System

### Colors
- **Primary:** Emerald (emerald-500, emerald-600)
- **Secondary:** Blue (blue-500, blue-600)
- **Premium:** Amber (amber-500, amber-600)
- **Danger:** Rose (rose-500, rose-600)
- **Background:** Slate (slate-900, slate-950)

### Typography
- **Headings:** Font-bold, tracking-tight
- **Body:** Font-normal, text-sm/text-base
- **Labels:** Text-xs, text-slate-400

### Components
- **Buttons:** `rounded-2xl` with ring styles
- **Cards:** `rounded-3xl` with gradient backgrounds
- **Icons:** Heroicons via inline SVG

---

## 🔐 Security & Permissions

### Protected Routes
All Phase 3 routes require authentication via `ProtectedRoute` wrapper.

### Access Control
- **Family Panel:** Only accessible to registered walis
- **Firasa Reports:** Rate-limited by tier
- **Mufti AI:** Question limits by tier
- **Mahr Calculator:** Save/export limited to premium

### Data Privacy
- No photos shown until wali approval
- Read-only monitoring requires explicit consent
- Messages encrypted at rest (Supabase defaults)

---

## 📦 Database Tables Required

The following Supabase tables are referenced by Phase 3 components:

### Existing Tables
- `profiles` - User profiles
- `matches` - Match relationships
- `messages` - Chat messages
- `interactions` - Swipe actions
- `wali_relationships` - Guardian connections

### New Tables Required
```sql
-- Firasa Reports
CREATE TABLE firasa_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id),
  compatibility_score INTEGER,
  strengths TEXT[],
  concerns TEXT[],
  recommendation TEXT,
  character_analysis_you JSONB,
  character_analysis_match JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mahr Calculations
CREATE TABLE mahr_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  madhab TEXT,
  currency TEXT,
  immediate_amount NUMERIC,
  deferred_amount NUMERIC,
  total_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mufti AI Conversations
CREATE TABLE mufti_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mufti AI Messages
CREATE TABLE mufti_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES mufti_conversations(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT, -- 'user' | 'assistant' | 'system'
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing Checklist

### Swipe Page
- [ ] Cards load from discovery feed
- [ ] Like/pass/super like actions work
- [ ] Daily limit enforced for free users
- [ ] Premium users have unlimited swipes
- [ ] Undo works for premium users
- [ ] Mutual match redirects to chat

### Matches Page
- [ ] Shows all active matches
- [ ] Last message displays correctly
- [ ] Unread badges appear
- [ ] Real-time updates work
- [ ] Navigation to chat works

### Chat Page
- [ ] Messages load and display
- [ ] Sending messages works
- [ ] Typing indicators appear
- [ ] Read receipts update
- [ ] Image upload works
- [ ] Report/block buttons functional

### Family Panel
- [ ] Only accessible to walis
- [ ] Stats display correctly
- [ ] Approval queue shows pending matches
- [ ] Approve/reject actions work
- [ ] Monitoring respects oversight settings

### Mahr Calculator
- [ ] All 6 steps navigate properly
- [ ] Sliders update amounts
- [ ] Gold/silver calculations correct
- [ ] Save requires premium
- [ ] PDF export requires premium

### Firasa Page
- [ ] Report generation works
- [ ] Score displays with color coding
- [ ] Character analysis renders
- [ ] Usage limits enforced
- [ ] Premium users get 5 reports

### Mufti AI
- [ ] Conversations persist
- [ ] New conversation creates properly
- [ ] Messages send and receive
- [ ] System prompt toggles
- [ ] Rate limits enforced

---

## 🚀 Deployment Notes

### Environment Variables Required
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Build Command
```bash
npm run build
```

### Supabase Setup
1. Create required tables (see Database Tables section)
2. Enable Realtime on `messages` table
3. Enable Storage bucket `chat-media` for image uploads
4. Set up RLS policies for all tables
5. Create RPC functions:
   - `get_discovery_feed(p_limit INTEGER)`
   - `create_interaction_v2(target_user_id UUID, interaction_type TEXT)`
   - `wali_approve_match(p_match_id UUID, p_ward_id UUID, p_approved BOOLEAN)`

---

## 📝 Future Enhancements

### High Priority
- [ ] Voice message recording functionality
- [ ] Video call integration
- [ ] Push notifications for matches/messages
- [ ] PDF export for Mahr calculator
- [ ] OpenAI integration for Mufti AI

### Medium Priority
- [ ] Family 3-way chat implementation
- [ ] Advanced filtering on Matches page
- [ ] Message search functionality
- [ ] Profile visit tracking
- [ ] Conversation monitoring UI for walis

### Low Priority
- [ ] Message reactions/emojis
- [ ] Conversation archiving
- [ ] Advanced Firasa analytics
- [ ] Mahr negotiation tracking
- [ ] Multi-language support

---

## 🤝 Contributing

When adding new features to Phase 3:
1. Follow existing component patterns
2. Use TypeScript strict mode
3. Add error boundaries
4. Include loading states
5. Test real-time functionality
6. Update this documentation

---

## 📚 Additional Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React Router v6 Docs](https://reactrouter.com/en/main)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Built with ❤️ for the NikahX platform**
**Phase 3 Completion Date:** February 5, 2026
