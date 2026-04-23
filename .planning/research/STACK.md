# Technology Stack

**Project:** china-trip PWA Polish
**Researched:** 2026-04-23
**Scope:** Brownfield polish — vanilla JS SPA, no build step, no npm, 2-week deadline

---

## Current Stack (Baseline)

| Technology | Version | Purpose |
|------------|---------|---------|
| Vanilla JS (ES2022+) | — | All app logic, routing, rendering |
| marked.js | latest (CDN) | Markdown → HTML for .md content files |
| Lucide | 0.525.0 (CDN) | Icon system |
| Firebase Realtime DB | — | Checklist sync |
| ONNX Runtime Web | — | Semantic search ML model |
| Service Worker | custom | Offline cache, versioning |

No framework, no bundler, no npm. This is a hard constraint — do not change it.

---

## Recommendation: Add Zero External Dependencies

For all planned improvements (Today screen, day navigation, nav simplification, visual fixes), **no new CDN scripts are needed or recommended.** Everything required is already available in the browser or the existing stack.

Rationale:
- Each CDN dependency is a network request, a version pin to maintain, and an SW cache entry
- The trip happens in China — CDN availability (especially unpkg/jsdelivr) is uncertain on Chinese networks
- The existing code already fetches .md files and parses them — the same patterns cover new features
- The SW caches aggressively; adding new CDN scripts requires cache busting coordination

---

## Date Calculations: Use Vanilla JS Date Object

**Recommendation:** `Date` object with UTC-safe arithmetic. No library.

The trip runs 12–26 May 2026. All date math needed:

```js
// Trip day number (1-indexed, 0 = before trip, negative = after)
function getTripDayNumber(tripStartISO = '2026-05-12') {
    const start = new Date(tripStartISO);
    // Zero out time components using UTC to avoid DST edge cases
    const todayUTC = Date.UTC(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate()
    );
    const startUTC = Date.UTC(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
    );
    return Math.floor((todayUTC - startUTC) / 86400000) + 1;
}
// Returns: -18 before trip, 1 on May 12, 15 on May 26, 16+ after trip
```

The app already has `findTodayH2()` which uses `new Date()` and Russian month name matching — this is the correct existing pattern. The Today screen extends this rather than replacing it.

**Temporal API: Do Not Use**

Temporal landed in Chrome 144 (Jan 2026) and Firefox 139 (May 2025). Safari has not shipped it as of April 2026. Since this is a mobile PWA likely running on iOS Safari, Temporal is not viable without a polyfill. The polyfill requires npm. Skip it — vanilla `Date` with UTC arithmetic is sufficient for a 2-week trip with a fixed start date.

**Intl.DateTimeFormat: Use for Display Only**

Already universally supported. Good for formatting the current date in the Today screen header:

```js
const dateStr = new Intl.DateTimeFormat('ru', {
    weekday: 'long', day: 'numeric', month: 'long'
}).format(new Date());
// "среда, 23 апреля"
```

---

## Scroll-to-Anchor: Use Existing Pattern + BoundingClientRect Offset

**Recommendation:** The existing `scrollToToday` pattern in app.js is correct. Extend it.

The app already does:

```js
const scrollToToday = () => {
    const elTop = todayH2.getBoundingClientRect().top
        + scroller.scrollTop - scroller.getBoundingClientRect().top;
    scroller.scrollTo({ top: elTop - OFFSET, behavior: 'smooth' });
};
```

This is the right approach for a custom scroll container (`#scroller`). Do NOT use `scrollIntoView()` — it scrolls the viewport, not `#scroller`. Do NOT add `scroll-behavior: smooth` to `html` or `body` — the app uses a div scroller, not the document.

The offset value needs to account for `#page-tabbar` height when present. The existing code already reads `tabBarEl.offsetHeight` — pass this as the offset to scroll functions.

---

## "Today" Screen: JS-Rendered Page (No New Files)

**Recommendation:** Add `'today'` as a new entry in `PAGES` array, rendered entirely in JS like `'settings'`. No new .md file, no new CDN dependency.

Pattern (mirrors existing settings page):

```js
// In PAGES array:
{ file: 'today', label: 'Сегодня', icon: 'calendar-days' }

// In loadPage():
if (file === 'today') {
    // read plan.md from pageCache (already pre-cached by ensureAllPagesCached)
    // extract today's h2 block
    // render a card with: trip day number, date, city, today's schedule table
    // "jump to full plan" link → loadPage('plan.md') + scroll to todayH2
}
```

Key data sources (all already in cache):
- `pageCache.get('plan.md')` — already fetched and cached
- `new Date()` — current date
- `findTodayH2()` — already written, finds today's heading
- The schedule table under today's h2 — extractable from the parsed DOM fragment

**Before-trip / after-trip states:**

```js
const day = getTripDayNumber('2026-05-12');
if (day < 1) {
    // "До поездки: N дней" countdown screen
} else if (day > 15) {
    // "Поездка завершена" — show summary or last day recap
} else {
    // Normal today view
}
```

---

## Navigation Simplification: Collapse or Replace a Tab

**Recommendation:** Replace the `'settings'` tab with `'today'` as the primary landing tab, move settings to a gear icon inside the today page or keep it as-is.

The current 6-tab layout (Маршрут, Чек-листы, Бюджет, Инфо, Перевод, Настройки) has cognitive load during a trip. During the trip itself, the most-accessed flow is: Today → Plan → Translate → Checklist.

Two viable approaches, both zero-dependency:

**Option A — Replace first tab:**
Change `PAGES[0]` from `plan.md` to `today`. Plan becomes tab 2. Settings stays tab 6. Net: same tab count, better landing.

**Option B — Replace settings tab with today:**
Move settings to a link inside the today page (or a long-press on a tab). Reduces visible tabs from 6 to 5 with better information hierarchy.

No CDN needed for either. Icon `calendar-days` is already in Lucide 0.525.0.

---

## What Specifically NOT to Add

| Candidate | Verdict | Reason |
|-----------|---------|--------|
| Day.js / date-fns | Skip | 5KB+ for 2 arithmetic operations. `Date` + UTC math is sufficient |
| Temporal polyfill | Skip | Requires npm, bloats SW cache, Safari not supported |
| Lenis.js / smooth scroll lib | Skip | App uses `#scroller` div, not document scroll. Existing `scrollTo` works |
| Marked.js upgrade | Skip | Already loaded, working. Don't touch |
| Any React/Vue micro-frontend | Skip | Violates architecture constraint |
| Firebase upgrade | Skip | Checklist works. No changes needed |
| Google Analytics / tracking | Skip | Not relevant for personal trip app |

---

## Lucide Icon Availability

Lucide 0.525.0 (already loaded) contains all icons needed for a Today screen:

| Icon | Use |
|------|-----|
| `calendar-days` | Today tab |
| `map-pin` | Current city |
| `clock` | Schedule items |
| `sun` | Morning activities |
| `moon` | Evening activities |
| `navigation` | Navigation hints |

No icon CDN update needed. Call `lucide.createIcons()` after injecting today's HTML, same as existing pages.

---

## Sources

- MDN: Temporal API — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
- Bryntum: JavaScript Temporal in 2026 — https://bryntum.com/blog/javascript-temporal-is-it-finally-here/
- 30secondsofcode: Date difference — https://www.30secondsofcode.org/js/s/date-difference/
- CSS-Tricks: Smooth scrolling — https://css-tricks.com/snippets/jquery/smooth-scrolling/
- Existing app.js patterns (lines 357–388, 575–588, 1096–1109) — authoritative source for scroll and date logic
