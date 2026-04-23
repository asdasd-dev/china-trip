# Domain Pitfalls

**Domain:** Vanilla JS PWA — travel companion, polish & UX milestone
**Researched:** 2026-04-23
**Project context:** Brownfield polish. 1498-line app.js, no build step, trip in 2 weeks.

---

## Critical Pitfalls

Mistakes that cause rewrites or broken functionality under a tight deadline.

---

### Pitfall 1: "Today" screen — date off by one due to UTC vs. local time

**What goes wrong:**
`new Date('2025-05-10')` (ISO string, date-only) is parsed as UTC midnight, then converted
to local time. On devices with a timezone east of UTC (Moscow = UTC+3), this actually works.
But if `plan.md` trip start is ever stored as a plain ISO date string and compared against
`new Date()` (which is local), the day number can be off by ±1.

The safe pattern for a "what day of the trip is today" calculation:

```js
// WRONG — new Date('2025-05-10') → UTC midnight → off-by-one east of UTC
const tripStart = new Date(TRIP_START_DATE_STRING);

// CORRECT — explicit local date, no timezone shift
const [y, m, d] = '2025-05-10'.split('-').map(Number);
const tripStart = new Date(y, m - 1, d); // months 0-indexed, no time, local TZ

const today = new Date();
const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const dayNum = Math.floor((todayLocal - tripStart) / 86400000) + 1;
```

**Why it happens:**
ES spec says ISO date-only strings are parsed as UTC; date-time strings are local. This
asymmetry is a famous JS footgun. The trip is in China (UTC+8) — device clock will be
local Chinese time, which amplifies the risk of off-by-one relative to the hardcoded date.

**Consequences:**
"Today" screen shows yesterday's day — user misses activities. Or shows "Day 0" on the
first day of the trip. Silent, not obviously a bug.

**Warning signs:**
- Testing the screen the night before departure in Russia and it shows Day 1 already.
- Correct on developer machine but wrong on device after crossing timezone.

**Prevention:**
Always construct the trip-start Date using `new Date(year, month-1, day)` constructor with
explicit components, never from ISO string. Do the same for "today" comparison. Add a
one-line comment referencing this pitfall in the code.

**Phase:** HOME-01 (Today screen implementation)

---

### Pitfall 2: Service Worker precache list not updated after adding new "Today" page or assets

**What goes wrong:**
The app's `sw.js` has a hardcoded `CACHE_FILES` (or equivalent precache) array. When a new
logical page or JS feature is added — e.g., a "today" section, a new helper JS file, or a
new image — but that file is not added to the cache list, the app silently returns a network
error for that file when offline.

Worse: the SW may cache a 404 response for the missing file. On subsequent offline loads
the 404 gets served from cache permanently, even after the real file exists on the server.

**Why it happens:**
The china-trip SW uses a manual precache list + version bump convention. It's easy to add a
file to `index.html` or `app.js` and forget to add it to `sw.js`'s cache array. No build
tool enforces the list.

Looking at the codebase, there is already a known instance of this fragility: `version.txt`
was out of sync (3.16 vs 3.41), causing a force-reload on every online load. The same class
of "list not kept in sync" problem applies to the SW cache manifest.

**Consequences:**
- App works fine online.
- First time user goes offline (on the airplane, underground in Shanghai), a blank screen or
  broken resource appears exactly when reliability matters most.
- Hard to debug in the field without devtools.

**Warning signs:**
- New `.js`, `.md`, or asset file added but `sw.js` CACHE_FILES array not updated.
- Testing only online, never testing offline mode after each feature addition.

**Prevention:**
1. After every feature commit: open DevTools → Application → Service Workers → "Offline"
   checkbox → reload → verify no missing resources.
2. Add a comment block in `sw.js` listing every file that must stay in sync, with a checklist
   comment: `// KEEP IN SYNC: also update APP_VERSION in app.js and version.txt`.
3. Never cache opaque (CDN cross-origin) responses without checking response.ok first.

**Phase:** HOME-01, BUG-01, PERF-01

---

### Pitfall 3: Adding a "Today" home page breaks existing scroll state and routing assumptions

**What goes wrong:**
The current router in `loadPage()` uses the file name (`plan.md`, `checklist.md`, `explore`,
`translate`, `settings`) as both the routing key and the scroll persistence key. Adding a
synthetic `home` or `today` page that is not a markdown file requires every place that checks
`currentPage` or builds scroll keys to be updated.

The scroll-key ternary exists in three separate places (lines 490–494, 1347–1351, 541–542)
and must stay identical. Adding a new page to only two of three locations creates a scroll
bug that surfaces only after navigating away and back — easy to miss in manual testing.

Additionally: the tab bar cleanup at the top of `loadPage` was identified in CONCERNS.md as
relying on all navigation going through `loadPage`. A `home` page that shortcuts this path
(e.g., via a special "go home" shortcut) could leave a stale `#page-tabbar` on screen.

**Consequences:**
- Navigating from Plan back to Today restores wrong scroll position (shows bottom of Plan
  instead of top of Today).
- If Today is reached by a path other than `loadPage`, the Explore subtab bar stays visible
  on top of the Today content.

**Warning signs:**
- Scroll position on Today doesn't reset to 0 on second visit.
- Going to Explore, then Today, then back to Explore renders two overlapping tab bars.

**Prevention:**
1. Before implementing Today screen, extract `getScrollKey()` function and replace all three
   inline copies. This is a refactor with no UX change — safe to do as the first commit.
2. Add `'today'` (or whatever key is used) explicitly to the scroll key resolver so it falls
   through to `currentPage` as the key (i.e., no special case needed, just don't shadow it).
3. Route Today exclusively through `loadPage('today')` — never bypass the universal cleanup.

**Phase:** HOME-01 (prerequisite refactor before implementing the screen)

---

## Moderate Pitfalls

---

### Pitfall 4: iOS Safari — safe-area-inset resets to 0px after in-app navigation

**What goes wrong:**
iOS Safari PWAs (standalone mode) correctly expose `env(safe-area-inset-top)` and
`env(safe-area-inset-bottom)` on the initial load. However, after a client-side navigation
that re-injects the `#page-tabbar` element (which uses
`calc(env(safe-area-inset-top, 0px) + 10px)` in its padding), there have been observed cases
where the `env()` variable resolves to `0px` rather than the device's actual inset (34px on
iPhone with home indicator).

This affects tab bar height calculation: `tabBarEl.offsetHeight` is measured after
`requestAnimationFrame`, and if the env variable resolved to 0, the tab bar will be
shorter than expected and `scroller.style.paddingTop` will be set too low — content will
slide under the tab bar.

**Why it happens:**
Confirmed bug pattern (2025): in some iOS/WebKit builds, `env()` re-evaluation after dynamic
DOM insertion does not always trigger a synchronous layout recalculation before the next
`requestAnimationFrame`. The issue is not consistent across iOS versions.

**Consequences:**
- First heading or first line of Explore/Translate content is hidden behind the tab bar.
- Problem appears intermittently; may not show in every test.

**Warning signs:**
- Top of content is slightly clipped on iPhone, not on Android.
- The issue appears only after navigating away and back (not on first load).

**Prevention:**
1. Always set `viewport-fit=cover` in the meta viewport tag — verify this is present.
2. Add a CSS fallback: define `--safe-top` as a CSS variable set once at load time in JS via
   `document.documentElement.style.setProperty('--safe-top', ...)`, and reference that
   variable in the tab bar CSS rather than re-evaluating `env()` on each render.
3. Test on a real iPhone (not just simulator) after implementing Today screen and any
   subtab changes.

**Phase:** HOME-01, NAV-01

---

### Pitfall 5: "Simplifying" nav removes a tab users already have muscle memory for

**What goes wrong:**
Removing or renaming a bottom nav tab that users have used repeatedly creates disorientation
even when the underlying content still exists. Research (Baymard 2025, Loop11 2025) calls
the failure mode "confident misuse" — users tap the tab that used to work, arrive somewhere
unexpected, and keep doing it because they feel confident. This is worse than a visible
error: it's a silent miss.

For this app: if "Explore" is renamed or split differently, or if "Budget" is merged into
"Plan", the user navigating China under stress will look for a familiar landmark that is
gone. At best, it costs 3 seconds of confusion. At worst, they can't find critical info
when they need it.

**Why it happens:**
Polish tasks with "simplify navigation" goals often result in tab consolidation or
relabeling that feels logical to the developer (who lives in the codebase) but breaks
the mental map the user built over weeks of pre-trip use.

**Consequences:**
- User can't find Phrasebook quickly during an interaction with a local.
- User taps wrong tab repeatedly, experiences friction exactly when stress is highest.

**Warning signs:**
- Renaming `Explore` to `Info` because "that's what the subtab is called."
- Merging Budget into Plan because "they're both about the trip."
- Removing the Budget tab because "it's rarely used."

**Prevention:**
1. Keep all five existing tabs in their current positions. Add `Today` as a new entry, don't
   replace an existing one.
2. If consolidation is attempted, keep icon shape and position identical — only change label.
3. Changes to nav structure are the highest-risk UX change in this milestone. Treat as
   out-of-scope unless a clear user pain point is documented in PROJECT.md.

**Phase:** NAV-01

---

### Pitfall 6: Plan navigation (TOC/jump-to-day) broken by the duplicated rendering code

**What goes wrong:**
The TOC/city-nav rendering logic is copy-pasted verbatim in two places in `app.js`
(lines 559–666 for `renderExplore()` and lines 1080–1187 for the plain-md branch).
Any change to make plan navigation work better — e.g., adding a day-jump control,
highlight-active-day anchors, or a "scroll to today" button — must be applied to
both copies or a divergence bug appears.

This has already happened: CONCERNS.md notes the explore version uses `mdDiv` while the
plain-md version uses `el` directly — they have already diverged.

**Consequences:**
- A "jump to today" button works on Plan but silently does nothing (or errors) on Explore
  info pages that also render markdown TOCs.
- A visual fix to TOC styling applies on one page but not the other.

**Warning signs:**
- Testing plan navigation only on plan.md and shipping — the explore pages are not tested.
- Any `getAnchorId` or `buildTOC` function called in only one of the two copy-paste blocks.

**Prevention:**
1. Before implementing PLAN-01 (fast plan navigation), extract the shared rendering logic
   into `renderMarkdownContent(container, mdText, opts)` as a prerequisite.
2. This refactor is low-risk if done before adding PLAN-01 features (pure extraction, no
   behavior change).
3. If deadline pressure prevents the refactor, implement the "jump to today" feature only
   in the plain-md branch (Plan) and explicitly mark the other copy with a `// TODO: keep
   in sync with lines 559–666` comment.

**Phase:** PLAN-01 (prerequisite awareness)

---

### Pitfall 7: version.txt / APP_VERSION / SW VERSION triple-sync is a latent force-reload bomb

**What goes wrong:**
CONCERNS.md documents this as an active bug: `version.txt` contains `3.16` while
`APP_VERSION` in `app.js` and `VERSION` in `sw.js` are `3.41`. Every online load triggers
`checkVersion()` → detects mismatch → calls `swReg.update()` → waits 4 seconds → calls
`location.reload()`. Users see an unnecessary reload on every tab focus.

This is a ticking time bomb for the polish milestone: every feature commit bumps the version.
If `version.txt` continues to be forgotten, the force-reload behavior continues throughout
the trip.

**Why it happens:**
The CLAUDE.md convention says to bump `VERSION` in `sw.js` and `APP_VERSION` in `app.js`.
`version.txt` is not mentioned in the convention. It is a third file that does the same job
but is not part of the established ritual.

**Consequences:**
- App reloads itself every time user returns from checking Maps / WeChat / anything else.
- Each reload clears the current page state (scroll position, open subtab) since the reload
  is hard (`location.reload()`).
- Extremely annoying in the field.

**Warning signs:**
- `version.txt` still says `3.16` (or any value different from `APP_VERSION`).
- No mention of `version.txt` in `CLAUDE.md` bump instructions.

**Prevention:**
1. Fix `version.txt` immediately (set it to current `APP_VERSION`) as part of BUG-01.
2. Update CLAUDE.md convention to include `version.txt` as a third required sync target.
3. Consider removing the `version.txt` mechanism entirely and comparing against the SW
   cache version directly — eliminates the triple-sync problem at the cost of a small refactor.

**Phase:** BUG-01 (fix immediately, before any feature work)

---

## Minor Pitfalls

---

### Pitfall 8: Pull-to-search gesture fires during Today screen scrolling

**What goes wrong:**
Pull-to-search is disabled when `scroller.scrollTop !== 0`. On a Today screen that is shorter
than the viewport (no scroll needed), `scrollTop` is always 0 — pull-to-search will trigger
on any downward swipe anywhere on the Today screen. This may be desirable, but if Today has
interactive elements near the top (e.g., a "swipe for daily summary" affordance), the
gesture conflict will frustrate users.

**Prevention:**
Decide explicitly: is pull-to-search useful on the Today screen? If not, add `'today'` to
the disabled list in the pull gesture handler alongside `'settings'`.

**Phase:** HOME-01

---

### Pitfall 9: Dead code `transformPhrasebook()` shadowing the live render path

**What goes wrong:**
`transformPhrasebook()` (lines 250–312) is dead code for all current usage, but it is not
removed. If anyone adds a new phrasebook feature and accidentally calls the wrong function
(e.g., during copy-paste from the other path), the phrasebook renders from parsed HTML
instead of the `PHRASEBOOK` array, producing subtly wrong output without an error.

**Prevention:**
Delete `transformPhrasebook()` as part of BUG-01 cleanup, after verifying no page calls it.
This removes a trap and shrinks `app.js` by ~60 lines.

**Phase:** BUG-01

---

### Pitfall 10: Markdown cross-links without `#anchor` bypass SPA router

**What goes wrong:**
Cross-link interception only matches `a[href*=".md#"]`. A link written as `places.md`
(no anchor) falls through to the browser and triggers a full navigation to the raw Markdown
file, breaking out of the SPA entirely.

**Prevention:**
When writing any new cross-links in content files for the Today screen or plan summaries,
always include a `#` anchor. Add a comment to the content-file editing guidelines.

**Phase:** HOME-01, PLAN-01 (if cross-links to plan days are added)

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| HOME-01 | Trip day number | UTC vs. local date off-by-one | Use `new Date(y, m-1, d)` constructor, not ISO string |
| HOME-01 | New page routing | Scroll key not updated in all 3 locations | Extract `getScrollKey()` first |
| HOME-01 | SW cache | New assets missing from precache | Offline test after every commit |
| HOME-01 | Pull-to-search | Gesture conflict on short Today screen | Explicitly allow or disable |
| NAV-01 | Tab changes | Mental model disruption | Keep existing tabs; only add, don't rename/remove |
| PLAN-01 | TOC rendering | Duplicated code divergence | Extract shared renderer or fix both copies |
| BUG-01 | version.txt | Force-reload on every tab focus | Fix version.txt immediately, add to CLAUDE.md |
| BUG-01 | Dead code | `transformPhrasebook()` trap | Delete it |
| All | iOS Safari | `env(safe-area-inset)` reset after navigation | Use CSS variable snapshot at load time |
| All | SW versioning | Triple-sync (sw.js + app.js + version.txt) | Add version.txt to bump convention |

---

## Sources

- [iOS Safari PWA safe-area-inset and viewport bugs — Apple Community, GitHub discussions](https://discussions.apple.com/thread/256138682)
- [env(safe-area-inset-bottom) resets to 0px after client-side routing — Next.js discussion](https://github.com/vercel/next.js/discussions/81264)
- [UTC date parsing off-by-one in travel apps — vatsalpandya.com](https://www.vatsalpandya.com/blog/javascript-utc-date-horrors)
- [How to Handle Date and Time Correctly — DEV Community](https://dev.to/kcsujeet/how-to-handle-date-and-time-correctly-to-avoid-timezone-bugs-4o03)
- [Service Worker cache: new files missing offline — PWA Workshop, MDN](https://pwa-workshop.js.org/3-precaching/)
- [Caching 404 responses — Drupal PWA issue tracker](https://www.drupal.org/project/pwa/issues/3015329)
- [SPA routing pitfalls — gomakethings.com](https://gomakethings.com/the-problem-with-single-page-apps/)
- [History API and popstate — MDN](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API)
- [Mobile navigation mental models and redesign risks — UX4Sight](https://ux4sight.com/blog/8-app-navigation-design-mistakes-to-avoid)
- [Confident misuse and navigation disruption — Loop11](https://www.loop11.com/ux-signals-that-indicate-users-are-getting-lost/)
- [codebase/CONCERNS.md — project-specific bugs and fragile areas](file:///Users/vashevchenko/china-trip/.planning/codebase/CONCERNS.md)
