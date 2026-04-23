# Feature Landscape

**Domain:** Personal travel companion PWA — single-user, self-organized, fixed itinerary
**Researched:** 2026-04-23
**Context:** Brownfield polish project. App is feature-complete in content. Problem is UX, not content coverage. Trip in 2 weeks.

---

## Framing: What Kind of App Is This?

This is not a *planning* app (trip is already planned). Not a *discovery* app (places are already chosen). It is a **trip execution assistant** — the traveler opens it while standing somewhere to answer one of four questions:

1. What are we doing today / next?
2. What do I say to this person?
3. Where is this place and what do I know about it?
4. Did I pack/handle that thing?

Every feature decision flows from this framing.

---

## Table Stakes

Features users expect from a trip execution assistant. Missing = app fails at its core job.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Today screen — "Day X of Y"** | First thing opened every morning. Must answer "what's today?" without any navigation. | Med | Core gap identified in PROJECT.md (HOME-01). Show: trip day number, date, city, 3-4 key events for today pulled from plan.md |
| **Auto-scroll / jump to today in plan** | Plan.md is long. Nobody scrolls a long doc to find today. Every calendar and note app that has this problem solves it with a single button or auto-open. | Low | Obsidian, Google Calendar, Apple Calendar all implement this. A `#day-5` anchor + scroll-to it on load is enough. |
| **Day-segmented plan navigation** | Scannable day list → tap → jump to that day. Bottom sheet or TOC drawer. Without this, plan.md is just a text wall. | Med | Strip existing markdown H2/H3 headings, render as a tappable index. |
| **Tab labels + icons** | Bottom nav tabs must have both icon AND text label. Icon-only tabs tested 40% worse in comprehension studies. Current app: unknown state. | Low | Apple HIG + Material both mandate this. Verify current implementation. |
| **5 tabs max / group overflow** | Current app has: Plan, Checklist, Budget, Explore (2 subtabs), Translate (3 subtabs) = 5 top-level + 5 subtab destinations. That is at the limit. No more tabs. | Low | Airbnb found 40% faster task completion with tab bar vs hamburger. |
| **Offline fallback that is obvious** | PWA is already offline-capable via SW. But user must *know* it works offline before panicking. A subtle "offline" badge or "cached" indicator prevents the panic. | Low | Particularly important in China — Great Firewall context. |
| **One-tap translate access** | In a moment of needing translation, every extra tap is painful. Translate must be reachable in 1 tap from anywhere. | Low | Already exists as a tab; verify it is visible without scrolling. |

---

## Differentiators

Features that go beyond baseline. Not expected, but high-value given this specific context (first-time travelers, China, fixed itinerary, couple).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Trip progress indicator on home screen** | "Day 4 of 11 — Shanghai" gives immediate orientation and emotional satisfaction. Removes anxiety of "are we on schedule?" | Low | Compute from trip start date (hardcoded in JS) + `new Date()`. No API needed. |
| **Today summary card (3-line teaser)** | Show 3-4 bullet points from today's plan.md section on the home screen without requiring navigation. | Med | Parse plan.md H2 for day headers, extract first N list items. Display as compact card. Most impactful single UX improvement. |
| **"Go to today" FAB / button in Plan tab** | Floating action button or sticky pill that scrolls plan.md to today's section. Pattern from Obsidian, Apple Calendar, Google Calendar. | Low | Anchor tag `id="day-N"` on each day heading + scroll on tap. Show only when not already at today's section. |
| **Day pill navigation in Plan tab** | Horizontal scroll row of day pills (Day 1, Day 2 … Day N) above plan content. Tap → jump instantly. | Low-Med | Eliminate need to read the full markdown TOC. Works with existing `tabScrollY` persistence. |
| **Phrasebook category badges / quick-access** | Pin "most used" phrases (greetings, asking price, getting taxi) to top of phrasebook without hunting through categories. | Low | Just reorder categories array; put Essentials/Transport first. |
| **Places "I'm here" highlight** | When user taps a place in places.md, the detail view looks like a quick-reference card, not a prose paragraph. Key info (address in Chinese, hours, metro stop) is scannable in 2 seconds. | Med | Depends on places.md structure. May require content formatting, not code. |

---

## Anti-Features

Features to explicitly NOT build for this project.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time expense tracking / input** | Out of scope per PROJECT.md. Adds complexity, Firebase writes, UI for data entry. Trip is 2 weeks. | Budget viewer is sufficient. Show planned budget only. |
| **GPS / location detection** | Location context-switching (auto-detect where user is) sounds great but requires permissions, battery drain, fallback handling, and China location data accuracy is poor. Adds complexity with no guaranteed payoff. | User navigates manually; app responds to their tap. |
| **Push notifications** | Out of scope per PROJECT.md. PWA push requires service worker subscription, user opt-in, server-side scheduling. Adds 3+ hours for marginal value. | Today screen answers "what's now?" without needing a push. |
| **AR overlays / camera translation** | Massively out of scope. Google Translate app does this better. | Deep link to Google Translate already implemented. |
| **Collaborative multi-user sync** | Firebase is used for checklist only. Adding multi-user sessions or real-time co-editing is out of scope for a personal app. | Single user + single device is the reality. |
| **Itinerary editing / drag-and-drop reorder** | This is a *planning* feature. Trip is already planned. Editing plan.md during the trip creates inconsistency and bugs. | plan.md is read-only. Checklist handles the mutable state. |
| **AI chat assistant / chatbot** | High complexity, requires API calls, unreliable in China (OpenAI blocked), and adds latency. The phrasebook + search covers 95% of language needs offline. | Phrasebook + full-text search already implemented. |
| **Onboarding / tutorial overlay** | App is used by one person who built it. Not a product for strangers. Tutorial adds clutter. | Good labels and obvious nav are enough. |
| **More tabs** | Already at cognitive limit (5 top-level). Every new tab raises the mental overhead for both navigation targets. | Merge or nest new content into existing sections. |

---

## Feature Dependencies

```
TODAY SCREEN (HOME-01)
  └── Requires: trip start/end dates hardcoded in JS
  └── Requires: plan.md parsed for today's day section
  └── Requires: day heading format standardized in plan.md

DAY NAVIGATION (PLAN-01)
  └── Requires: plan.md day headings follow consistent format (e.g., ## Day N: ...)
  └── Enables: "Go to today" FAB (just scroll to computed day anchor)
  └── Enables: Day pill nav row

TODAY SUMMARY CARD
  └── Requires: DAY NAVIGATION (needs day-heading parser)
  └── Requires: plan.md has structured list items under each day heading

NAV SIMPLIFICATION (NAV-01)
  └── Does NOT require content changes
  └── Requires: audit of current tab labels/icons
  └── Constraint: cannot reduce below 5 tabs without hiding content
```

---

## MVP Recommendation

Given the 2-week deadline and "polish not build" mandate, prioritize in this order:

**Must ship (highest user impact, lowest risk):**

1. **Today screen / home** (HOME-01) — single card: "Day 4 of 11 · Shanghai · [3 bullets from plan]". Most impactful single change. Requires: trip dates constant + plan.md parser for today's section.
2. **"Go to today" button in Plan tab** (PLAN-01 partial) — FAB or sticky pill. 2-3 hours. Removes the #1 navigation frustration.
3. **Day pill navigation in Plan tab** (PLAN-01 full) — horizontal scroll row. Completes the plan navigation story.
4. **Nav label audit** (NAV-01) — verify all tabs have icon + text. Fix any that are icon-only or ambiguous.

**Should ship (medium impact, low complexity):**

5. **Phrasebook quick-access reorder** — put Essentials/Taxi/Food first. 30 minutes. Zero risk.
6. **Offline indicator** — subtle badge on nav or settings. 1 hour.

**Defer (complex, lower trip-time value):**

7. **Places "I'm here" card** — depends on places.md formatting. Do only if content permits without major rewrite.
8. **BUG-01 / PERF-01** — these are audit items, not features. Run separately.

---

## Research Notes on Specific Questions

### Q1: What do the best travel companion PWAs do for their "today" screen?
Evidence from TripIt, PlanPlanGo, AXUS: the "today" view surfaces automatically — no navigation required. It shows the active day, highlights what's next, and provides a quick progress read. For a fixed-itinerary personal app, the equivalent is a computed "Day N of M" header + today's plan snippet. No dynamic content needed. (MEDIUM confidence — based on feature descriptions, not UX teardowns.)

### Q2: "I'm standing at a place, what do I need?" moment
Research on contextual UX is unanimous: the answer is NOT GPS auto-detection for a simple personal app. The answer is making manual navigation to a place take under 3 taps and presenting place detail as a scannable card (address in Chinese, metro, hours) — not prose. The existing Chinese character overlay already handles the "read this sign" case. (MEDIUM confidence.)

### Q3: Navigation patterns for 5-6 sections in a mobile PWA
Bottom tab bar with 3-5 items is the gold standard. Icon + text label required. 5 tabs is the maximum before cognitive overload. Current app is at exactly 5 top-level tabs — do not add more. Airbnb case study: tab bar → 40% faster task completion vs hamburger menu. (HIGH confidence — multiple sources, aligns with Apple HIG and Material Design.)

### Q4: Biggest UX impact for non-technical travelers
In order: (1) clear entry point / home screen — remove the "where do I start?" confusion, (2) reduce tap depth to critical content, (3) legible typography / contrast, (4) icon + label pairing on all interactive elements. Notifications, AI, AR are irrelevant at this scope. (HIGH confidence.)

### Q5: "Day X of Y" tracking and quick access to today's plan
Pattern is universal in calendar and journal apps: compute current day from hardcoded trip start date, display prominently on home/today screen, and provide a single-tap "jump to today" in the plan view. Obsidian, Apple Calendar, Google Calendar, TripIt all use this. Implementation: `Math.floor((Date.now() - TRIP_START) / 86400000) + 1`. (HIGH confidence — well-established pattern, trivial to implement.)

---

## Sources

- [Mobile Travel App UX Patterns — pixso.net](https://pixso.net/tips/travel-app-ui/)
- [Mobile Navigation UX Best Practices 2026 — designstudiouiux.com](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Bottom Navigation Bar Complete Guide 2025 — appmysite.com](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [TripIt vs Wanderlog comparison — volunteerfdip.org](https://www.volunteerfdip.org/comparison/tripit-vs-wanderlog)
- [PlanPlanGo — itinerary today view patterns](https://planplango.com/)
- [Designing for Context: Location-Based UX — sennalabs.com](https://sennalabs.com/blog/designing-for-context-location-based-ux-in-mobile-apps)
- [Travel UX Design Trends — g-co.agency](https://www.g-co.agency/insights/travel-ux-design-trends-elevating-travel-app-website-ux)
- [Obsidian Daily Note Navbar plugin — obsidianstats.com](https://www.obsidianstats.com/plugins/daily-note-navbar)
- [Mobile Navigation Patterns 2026 — phone-simulator.com](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)
- [UX Collective: Travel app itinerary case study — medium.com](https://medium.com/design-bootcamp/a-travel-app-for-itineraries-to-fit-your-time-and-budget-a-ux-ui-case-study-ff6ee5184afa)
