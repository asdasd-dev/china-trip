# Roadmap: china-trip PWA Polish

**Created:** 2026-04-23
**Milestone:** Pre-trip polish (deadline: May 12, 2026)
**Granularity:** Coarse (3-5 phases)
**Coverage:** 11/11 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Infrastructure & Bugs** — Fix force-reload bug, extract getScrollKey(), audit SW cache and visual bugs
- [ ] **Phase 2: Today Home Screen** — New default landing page showing current trip day, date, and today's plan summary
- [ ] **Phase 3: Plan Navigation** — Day-pill strip and "Go to today" button in the Plan tab
- [ ] **Phase 4: Nav & Final Polish** — Tab order, labels, SW precache verification, offline pass

---

## Phase Details

### Phase 1: Infrastructure & Bugs

**Goal**: The app is stable — no spurious reloads, scroll state is reliable, no visible UI regressions
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01, BUG-02, BUG-03, PERF-01
**Success Criteria** (what must be TRUE):
  1. Switching to another browser tab and back does not trigger a force-reload of the app
  2. Navigating between all pages and back preserves scroll position correctly for each page
  3. A visual audit pass finds no broken layouts, clipped text, or misaligned elements on any page
  4. SW cache manifest includes all current JS, MD, and asset files — DevTools offline mode shows every page loading
**Plans:** 2 plans
Plans:
- [ ] 01-PLAN-infrastructure-fixes.md — Extract getScrollKey(), verify version sync, audit SW precache
- [ ] 01-PLAN-visual-audit.md — Systematic visual audit of all pages/subtabs, fix any bugs found

---

### Phase 2: Today Home Screen

**Goal**: Opening the app immediately shows what's happening today — no navigation required
**Depends on**: Phase 1 (getScrollKey() must be extracted before adding Today page)
**Requirements**: HOME-01, HOME-02, HOME-03, NAV-01
**Success Criteria** (what must be TRUE):
  1. Opening the app shows a "Today" screen as the default landing page — not the Plan tab
  2. During the trip (May 12–26), the screen displays the correct trip day number ("День N из 15"), today's date formatted in Russian, and 3–4 bullet summary of today's plan
  3. Before the trip starts, the screen shows a countdown ("X дней до поездки") instead of the day summary
  4. A single tap on the today content opens the full Plan tab scrolled to the current day's section
  5. "Today" tab is visible in the bottom nav bar and is the active tab on app launch
**Plans**: TBD

---

### Phase 3: Plan Navigation

**Goal**: Users can jump to any specific day in the plan instantly — no manual scrolling through the full document
**Depends on**: Phase 2
**Requirements**: PLAN-01, PLAN-02
**Success Criteria** (what must be TRUE):
  1. A horizontal scrollable row of day pills appears above the plan content, showing all 15 trip days
  2. Tapping any day pill scrolls the plan directly to that day's section without manual scrolling
  3. Today's day pill is visually highlighted so the current day is immediately obvious
  4. A "Сегодня" button scrolls the plan to the current day when the current day's section is off-screen
**Plans**: TBD

---

### Phase 4: Nav & Final Polish

**Goal**: Navigation labels are clear, tab order matches trip usage flow, and offline reliability is verified for China conditions
**Depends on**: Phase 3
**Requirements**: NAV-02, PERF-01 (final offline verification pass)
**Success Criteria** (what must be TRUE):
  1. All bottom nav tabs have both an icon and a text label — no icon-only tabs
  2. Tab order matches the trip usage scenario: Сегодня → План → Explore → Разговорник → Чеклист
  3. Every page and subtab loads correctly in DevTools offline mode after SW cache update
  4. SW CACHE_FILES array is updated to include all assets added during Phases 1–3
**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Bugs | 0/2 | Planned | — |
| 2. Today Home Screen | 0/? | Not started | — |
| 3. Plan Navigation | 0/? | Not started | — |
| 4. Nav & Final Polish | 0/? | Not started | — |

---

## Coverage Map

| Requirement | Phase | Notes |
|-------------|-------|-------|
| BUG-01 | Phase 1 | Extract getScrollKey() — prerequisite for Phase 2 |
| BUG-02 | Phase 1 | Already fixed in 3.42 (version.txt synced) |
| BUG-03 | Phase 1 | Visual audit pass |
| PERF-01 | Phase 1 + Phase 4 | SW audit in Phase 1; final offline pass in Phase 4 |
| HOME-01 | Phase 2 | Core Today screen |
| HOME-02 | Phase 2 | Countdown state (before trip) |
| HOME-03 | Phase 2 | Tap to open plan at current day |
| NAV-01 | Phase 2 | Today tab added as default landing page |
| PLAN-01 | Phase 3 | Day-pill navigation strip |
| PLAN-02 | Phase 3 | "Сегодня" button |
| NAV-02 | Phase 4 | Tab order and labels |

---
*Roadmap created: 2026-04-23*
*Last updated: 2026-04-23 — Phase 1 plans created*
