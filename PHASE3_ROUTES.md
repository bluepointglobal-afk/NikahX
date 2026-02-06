# Phase 3 Routes - Quick Reference

Complete routing table for NikahX Phase 3 features.

## 🗺️ All Application Routes

### Authentication Routes
| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/auth` | Auth | Public | Login/signup page |
| `/verify-email` | VerifyEmail | Public | Email verification |

### Onboarding Routes
| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/onboarding/profile` | OnboardingProfile | Protected | Profile setup |
| `/onboarding/preferences` | OnboardingPreferences | Protected | Match preferences |
| `/onboarding/wali` | OnboardingWaliInvite | Protected | Guardian invite |
| `/onboarding/complete` | OnboardingComplete | Protected | Onboarding completion |

### Core Routes (Phase 1 & 2)
| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/home` | Home | Protected | Dashboard/home page |
| `/discover` | Discovery | Protected | Profile discovery (original) |
| `/premium` | Premium | Protected | Premium upgrade page |
| `/subscription/success` | SubscriptionSuccess | Protected | Payment success |
| `/account/subscription` | Subscription | Protected | Manage subscription |

### Phase 3 Routes ✨ NEW
| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/swipe` | SwipePage | Protected | Tinder-style swipe interface |
| `/matches` | MatchesPage | Protected | List of active conversations |
| `/chat/:matchId` | ChatPage | Protected | 1:1 messaging interface |
| `/family-panel` | FamilyPanel | Protected (Wali) | Guardian dashboard |
| `/mahr-calculator` | MahrCalculator | Protected | 6-step mahr calculator |
| `/firasa/:userId` | FirasaPage | Protected | Compatibility report |
| `/mufti-ai` | MuftiAI | Protected | Islamic guidance chatbot |

### Special Routes
| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/` | Navigate | Public | Redirects to `/auth` |

---

## 🔗 Route Parameters

### Dynamic Parameters
- `:matchId` - UUID of the match (used in `/chat/:matchId`)
- `:userId` - UUID of the target user (used in `/firasa/:userId`)

### Example Usage
```typescript
// Navigate to specific chat
navigate(`/chat/123e4567-e89b-12d3-a456-426614174000`);

// Navigate to compatibility report
navigate(`/firasa/987fcdeb-51a2-43f8-b9c4-123456789abc`);
```

---

## 🔒 Protection Levels

### Public Routes
- No authentication required
- Accessible to all visitors
- Examples: `/auth`, `/verify-email`

### Protected Routes
- Authentication required
- Redirects to `/auth` if not logged in
- Most routes fall into this category

### Role-Protected Routes
- Authentication + specific role required
- Example: `/family-panel` (wali-only)
- Displays access denied if wrong role

---

## 🧭 Navigation Flow

### New User Journey
```
/auth → /verify-email → /onboarding/profile → /onboarding/preferences 
  → /onboarding/wali → /onboarding/complete → /home
```

### Typical User Flow
```
/home → /swipe → (mutual match) → /chat/:matchId → /matches
```

### Guardian Flow
```
/home → /family-panel → (approve match) → /matches (ward's view)
```

### Premium Features
```
/home → /premium → (upgrade) → /subscription/success → /home
```

---

## 📱 Navigation Menu Suggestions

### Main Navigation
```typescript
<nav>
  <Link to="/home">Home</Link>
  <Link to="/swipe">Swipe</Link>
  <Link to="/matches">Matches</Link>
  <Link to="/mufti-ai">Guidance</Link>
</nav>
```

### Tools Menu
```typescript
<menu>
  <Link to="/mahr-calculator">Mahr Calculator</Link>
  <Link to="/firasa/:userId">Compatibility</Link>
</menu>
```

### Guardian Menu (Wali Only)
```typescript
<menu>
  <Link to="/family-panel">Guardian Panel</Link>
</menu>
```

### Account Menu
```typescript
<menu>
  <Link to="/account/subscription">Subscription</Link>
  <Link to="/premium">Upgrade</Link>
</menu>
```

---

## 🎨 Page Titles & Meta

Recommended page titles for SEO and UX:

```typescript
const pageTitles = {
  '/swipe': 'Swipe | NikahX',
  '/matches': 'Your Matches | NikahX',
  '/chat/:matchId': 'Chat | NikahX',
  '/family-panel': 'Guardian Panel | NikahX',
  '/mahr-calculator': 'Mahr Calculator | NikahX',
  '/firasa/:userId': 'Compatibility Report | NikahX',
  '/mufti-ai': 'Mufti AI | NikahX',
};
```

---

## 🔄 Redirects & Guards

### Common Redirects
```typescript
// After login
navigate('/home');

// After mutual match
navigate(`/chat/${matchId}`, { replace: true });

// After wali approval
navigate('/matches');

// Unauthorized access
navigate('/home');

// Premium required
navigate('/premium');
```

### Route Guards
```typescript
// Check if user is wali
if (!isWali) navigate('/home');

// Check premium status
if (!isPremium) navigate('/premium');

// Check daily limits
if (swipeCount >= limit) setError('Limit reached');
```

---

## 🚀 Performance Optimization

### Lazy Loading Routes
```typescript
const SwipePage = lazy(() => import('./pages/SwipePage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const FamilyPanel = lazy(() => import('./pages/FamilyPanel'));
const MahrCalculator = lazy(() => import('./pages/MahrCalculator'));
const FirasaPage = lazy(() => import('./pages/FirasaPage'));
const MuftiAI = lazy(() => import('./pages/MuftiAI'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    {/* ... */}
  </Routes>
</Suspense>
```

### Prefetching
```typescript
// Prefetch likely next routes
const prefetchMatches = () => {
  import('./pages/MatchesPage');
};

const prefetchChat = () => {
  import('./pages/ChatPage');
};
```

---

## 🎯 Analytics Events

Track navigation events:

```typescript
// On route change
analytics.track('page_view', {
  path: location.pathname,
  title: document.title,
});

// On specific actions
analytics.track('navigate_to_swipe');
analytics.track('navigate_to_chat', { matchId });
analytics.track('navigate_to_firasa', { userId });
```

---

## 🐛 Troubleshooting

### Route Not Found
1. Check App.tsx for route definition
2. Verify exact path match
3. Check for typos in path
4. Ensure component is imported

### Protected Route Redirecting
1. Check authentication state
2. Verify token validity
3. Check ProtectedRoute wrapper
4. Inspect auth context

### Dynamic Route Not Working
1. Check parameter name matches
2. Use `useParams()` hook correctly
3. Verify parameter is being passed
4. Check route order (specific before general)

---

## 📚 Route Documentation

Each route should have:

### Component Documentation
```typescript
/**
 * SwipePage - Tinder-style profile swiping interface
 * 
 * Route: /swipe
 * Protection: Authenticated users only
 * 
 * Features:
 * - Profile card display
 * - Like/pass/super like actions
 * - Daily swipe limits (free tier)
 * - Unlimited swipes (premium)
 * - Undo last swipe (premium)
 */
```

### Route Tests
```typescript
describe('SwipePage Route', () => {
  it('should render for authenticated users', () => {});
  it('should redirect unauthenticated users', () => {});
  it('should load profile data', () => {});
  it('should handle swipe actions', () => {});
});
```

---

## 🔮 Future Routes

Planned for Phase 4:

| Route | Description | Priority |
|-------|-------------|----------|
| `/video-call/:matchId` | Video call interface | High |
| `/profile/edit` | Edit user profile | Medium |
| `/notifications` | Notification center | Medium |
| `/settings` | App settings | Low |
| `/help` | Help center | Low |
| `/family-chat/:familyId` | 3-way family chat | High |

---

## 📊 Route Usage Analytics

Track these metrics per route:

- Page views
- Unique visitors
- Average time on page
- Bounce rate
- Conversion rate (where applicable)
- Exit rate

---

## ✅ Route Checklist

When adding a new route:

- [ ] Define route in App.tsx
- [ ] Create component file
- [ ] Add to ProtectedRoute if needed
- [ ] Add navigation links
- [ ] Update this documentation
- [ ] Add analytics tracking
- [ ] Write route tests
- [ ] Update sitemap (if applicable)
- [ ] Add to type definitions
- [ ] Test on all browsers

---

**Routes Version:** Phase 3 v1.0  
**Total Routes:** 22 (15 existing + 7 new)  
**Last Updated:** February 5, 2026
