---
phase: 06-rtl-and-arabic-completion
plan: 01
subsystem: ui
tags: [rtl, arabic, tailwindcss, bootstrap, antd, i18n, fonts]

# Dependency graph
requires:
  - phase: 05-z-report-and-extended-reports
    provides: NotoSansArabic font files (NotoSansArabic-Regular.ttf, NotoSansArabic-Bold.ttf) in front/src/assets/fonts/
provides:
  - TailwindCSS 3.4.x with logical property utilities (ms-*/me-*/ps-*/pe-*)
  - Bootstrap 5.2.0 LTR and RTL CSS served locally from front/public/css/
  - Shared applyLocale() utility (front/src/lib/rtl.ts) for all language switching
  - antd ConfigProvider wrapping entire app with reactive RTL direction
  - Arabic Noto Sans Arabic font declarations in CSS
affects:
  - 06-02 (RTL class migration — depends on Tailwind logical utilities)
  - 06-03 (Arabic translation fill — depends on applyLocale infrastructure)

# Tech tracking
tech-stack:
  added:
    - tailwindcss@3.4.19 (upgraded from ^3.1.8, adds ms-*/me-*/ps-*/pe-* logical properties)
    - bootstrap@5.2.0 (installed as local npm dep, CSS served from public/css/)
  patterns:
    - Single applyLocale() entry point for all locale/direction changes
    - document.documentElement.dir (targets <html> element, not document.dir which targets <body>)
    - i18n.dir(lang) for programmatic direction detection
    - antd ConfigProvider at app root with i18n.on('languageChanged') for reactive direction

key-files:
  created:
    - front/src/lib/rtl.ts
    - front/public/css/bootstrap.min.css
    - front/public/css/bootstrap.rtl.min.css
  modified:
    - front/package.json
    - front/index.html
    - front/src/index.tsx
    - front/src/css/ltr.scss
    - front/src/css/index.scss
    - front/src/app-frontend/components/modes/topbar.right.tsx
    - front/src/app-admin/containers/layout/navbar.tsx

key-decisions:
  - "applyLocale() uses i18n.dir(lang) instead of hardcoded rtl/ltr — direction is derived from i18next, not hardcoded"
  - "document.documentElement.dir used (targets <html>), not the buggy document.dir (targets <body>)"
  - "Bootstrap CSS served locally from public/css/ to eliminate CDN race conditions on language switch"
  - "Tailwind upgraded via --legacy-peer-deps due to pre-existing @nivo peer conflict (unrelated to this work)"
  - "ConfigProvider placed inside I18nextProvider but outside ApolloProvider so i18n is available for direction init"

patterns-established:
  - "applyLocale(lang) pattern: all locale-switch components import from lib/rtl.ts, no duplicate logic"
  - "Bootstrap RTL swap: <link id=bootstrap-css> href swapped between /css/bootstrap.min.css and /css/bootstrap.rtl.min.css"
  - "Font scoping: [dir=rtl] selector applies NotoSansArabic; Latin Manrope unchanged for LTR"

requirements-completed:
  - I18N-03
  - I18N-04

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 6 Plan 01: RTL Infrastructure Summary

**Tailwind 3.4.x + local Bootstrap 5.2.0 RTL swap + shared applyLocale() + antd ConfigProvider with reactive direction**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T14:13:37Z
- **Completed:** 2026-02-18T14:16:47Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Upgraded TailwindCSS from 3.1.8 to 3.4.19, unlocking `ms-*`/`me-*`/`ps-*`/`pe-*` logical property utilities for future RTL class migration
- Eliminated CDN dependency: Bootstrap 5.2.0 LTR and RTL CSS now served from local `/css/` path, preventing race conditions on language switch
- Created `front/src/lib/rtl.ts` with a single `applyLocale()` function that handles all locale-switching logic: localStorage, i18n.changeLanguage, document.documentElement.dir, and Bootstrap CSS swap
- Fixed `document.dir` bug in both POS and Admin language switchers (was targeting `<body>`, now correctly targets `<html>` via `document.documentElement.dir`)
- Added Noto Sans Arabic @font-face declarations in `ltr.scss` (Regular 400 + Bold 700) and applied via `[dir="rtl"]` selector in `index.scss`
- Wrapped entire app in antd `ConfigProvider` with direction reactive to `i18n.on('languageChanged')` — covers all antd modals, dropdowns, and portals

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade Tailwind and install Bootstrap locally** - `56bb385` (feat)
2. **Task 2: Create shared RTL utility, update language switchers, add Arabic font, add ConfigProvider** - `6f447ec` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `front/src/lib/rtl.ts` — Shared `applyLocale(lang)` utility; uses `document.documentElement.dir`, `i18n.dir(lang)`, local Bootstrap href swap
- `front/public/css/bootstrap.min.css` — Local Bootstrap 5.2.0 LTR CSS (copied from node_modules)
- `front/public/css/bootstrap.rtl.min.css` — Local Bootstrap 5.2.0 RTL CSS (copied from node_modules)
- `front/package.json` — tailwindcss upgraded to ^3.3.0 (resolved to 3.4.19), bootstrap@5.2.0 added
- `front/index.html` — Bootstrap link href changed from CDN to `/css/bootstrap.min.css`; inline script swaps to `/css/bootstrap.rtl.min.css` for Arabic
- `front/src/index.tsx` — Added `AppWithDirection` component with `ConfigProvider direction={direction}`; reactive via `i18n.on('languageChanged')`
- `front/src/css/ltr.scss` — Added `@font-face` declarations for NotoSansArabic Regular (400) and Bold (700)
- `front/src/css/index.scss` — Added `font-family: 'NotoSansArabic', sans-serif` inside `[dir="rtl"]` block
- `front/src/app-frontend/components/modes/topbar.right.tsx` — Replaced inline locale-swap logic with `applyLocale(newLocale)`
- `front/src/app-admin/containers/layout/navbar.tsx` — Replaced inline locale-swap logic with `await applyLocale(lang)`

## Decisions Made

- `applyLocale()` uses `i18n.dir(lang)` from i18next instead of hardcoding 'rtl'/'ltr' — direction is authoritative from i18next
- `document.documentElement.dir` used (targets `<html>` element) rather than `document.dir` which incorrectly targets `<body>`
- Bootstrap CSS served locally from `public/css/` to eliminate CDN race conditions; files copied from `node_modules/bootstrap/dist/css/`
- Tailwind npm install required `--legacy-peer-deps` flag due to pre-existing peer conflict between `@nivo@0.79.x` and React 18 (unrelated to this plan; already present in the project)
- `ConfigProvider` placed inside `I18nextProvider` (so i18n is available for initial direction) but wraps `ApolloProvider` + app components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm install tailwindcss@^3.3.0` failed without `--legacy-peer-deps` due to pre-existing `@nivo/annotations@0.79.1` peer dependency conflict requiring React `>=16.14.0 < 18.0.0` (project uses React 18). Resolved by using `--legacy-peer-deps` flag. This conflict predates this plan and is unrelated to the Tailwind upgrade.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RTL infrastructure complete; Phase 6 Plan 02 can begin replacing `ml-*`/`mr-*` margin classes with Tailwind logical property equivalents (`ms-*`/`me-*`)
- The `applyLocale()` utility is the single source of truth for language switching — all future locale-related code should import from `src/lib/rtl.ts`
- No blockers.

---
*Phase: 06-rtl-and-arabic-completion*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: front/src/lib/rtl.ts
- FOUND: front/public/css/bootstrap.min.css
- FOUND: front/public/css/bootstrap.rtl.min.css
- FOUND: .planning/phases/06-rtl-and-arabic-completion/06-01-SUMMARY.md
- FOUND commit: 56bb385 (Task 1)
- FOUND commit: 6f447ec (Task 2)
