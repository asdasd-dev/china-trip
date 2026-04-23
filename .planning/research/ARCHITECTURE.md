# Architecture Patterns

**Domain:** Vanilla JS SPA — PWA polish, brownfield
**Researched:** 2026-04-23
**Confidence:** HIGH (based on direct codebase analysis, no external research required)

---

## Context: What the Codebase Already Does

This is not a greenfield research question. The codebase already contains working
implementations of every pattern needed. The research task is: identify the exact
extension points for the four required features and document how to use them without
breaking existing behavior.

---

## Pattern 1: Adding a "Today / Home" Page to the Router

### How loadPage currently works

`loadPage(file, opts)` is a single async function (~1000 lines, lines 488–1260).
Its routing logic is a cascade of `if` checks on the `file` argument:

```
if (file === 'explore')   → renderExplore()
if (file === 'translate') → renderTranslate()
if (file === 'settings')  → renderSettings()
else                      → generic markdown renderer
```

The initial page is determined at the bottom of app.js (line 1477–1479):
```js
const hash = location.hash.slice(1);
const initial = PAGES.find(p => p.file.replace('.md', '') === hash);
loadPage(initial ? initial.file : PAGES[0].file);
```

Currently `PAGES[0]` is `plan.md`. A "Today" home page means inserting a new
virtual page into this cascade.

### How to add a virtual page (no .md file needed)

Add `{ file: 'today', label: 'Сегодня', icon: 'home' }` to the front of the
`PAGES` array. Then add a branch in `loadPage`:

```js
if (file === 'today') {
    renderToday(el);
    return;
}
```

`renderToday` is a plain JS function that builds DOM into `el` (`#content`).
No fetch, no markdown. This is identical to how `renderSettings` works — it
already does exactly this (line ~855).

### Scroll key for the new page

The scroll key resolution pattern (used in 3 places) simply falls through to
`currentPage` for any non-special page:
```js
const key = currentPage === 'explore'   ? 'explore-' + exploreTab
           : currentPage === 'translate' && translateTab === 'phrases' ? 'translate-phrases'
           : currentPage;  // ← 'today' lands here automatically
```
No changes needed to the scroll persistence logic.

### Nav button

`PAGES` iteration at line 173 builds the nav bar. Adding the entry to `PAGES`
automatically creates the button. Change `PAGES[0]` from `plan.md` to `today`
so the first load lands on the home screen.

### Today page as default on first open

Because init reads `PAGES[0].file` (line 1479) and respects `location.hash`,
making `today` first in `PAGES` means:
- Fresh open → Today screen
- Deep link `#plan` → Plan page (unchanged)
- Back from any page → Today screen when user taps home icon

---

## Pattern 2: Extracting "Today's Section" from plan.md at Runtime

### Existing infrastructure (already built, use it directly)

`findTodayH2(h2s)` already exists at line 360–368:

```js
const RU_MONTHS = { 'янв':1,'фев':2,'мар':3,'апр':4,'май':5,'мая':5, ... };

function findTodayH2(h2s) {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const re = /(\d{1,2})\s+(янв|фев|мар|апр|май|мая|июн|июл|авг|сен|окт|ноя|дек)/i;
    return h2s.find(h2 => {
        const m = re.exec(h2.textContent);
        return m && parseInt(m[1]) === day && RU_MONTHS[m[2].toLowerCase()] === month;
    }) || null;
}
```

This matches headings like `## Ш1: 12 мая (вт) — прилёт`.

### Approach for the Today page

The Today page needs to:
1. Ensure `plan.md` is in `pageCache` (fetch if needed — same pattern as
   `ensureAllPagesCached`)
2. Parse it with `marked.parse()` into a temporary off-screen `div`
3. Call `findTodayH2(h2s)` on the rendered headings
4. Extract content between `todayH2` and the next `h2` sibling
5. Render that extracted fragment into `#content`

**Extraction pattern** (collect siblings until next h2):
```js
function extractTodaySection(parsedDiv) {
    const h2s = Array.from(parsedDiv.querySelectorAll('h2'));
    const todayH2 = findTodayH2(h2s);
    if (!todayH2) return null;

    const fragment = document.createDocumentFragment();
    let node = todayH2;
    while (node) {
        const next = node.nextElementSibling;
        if (node !== todayH2 && node.tagName === 'H2') break;
        fragment.appendChild(node.cloneNode(true));
        node = next;
    }
    return fragment;
}
```

This is purely DOM manipulation — no regex on raw markdown needed. Parse once
with marked, then traverse the DOM. This is more robust than regex on raw text
because markdown rendering normalizes whitespace and inline markup.

### What to show when trip is not today

Three states to handle:
- **Before trip** (today < May 12): Show trip countdown + first day preview
- **During trip** (today in range): Show today's section
- **After trip**: Show last day or a "trip complete" message

Date range check is simple arithmetic against the trip start/end dates, which
are known constants (May 12 – June 1 from plan.md).

---

## Pattern 3: Anchor Navigation Within a Markdown Page

### Existing infrastructure

The codebase already has anchor navigation in plan.md. plan.md contains explicit
`<a id="sh1"></a>` anchors before each day's `## h2` heading. The TOC builder
at lines 1128–1148 already reads these anchors via `getAnchorId(heading)`:

```js
function getAnchorId(heading) {
    let prev = heading.previousElementSibling;
    if (prev && prev.tagName === 'A' && prev.id) return prev.id;
    if (prev) { prev = prev.previousElementSibling;
        if (prev && prev.tagName === 'A' && prev.id) return prev.id; }
    return null;
}
```

The TOC links use `h2.scrollIntoView({ behavior: 'instant' })` (not hash
navigation) so there is no URL conflict.

### Pattern for day-jump navigation (PLAN-01)

A "jump to day" UI means: a horizontal scrollable pill strip above the plan
content, one pill per day. This is identical to the existing city-nav pattern
(`.city-nav.scrollable`, lines 1092–1118).

The day strip already exists in concept — it's what `cityNav` does for cities.
For plan.md specifically, the pattern is:

1. Collect all h2s with a date in them (using the same regex as `findTodayH2`)
2. Render as a scrollable pill strip at top of plan content
3. On click: `h2.scrollIntoView({ behavior: 'instant' })`
4. Highlight today's pill with `today-btn` class (already styled)

**Key insight:** plan.md already has this partially — city buttons (Шанхай,
Пекин) exist in the cityNav. What's missing is a second level: day pills within
each city. The architecture supports two levels naturally because the city nav
is a separate element inserted before the content, and day pills would be a
separate in-content element.

Alternative simpler approach: replace the city-level nav with a flat list of
all days. Only ~10–12 days total so a single scrollable row fits.

### Cross-page navigation from Today → Plan day

The Today page's "open full day" button should call:
```js
loadPage('plan.md', { scrollToAnchor: 'sh1' });
```
And `loadPage` handles the scroll after render. The cross-link pattern at
lines 1164–1181 already does this for `.md#anchor` links — the same
`setTimeout(() => document.getElementById(targetId).scrollIntoView(...), 200)`
pattern works here too.

---

## Pattern 4: Simplifying Navigation (NAV-01)

### Current structure

6 tabs: Маршрут, Чек-листы, Бюджет, Инфо, Перевод, Настройки

Plus subtabs: Explore (Инфо / Места), Translate (Разговорник / Переводчик / Google)

The nav bar is built by iterating `PAGES` (lines 173–187). Each button is a
`<button data-file="...">` with a lucide icon.

### Progressive disclosure patterns applicable here

**Option A: Replace plan.md with "Today" as tab 1 (recommended)**

Change `PAGES[0]` from `plan.md` to `today`. The plan is still reachable via
the Today page's "full plan" CTA, or keep `plan.md` as tab 2. This removes
confusion about "what do I open first" without removing any tab.

Cost: zero. One line change to `PAGES` array order.

**Option B: Merge Budget into Explore**

Budget (`budget.md`) is read-only reference content — same category as Info
and Places. Adding it as a third subtab in Explore (Инфо / Места / Бюджет)
reduces the top-level tab count from 6 to 5 (or to 5 if Today replaces Plan).

Implementation cost: add `{ file: 'budget.md', tab: 'budget' }` to the explore
subtab pattern. The renderExplore function already handles generic markdown
rendering of subtabs — budget is pure markdown, no special logic.

**Option C: Move Settings to a gear icon inside Today page**

Settings is rarely used (only theme/accent/version). Moving it off the bottom
nav into an in-page button on the Today screen reduces nav to 4 core tabs.
Risk: users may not find settings. Only do this if the 5-tab option still
feels crowded.

**Recommendation:** Option A alone (Today replaces Plan as first tab) solves
the main UX problem stated in PROJECT.md: "open app → don't know where to start."
Option B is low-risk bonus. Option C is higher risk, skip unless explicitly
requested.

### Nav icon sizing constraint

The `#nav` uses `pointer-events: none` with `button { pointer-events: auto }`.
Current 6 buttons fit because each icon is small. Reducing to 5 makes each
button wider — tap targets improve. No CSS changes needed for 5 tabs.

---

## Component Boundaries for New Features

| New Feature | Where It Lives | What It Touches |
|-------------|---------------|-----------------|
| Today page renderer | New `renderToday()` function in app.js | `PAGES` array, `loadPage` routing branch, scroll key (automatic) |
| plan.md day extraction | Helper `extractTodaySection()` using existing `findTodayH2()` | `pageCache` (read-only), `marked` (already loaded) |
| Day-jump strip in plan | Extension of existing city-nav pattern in generic MD renderer branch | ~10 lines replacing existing cityNav for plan.md |
| Budget as explore subtab | Add third tab to `renderExplore` | `renderExplore` function, `exploreTab` state variable, scroll key map |

---

## Duplication Warning

The codebase has a documented ~120-line duplication between the `explore` branch
and the generic markdown branch of `loadPage`. Both branches contain:
- `getAnchorId()` helper (identical)
- TOC generation logic (identical)
- Cross-link handler (identical)
- Search highlight logic (identical)
- n-gram scorer function (identical)

When implementing plan.md day navigation, touch the generic markdown branch
(lines ~1050–1260) since that's where `plan.md` renders. Do not accidentally
fix the duplication as a side effect — leave the explore branch unchanged to
minimize regression risk before the trip.

---

## Data Flow: Today Page

```
App start
  └── loadPage('today')
        └── renderToday(el)
              ├── pageCache.has('plan.md')?
              │     YES → use cached text
              │     NO  → fetch('plan.md') → pageCache.set
              ├── marked.parse(mdText) → temp div (not inserted into DOM)
              ├── findTodayH2(h2s) → todayH2 element
              ├── extractTodaySection(tempDiv) → DOM fragment
              └── el.innerHTML = '' + append fragment
                    └── (optional) wire "See full plan" → loadPage('plan.md')
```

The plan.md fetch is ~50KB and cached by Service Worker. On second open it is
instantaneous from `pageCache` (in-memory Map, populated by `ensureAllPagesCached`
which runs on startup).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Regex on raw markdown text to extract today's section

**What:** Using string regex on `plan.md` raw text to find and clip today's
section (e.g., match from `## Ш3: 14 мая` to the next `##`).

**Why bad:** Raw markdown has inline HTML (`<a id="sh3"></a>`), escaped
characters, and edge cases. The rendered DOM is cleaner. `findTodayH2` already
works on rendered DOM — stay consistent.

**Instead:** Parse with `marked.parse()` into an off-screen div, then use DOM
traversal.

### Anti-Pattern 2: Adding a new state variable for the Today sub-state

**What:** Adding `let todayTab = 'summary'` etc. to manage Today page internal
state.

**Why bad:** The Today page is a single view, not a subtabbed page. Adding
subtab state adds complexity to the scroll key resolution (currently clean 3-way
branch). If the Today page ever needs subtabs, use the existing subtab pattern
instead of ad-hoc state.

**Instead:** Keep Today as a flat single-scroll page. The plan excerpt +
quick-action buttons is sufficient for the use case.

### Anti-Pattern 3: Changing how plan.md renders for the Today page

**What:** Modifying the generic markdown renderer branch to behave differently
when called from the Today page.

**Why bad:** The generic renderer has complex branching for city nav, TOC, search
highlight, scroll restore. Adding Today-specific behavior into it creates
untestable conditional spaghetti.

**Instead:** The Today page uses a separate `renderToday()` function. If the
user taps "see full plan", it calls `loadPage('plan.md')` which goes through
the normal renderer with no special cases.

### Anti-Pattern 4: Using location.hash for Today page internal navigation

**What:** Navigating to `today#sh3` and using `hashchange` events.

**Why bad:** The app already uses `location.replace('#' + file)` for page-level
routing (line 499). Hash sub-navigation conflicts with this. Scroll is already
handled by `scrollIntoView` — no hash needed.

**Instead:** Pass target anchor as an `opts` parameter: `loadPage('plan.md', { scrollToAnchor: 'sh3' })` and handle the scroll in `loadPage` after render.

---

## Scalability Notes

This is a personal PWA used by 2 people for 2 weeks. Scalability is not a
concern. All patterns chosen must optimize for:
1. Minimal diff surface (trip in 2 weeks, risk must be low)
2. Consistency with existing patterns (no new paradigms)
3. No build step, no npm (constraint from PROJECT.md)

---

## Sources

- Direct analysis of `/Users/vashevchenko/china-trip/js/app.js` (lines 34–1479)
- Direct analysis of `/Users/vashevchenko/china-trip/plan.md` (structure and anchor format)
- `/Users/vashevchenko/china-trip/.planning/codebase/ARCHITECTURE.md` (codebase map)
- `/Users/vashevchenko/china-trip/.planning/PROJECT.md` (requirements)
- `/Users/vashevchenko/china-trip/CLAUDE.md` (architecture rules)

All findings HIGH confidence — derived from actual source code, not training data.
