# Research Summary — china-trip PWA Polish

**Synthesized:** 2026-04-23
**Deadline:** 2 weeks (trip starts May 12, 2026)
**Scope:** Brownfield UX polish — vanilla JS SPA, no build step, no framework

---

## Executive Summary

This is a **trip execution assistant**, not a planning or discovery app. The trip is already planned; the app's job is to answer four questions in the field: what are we doing today, what do I say, where is this place, did I handle that. The current app has all the content but fails at the entry-point UX: opening it shows Plan (a long markdown document), not a "here is today" summary. The single highest-impact change is adding a Today home screen that shows day number, date, and today's plan snippet — all derivable from data already in the app.

The codebase is in excellent shape for this work. Every pattern needed already exists: `findTodayH2()` for date parsing, `pageCache` for in-memory content, the `renderSettings()` model for JS-rendered virtual pages, city-nav pills for anchor navigation, and `loadPage()` as the universal router. All four planned features (Today screen, plan day navigation, nav reorder, bug fixes) are extensions of existing patterns, not new architecture. Zero new dependencies are needed or acceptable — the trip happens in China where CDN availability is uncertain.

The main risks are not technical complexity but execution discipline: a triple-sync bug (`version.txt` vs `APP_VERSION` vs SW `VERSION`) is already causing force-reloads on every app focus and must be fixed first. The UTC vs. local date arithmetic pitfall will silently show the wrong day if ISO date strings are used. And duplicate rendering code in two branches of `loadPage` means plan navigation changes must be applied carefully to avoid a silent regression on Explore pages.

---

## Key Findings

### Stack (from STACK.md)

| Technology | Decision |
|------------|----------|
| Vanilla JS ES2022+ | Keep as-is. Hard constraint. No framework. |
| `Date` with UTC arithmetic | Use for all date math. Never parse ISO date strings with `new Date('YYYY-MM-DD')`. |
| `Intl.DateTimeFormat('ru', ...)` | Use for display formatting on Today screen. Already supported everywhere. |
| Lucide 0.525.0 (already loaded) | `calendar-days` icon available for Today tab. No CDN update needed. |
| Day.js / date-fns / Temporal | Do not add. Overkill for a 15-day trip with a fixed start date. |
| Any new CDN script | Do not add. China network + SW cache complexity. |

**Critical version note:** Trip runs May 12 – May 26, 2026. Hardcode these as `new Date(2026, 4, 12)` (month 0-indexed), not as ISO strings.

---

### Features (from FEATURES.md)

**Must ship (table stakes):**

1. **Today screen "Day X of Y"** — core gap, highest single UX impact. Card showing: trip day number, date, city, 3-4 bullets from today's plan section.
2. **"Go to today" button in Plan tab** — FAB or sticky pill. Every calendar app has this. ~2–3 hours.
3. **Day pill navigation in Plan tab** — horizontal scroll row of day pills above plan content. Eliminates the "text wall" problem.
4. **Nav label audit** — verify all tabs have icon + text. Fix any icon-only tabs.

**Should ship (differentiators):**

5. **Trip progress indicator** — "Day 4 of 11 · Shanghai" on Today screen. Low complexity, high emotional payoff.
6. **Phrasebook reorder** — move Essentials/Transport/Food categories to top. 30 minutes. Zero risk.
7. **Offline indicator** — subtle badge when offline. Critical for China / Great Firewall context.

**Defer to post-trip or skip:**

- Places "I'm here" card — depends on places.md formatting, higher content risk
- GPS / location detection — complexity + China maps accuracy issues
- Push notifications — out of scope
- Any new tabs — already at cognitive limit (5 top-level)

---

### Architecture (from ARCHITECTURE.md)

**Four key extension points, all low-risk:**

| Feature | Where | Pattern |
|---------|-------|---------|
| Today page | Add `{ file: 'today' }` to `PAGES[0]`, add `if (file === 'today') renderToday(el)` branch | Identical to `renderSettings()` |
| Today content extraction | `renderToday()` calls `pageCache.get('plan.md')` → `marked.parse()` → `findTodayH2()` → DOM sibling walk | Existing `findTodayH2()` + new `extractTodaySection()` |
| Day-jump strip in Plan | Replace/extend `cityNav` in generic markdown branch with day-level pills | Existing city-nav pill pattern |
| Budget as Explore subtab | Add third subtab to `renderExplore()` | Existing subtab pattern |

**Architectural rule:** All navigation must go through `loadPage()` — never bypass it. The universal cleanup at the top of `loadPage` (removes `#page-tabbar`, `#bing-iframe`, resets `paddingTop`) must run on every transition.

**Scroll key resolution exists in 3 identical copies** (lines ~490, ~541, ~1347). Before adding Today page, extract into a single `getScrollKey()` function. This is the prerequisite refactor for HOME-01.

**Do not touch the duplicate between the `renderExplore` branch and the generic markdown branch** — they have already diverged. Only modify the generic markdown branch for PLAN-01.

---

### Pitfalls (from PITFALLS.md)

**Top 5 — must actively prevent:**

| # | Pitfall | Prevention |
|---|---------|-----------|
| 1 | **UTC vs. local date off-by-one** — `new Date('2026-05-12')` parses as UTC midnight, shows wrong day in China (UTC+8) | Always use `new Date(2026, 4, 12)` constructor form. Never ISO string for trip dates. |
| 2 | **version.txt triple-sync bomb** — `version.txt` is `3.16`, app is `3.41`. Causes force-reload on every app focus during the entire trip. | Fix version.txt immediately as first commit. Add to CLAUDE.md bump ritual. |
| 3 | **Scroll key in 3 places** — adding Today page to only 2 of 3 ternary copies causes scroll bugs that surface only after navigating away and back | Extract `getScrollKey()` before implementing Today screen. |
| 4 | **SW cache list not updated** — new JS/assets not added to `sw.js` CACHE_FILES array silently breaks offline exactly when reliability matters most | After every feature commit: DevTools → Application → SW → Offline → reload → verify. |
| 5 | **Nav muscle memory breakage** — renaming or removing existing tabs disorients a user who has used the app for weeks pre-trip | Keep all existing tabs in current positions. Add Today; don't replace. |

**Additional minor pitfalls:**
- iOS Safari `env(safe-area-inset-top)` resolves to 0px intermittently after dynamic DOM insertion — cache as CSS variable at load time
- Pull-to-search fires on Today screen (always at scrollTop 0) — decide explicitly whether to allow or disable
- Dead `transformPhrasebook()` function is a trap — delete it in BUG-01 cleanup
- Cross-links in content files without `#anchor` bypass SPA router and navigate to raw `.md` file

---

## Implications for Roadmap

### Recommended Phase Order

**Phase 0: Bug fixes (do this first, before any feature work)**

Rationale: The version.txt force-reload bug affects every subsequent test and will corrupt the field experience. Fix it in isolation so it does not contaminate feature commits.

- Fix `version.txt` → sync to current `APP_VERSION`
- Update CLAUDE.md to include version.txt in bump ritual
- Delete dead `transformPhrasebook()` function (~60 lines removed)
- Audit SW cache manifest for any missing files

**Phase 1: Today / Home screen (HOME-01)**

Rationale: Highest single UX impact. The "what do I do today?" question is the first thing opened every morning. All data already exists in cache. Implementation is an extension of existing patterns.

Prerequisite (do first within this phase): Extract `getScrollKey()` to eliminate the 3-copy ternary. Pure refactor, no behavior change.

Delivers:
- `today` virtual page in PAGES array
- `renderToday()` function using `findTodayH2()` + `extractTodaySection()`
- Trip day number + date header using local `Date` constructor (NOT ISO string)
- Before-trip countdown / after-trip states
- "See full plan" CTA linking to `loadPage('plan.md')`
- Today page as default first tab (`PAGES[0]`)

Pitfalls to avoid: UTC date off-by-one (Pitfall 1), scroll key in 3 places (Pitfall 3), pull-to-search on Today (Pitfall 8).

Research flag: Standard patterns — no additional research needed. Architecture file documents exact implementation.

**Phase 2: Plan navigation (PLAN-01)**

Rationale: Fixes the "text wall" problem in the most-used reference tab. Day pills + "jump to today" button together complete the plan navigation story. Depends on plan.md heading format being consistent.

Delivers:
- Horizontal scrollable day-pill strip above plan content
- Today's day pill highlighted
- "Go to today" sticky button (shows only when today's section is off-screen)
- Cross-page "jump to day N" from Today screen

Pitfalls to avoid: Duplicate rendering code — modify generic markdown branch only, leave explore branch untouched (Pitfall 6). Mark the other copy with a sync comment.

Research flag: Standard patterns — city-nav pill pattern is already implemented and documented.

**Phase 3: Nav simplification + polish (NAV-01)**

Rationale: Lower risk changes, done after Today screen is stable. Primarily: reorder phrasebook categories, audit tab icon+label pairing, consider Budget as Explore subtab.

Delivers:
- All tabs verified: icon + text label
- Phrasebook: Essentials/Transport/Food categories first
- Optional: Budget moved to Explore subtab (reduces top-level tab count 6→5)
- Offline indicator on nav or settings

Pitfalls to avoid: Do NOT rename or reposition existing tabs (Pitfall 5). Add Today without removing anything.

Research flag: Standard patterns. Nav audit is manual, not code research.

**Phase 4: Offline verification pass**

Rationale: The trip happens in China. Offline reliability is non-negotiable. Dedicated pass after all features are added to verify SW cache list is complete.

Delivers:
- DevTools offline test for every page/subtab
- SW cache manifest updated for all new assets
- iOS Safari safe-area CSS variable fix applied

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Stack | HIGH | Directly from codebase analysis. No new dependencies = no unknowns. |
| Features | HIGH | Clear framing (execution assistant, not planner). UX patterns well-documented. |
| Architecture | HIGH | Based on direct codebase analysis of app.js. Exact line numbers referenced. |
| Pitfalls | HIGH | Two pitfalls (version.txt bug, scroll key duplication) are confirmed active issues, not theoretical. |

**Gaps / items needing validation before implementation:**

1. `plan.md` heading format — the day-parsing regex assumes `## Ш1: 12 мая (вт) — ...` format. Verify all day headings in plan.md match this before implementing day pills.
2. `places.md` structure — if Places "I'm here" card is ever added, content must be audited first.
3. iOS Safari testing — safe-area pitfall is intermittent. Must test on real device (not simulator) after HOME-01.

---

## Sources

Aggregated from research files:

- MDN: Temporal API — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
- Bryntum: JavaScript Temporal in 2026 — https://bryntum.com/blog/javascript-temporal-is-it-finally-here/
- Apple HIG: Tab Bar — developer.apple.com/design/human-interface-guidelines/tab-bars
- Material Design: Navigation bar — material.io/components/navigation-bar
- Mobile Travel App UX Patterns — pixso.net/tips/travel-app-ui/
- Mobile Navigation UX Best Practices 2026 — designstudiouiux.com
- TripIt / PlanPlanGo today-view patterns — feature descriptions
- Obsidian Daily Note Navbar plugin — obsidianstats.com
- Designing for Context: Location-Based UX — sennalabs.com
- Existing app.js patterns (authoritative): lines 357–388 (findTodayH2), 575–588 (scroll), 855 (renderSettings), 1092–1118 (cityNav), 1128–1148 (TOC), 1164–1181 (cross-links), 1477–1479 (init routing)
