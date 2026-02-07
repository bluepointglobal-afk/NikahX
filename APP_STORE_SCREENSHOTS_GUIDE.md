# NikahX App Store Screenshots Guide

**Prepared:** 2026-02-07  
**Purpose:** App Store & Marketing Screenshots

## Screenshot Requirements

### iOS App Store (6.5" Display - 1284x2778px)
- 6-10 screenshots required
- Portrait orientation
- Show key app features and value proposition

### Google Play Store (Phone - 1080x1920px min)
- 2-8 screenshots required  
- Portrait or landscape
- Feature graphics optional but recommended

---

## Required Screenshots (Priority Order)

### 1. Landing/Welcome Screen ✅
**Status:** Captured  
**File:** `app-store-screenshots/01-landing-signup.png`  
**Shows:**
- NikahX branding
- "Halal Matchmaking with Dignity" tagline
- Email/password signup form
- Google & Apple social login options
- Privacy message about wali oversight

**Marketing copy suggestion:**  
*"Find your match the halal way. Dignified, private, and family-supervised."*

---

### 2. Onboarding - Profile Creation
**Route:** `/onboarding/profile`  
**Shows:**
- Basic profile information form
- Photo upload
- Islamic values-based fields
- Gender selection with proper hijab

**Marketing copy suggestion:**  
*"Create your authentic Islamic profile. Share what matters most."*

---

### 3. Onboarding - Preferences
**Route:** `/onboarding/preferences`  
**Shows:**
- Match preference settings
- Religious practice level filters
- Location and age preferences
- Halal-specific criteria

**Marketing copy suggestion:**  
*"Set your preferences. Find someone who shares your values."*

---

### 4. Onboarding - Wali Invite
**Route:** `/onboarding/wali-invite`  
**Shows:**
- Wali/guardian invitation flow
- Family involvement features
- Privacy and oversight controls

**Marketing copy suggestion:**  
*"Involve your family from day one. Marriage is a family decision."*

---

### 5. Discovery/Swipe Interface
**Route:** `/swipe` or `/discovery`  
**Shows:**
- Profile cards with Islamic-appropriate photos
- Match criteria display
- Swipe or selection interface
- Halal interaction design

**Marketing copy suggestion:**  
*"Discover compatible matches. Respectful, dignified, halal."*

---

### 6. Matches Page
**Route:** `/matches` or `/matches-stitch`  
**Shows:**
- List of mutual matches
- Match quality indicators
- Communication initiation
- Wali visibility features

**Marketing copy suggestion:**  
*"Your matches. Start conversations with family oversight."*

---

### 7. Chat Interface
**Route:** `/chat` or `/chat/:id`  
**Shows:**
- Halal chat interface
- Message moderation features
- Wali/guardian visibility
- Respectful communication tools

**Marketing copy suggestion:**  
*"Communicate respectfully. Every conversation is visible to guardians."*

---

### 8. Family Panel (Phase 3)
**Route:** `/family-panel`  
**Shows:**
- Wali/guardian dashboard
- Match review interface
- Approval/veto system
- Family communication tools

**Marketing copy suggestion:**  
*"Empower families. Parents and guardians stay involved throughout."*

---

### 9. Premium/Subscription
**Route:** `/premium` or `/subscription`  
**Shows:**
- Premium features
- Pricing tiers
- Value proposition
- Halal monetization (no ads, ethical pricing)

**Marketing copy suggestion:**  
*"Unlock premium features. Quality matchmaking deserves quality tools."*

---

### 10. Success Stories / Testimonials (Optional)
**Custom Page/Modal**  
**Shows:**
- Real user testimonials (with permission)
- Success metrics
- Community trust indicators

**Marketing copy suggestion:**  
*"Join thousands finding their halal match. Real stories, real nikah."*

---

## Screenshot Capture Instructions

### For Web App (Current):
1. Start dev server: `cd frontend-test && npm run dev`
2. Navigate to http://localhost:5173
3. Create test account with wali oversight enabled
4. Complete onboarding flow
5. Navigate to each route above
6. Capture full-screen screenshots (1284x2778 for iOS)
7. Save to `app-store-screenshots/` directory

### For Mobile App (Future):
- Use iOS Simulator at 6.5" (iPhone 14 Pro Max)
- Use Android Emulator at 1080x1920
- Capture using native screenshot tools
- Ensure proper resolution and DPI

---

## Design Guidelines

### Visual Consistency
- Use Islamic-appropriate imagery (no intimate photos)
- Maintain modest, professional aesthetic
- Consistent color scheme (emerald green, dark navy)
- Clear, readable typography

### Content Rules
- All profile photos must be modest and halal-appropriate
- No suggestive language or imagery
- Emphasize family, values, and dignity
- Show real (anonymized) content where possible

### App Store Optimization (ASO)
- First 2-3 screenshots are most important (shown in search results)
- Use text overlays to explain features clearly
- Show unique value proposition early
- Highlight Islamic/halal differentiation

---

## Next Steps

1. ✅ Document screenshot requirements (this file)
2. [ ] Create test account with full profile
3. [ ] Navigate through all flows and capture screenshots
4. [ ] Resize/optimize for iOS App Store (1284x2778px)
5. [ ] Resize/optimize for Google Play Store (1080x1920px min)
6. [ ] Add text overlays with marketing copy
7. [ ] Review for Islamic appropriateness
8. [ ] Submit for Architect approval

---

## Files

**Screenshot directory:** `app-store-screenshots/`

**Captured:**
- ✅ `01-landing-signup.png` - Landing/welcome screen

**Pending:**
- [ ] `02-onboarding-profile.png`
- [ ] `03-onboarding-preferences.png`
- [ ] `04-onboarding-wali.png`
- [ ] `05-discovery-swipe.png`
- [ ] `06-matches-list.png`
- [ ] `07-chat-interface.png`
- [ ] `08-family-panel.png`
- [ ] `09-premium-features.png`
- [ ] `10-testimonials.png` (optional)

---

**Status:** Ready for screenshot capture session  
**Blocker:** Requires authenticated session or mock data  
**Recommendation:** Manual capture session with Architect or automated Playwright script
