---
plan: 01-01
phase: 1
wave: 1
depends_on: []
files_modified:
  - js/app.js
  - sw.js
  - version.txt
autonomous: true
requirements:
  - BUG-01
  - BUG-02
  - PERF-01
must_haves:
  truths:
    - "Scroll key logic exists in exactly one place — the getScrollKey() function"
    - "All three version strings (APP_VERSION, sw.js VERSION, version.txt) match"
    - "SW PRECACHE list covers all app files needed for offline use"
  artifacts:
    - path: "js/app.js"
      provides: "getScrollKey() helper, deduplicated scroll key resolution"
      contains: "function getScrollKey()"
    - path: "sw.js"
      provides: "Complete precache list, bumped VERSION"
      contains: "const VERSION = '3.43'"
    - path: "version.txt"
      provides: "Version file in sync"
      contains: "3.43"
  key_links:
    - from: "js/app.js loadPage()"
      to: "getScrollKey()"
      via: "function call replacing inline ternary"
      pattern: "getScrollKey\\(\\)"
    - from: "js/app.js scroll handler"
      to: "getScrollKey()"
      via: "function call replacing inline ternary"
      pattern: "getScrollKey\\(\\)"
---

<objective>
Fix infrastructure issues: extract duplicated scroll key logic into a single helper function, verify version sync is intact, and confirm SW precache completeness.

Purpose: Stabilize scroll persistence and version management before adding new pages in Phase 2.
Output: Clean getScrollKey() function, verified version sync, confirmed SW precache.
</objective>

<execution_context>
@/Users/vashevchenko/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vashevchenko/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-infrastructure-and-bugs/01-RESEARCH.md
@js/app.js
@sw.js
</context>

<tasks>

<task id="1-01-01" name="Verify version sync and confirm SW precache completeness">
  <read_first>
    - sw.js — read lines 1-20 to see current VERSION and PRECACHE array
    - js/app.js — read line 32 to see APP_VERSION
    - version.txt — read entire file
    - manifest.json — read entire file to check if icons reference files not in PRECACHE
  </read_first>
  <action>
    **BUG-02 verification:** Confirm all three version values are `3.42` and in sync:
    - `sw.js` line 1: `const VERSION = '3.42';`
    - `js/app.js` line 32: `const APP_VERSION = '3.42';`
    - `version.txt`: `3.42`

    All three are currently in sync (verified during research). No code change needed for BUG-02 itself.

    **PERF-01 audit:** Read the PRECACHE array in sw.js (lines 6-18) and compare against actual project files.

    Current PRECACHE list (11 entries):
    ```
    './', './plan.md', './checklist.md', './budget.md', './info.md', './places.md',
    './manifest.json', './js/phrasebook.js', './js/search.js', './js/app.js', './icon.png'
    ```

    Verify completeness:
    - `manifest.json` icons array only references `./icon.png` (already in list) — CONFIRMED
    - `version.txt` is intentionally excluded (fetched with `cache: 'no-store'`) — CORRECT
    - `sw.js` is never self-cached — CORRECT
    - CDN scripts (marked, lucide, transformers) are handled by stale-while-revalidate fetch handler — CORRECT

    **If PRECACHE is already complete (expected):** No file changes needed for this task. Document the verification result.

    **If any gaps found:** Add missing entries to the PRECACHE array in sw.js.
  </action>
  <acceptance_criteria>
    - `grep "APP_VERSION = '3.42'" js/app.js` returns a match
    - `grep "const VERSION = '3.42'" sw.js` returns a match
    - `cat version.txt` outputs `3.42`
    - `grep "icon.png" sw.js` returns a match (icon is in precache)
    - Manual check: PRECACHE array has entries for all .md content files, all .js files, manifest.json, icon.png, and root
  </acceptance_criteria>
</task>

<task id="1-01-02" name="Extract getScrollKey() helper and replace 3 inline duplicates">
  <read_first>
    - js/app.js lines 485-500 — loadPage() scroll save with inline ternary at lines 490-492
    - js/app.js lines 538-545 — explore subtab click handler with inline key at line 541
    - js/app.js lines 1345-1352 — scroll event handler with inline ternary at lines 1347-1349
  </read_first>
  <action>
    **Step 1: Insert `getScrollKey()` function before `loadPage` definition.**

    Add this function at line 487 (blank line before `async function loadPage`):

    ```js
    function getScrollKey() {
        if (currentPage === 'explore') return 'explore-' + exploreTab;
        if (currentPage === 'translate' && translateTab === 'phrases') return 'translate-phrases';
        return currentPage;
    }
    ```

    **Step 2: Replace Location 1 — loadPage() scroll save (lines 490-492).**

    Replace:
    ```js
        const saveKey = currentPage === 'explore' ? 'explore-' + exploreTab
            : currentPage === 'translate' && translateTab === 'phrases' ? 'translate-phrases'
            : currentPage;
    ```
    With:
    ```js
        const saveKey = getScrollKey();
    ```

    **Step 3: Replace Location 2 — explore subtab click (line 541).**

    Replace:
    ```js
                    tabScrollY.set('explore-' + exploreTab, scroller.scrollTop);
    ```
    With:
    ```js
                    tabScrollY.set(getScrollKey(), scroller.scrollTop);
    ```

    Note: This is safe because at this point `currentPage === 'explore'` and `exploreTab` is still the old tab value, so `getScrollKey()` returns `'explore-' + exploreTab` — identical behavior.

    **Step 4: Replace Location 3 — scroll event handler (lines 1347-1349).**

    Replace:
    ```js
        const key = currentPage === 'explore' ? 'explore-' + exploreTab
            : currentPage === 'translate' && translateTab === 'phrases' ? 'translate-phrases'
            : currentPage;
    ```
    With:
    ```js
        const key = getScrollKey();
    ```

    **Step 5: Bump version to 3.43.**

    - `sw.js` line 1: change `const VERSION = '3.42';` to `const VERSION = '3.43';`
    - `js/app.js` line 32: change `const APP_VERSION = '3.42';` to `const APP_VERSION = '3.43';`
    - `version.txt`: change `3.42` to `3.43`

    **Do NOT touch** the scroll restore locations (lines 717, 784, 1043, 1255) — those use page-specific literal keys and are correct as-is.
  </action>
  <acceptance_criteria>
    - `grep -c "function getScrollKey" js/app.js` returns `1`
    - `grep -c "getScrollKey()" js/app.js` returns `3` (one call in loadPage save, one in explore subtab click, one in scroll handler)
    - The old inline ternary `currentPage === 'explore' ? 'explore-' + exploreTab` does NOT appear in js/app.js anymore: `grep -c "currentPage === 'explore' ? 'explore-'" js/app.js` returns `0`
    - `grep "APP_VERSION = '3.43'" js/app.js` returns a match
    - `grep "const VERSION = '3.43'" sw.js` returns a match
    - `cat version.txt` outputs `3.43`
  </acceptance_criteria>
</task>

</tasks>

## Verification

### must_haves
- `getScrollKey()` function exists in js/app.js and is called exactly 3 times
- No inline scroll key ternary remains in js/app.js
- All three version strings are `3.43` and in sync
- SW PRECACHE list is complete for current file set

### version_bump
Current: 3.42 → New: 3.43 (bump in sw.js, js/app.js, version.txt)

<success_criteria>
1. `grep -c "function getScrollKey" js/app.js` → 1
2. `grep -c "getScrollKey()" js/app.js` → 3
3. `grep "currentPage === 'explore' ? 'explore-'" js/app.js` → no matches
4. Version 3.43 in all three files
</success_criteria>

<output>
After completion, create `.planning/phases/01-infrastructure-and-bugs/01-01-SUMMARY.md`
</output>
