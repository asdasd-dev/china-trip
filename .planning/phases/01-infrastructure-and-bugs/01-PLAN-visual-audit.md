---
plan: 01-02
phase: 1
wave: 2
depends_on:
  - 01-01
files_modified:
  - js/app.js
  - index.html
  - sw.js
  - version.txt
autonomous: false
requirements:
  - BUG-03
must_haves:
  truths:
    - "All pages render without clipped text, broken layout, or z-index overlap"
    - "Dark mode applies correctly on every page and subtab"
    - "Subtab pages (explore, translate) show tab bar and content correctly"
  artifacts:
    - path: "js/app.js"
      provides: "Any visual bug fixes applied"
    - path: "index.html"
      provides: "Any CSS fixes applied"
  key_links:
    - from: "index.html CSS"
      to: "js/app.js rendering"
      via: "CSS variables and class names"
      pattern: "var\\(--"
---

<objective>
Systematic visual audit of all pages and subtabs. Fix any layout, styling, or rendering bugs found.

Purpose: Ensure zero visual regressions before adding new features in Phase 2.
Output: All pages visually clean in both light and dark mode.
</objective>

<execution_context>
@/Users/vashevchenko/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vashevchenko/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-infrastructure-and-bugs/01-RESEARCH.md
@.planning/phases/01-infrastructure-and-bugs/01-01-SUMMARY.md
@js/app.js
@index.html
</context>

<tasks>

<task id="1-02-01" name="Code-level visual audit and fix any issues found">
  <read_first>
    - js/app.js — full file scan for rendering functions: renderExplore, renderTranslate, renderSettings, renderMarkdown sections
    - index.html — full CSS section for layout, dark mode variables, z-index layering
    - 01-RESEARCH.md — BUG-03 section listing all pages/states to audit and known code risks
  </read_first>
  <action>
    Perform a systematic code-level audit of all page rendering paths. Check each page/state listed in the research:

    **Audit checklist (from RESEARCH.md):**

    | Page | What to check in code |
    |------|----------------------|
    | `plan.md` | Sticky header z-index, heading detection, dark mode colors |
    | `checklist.md` | Checkbox styling, checked state visual feedback |
    | `budget.md` | Table `.num` class alignment, overflow handling |
    | `explore` → Info | Tab bar positioning, `stickyHeader.style.top` logic (line ~1294), content padding under tab bar |
    | `explore` → Places | City-nav rendering, per-city TOC, tab switch cleanup |
    | `translate` → Phrases | Phrase card layout, speak/show-to-Chinese button styling |
    | `translate` → Bing | iframe sizing calc, `scroller.style.overflow = 'hidden'` |
    | `translate` → Google | googletranslate:// deeplink button |
    | `settings` (all subtabs) | Version display, theme toggle, accent swatches, console log list |
    | Dark mode | CSS variable application, `--nav-accent` hardcoded gold FOUC (minor, document but do not fix unless trivial) |

    **Known risk from research:** Dark mode `--nav-accent: #F0C040` is hardcoded in CSS (index.html line ~113) but overridden by JS `applyAccent()`. This is a minor first-paint FOUC. Document whether it is noticeable; fix only if trivial (e.g., removing the hardcoded value if JS always sets it before first visible frame).

    **For each bug found:**
    1. Document: page, symptom, root cause, file + line
    2. Fix it directly
    3. Verify the fix does not break other pages

    **If no bugs are found:** Document the clean audit result. Still bump version since Plan 01-01 already bumped to 3.43 — if this plan runs after, bump to 3.44.

    **Version bump:** After all fixes, bump version in sw.js, js/app.js, and version.txt. Check what the current version is at execution time (should be 3.43 from Plan 01-01) and increment by 0.01.
  </action>
  <acceptance_criteria>
    - Every page listed in audit checklist has been reviewed in code (executor documents each in summary)
    - Any bugs found are fixed with specific code changes
    - Version is bumped in all three files (sw.js, js/app.js, version.txt) to the same new value
    - `grep "APP_VERSION" js/app.js` and `grep "const VERSION" sw.js` and `cat version.txt` all show matching version
  </acceptance_criteria>
</task>

<task id="1-02-02" name="Visual verification in browser" type="checkpoint:human-verify">
  <what-built>
    Code-level visual audit complete. All rendering paths reviewed and any found issues fixed. getScrollKey() refactor from Plan 01-01 is also active.
  </what-built>
  <how-to-verify>
    Open the app in a mobile-width browser (Chrome DevTools device mode, 390px width recommended).

    **Light mode checklist:**
    1. Plan tab — scroll down, verify sticky header appears and disappears cleanly
    2. Checklist tab — toggle a checkbox, verify visual feedback
    3. Budget tab — verify table numbers are right-aligned, no horizontal overflow
    4. Explore → Info tab — verify tab bar is fixed at top, content scrolls underneath
    5. Explore → Places tab — switch tabs, verify scroll position restores
    6. Translate → Phrases tab — verify phrase cards render, speak button visible
    7. Translate → Bing tab — verify iframe fills space, no double scroll
    8. Settings — verify version number, theme toggle, accent swatches

    **Dark mode:** Toggle dark mode in Settings, repeat steps 1-8.

    **Scroll persistence:** Navigate Plan → Explore → Plan, confirm scroll position restored.

    **Offline:** DevTools → Network → Offline → navigate all pages, confirm they load.
  </how-to-verify>
  <resume-signal>Type "approved" if all pages look correct, or describe any issues found</resume-signal>
</task>

</tasks>

## Verification

### must_haves
- All pages and subtabs render correctly without visual bugs
- Dark mode applies cleanly on every page
- Scroll persistence works across all navigation paths (uses new getScrollKey())
- App works fully offline

### version_bump
Current: 3.43 (from Plan 01-01) → New: 3.44 (bump in sw.js, js/app.js, version.txt)

<success_criteria>
1. Human visual verification passes for all pages in light and dark mode
2. Scroll position preserved when navigating between pages
3. Offline mode works for all pages
4. Version bumped and in sync across all three files
</success_criteria>

<output>
After completion, create `.planning/phases/01-infrastructure-and-bugs/01-02-SUMMARY.md`
</output>
