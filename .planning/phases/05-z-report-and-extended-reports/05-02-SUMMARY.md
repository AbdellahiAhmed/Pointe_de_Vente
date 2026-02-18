---
phase: 05-z-report-and-extended-reports
plan: 02
subsystem: api
tags: [symfony, dql, reporting, analytics, rest-api]

# Dependency graph
requires:
  - phase: 02-data-model-fixes
    provides: "costAtSale column, isSuspended filter, decimal financial columns"
  - phase: 05-z-report-and-extended-reports plan 01
    provides: "Z-report foundation endpoints (sales, profit, daily)"
provides:
  - "GET /admin/report/vendor endpoint with per-vendeur breakdown"
  - "GET /admin/report/category endpoint with per-category breakdown"
  - "Enhanced daily report with top vendors, J-1 comparison, average basket"
  - "Enhanced profit report with margin % per product"
affects: [05-z-report-and-extended-reports plan 03, 07-ui-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DQL GROUP BY with computed fields post-query via array_map"
    - "J-1 comparison pattern for day-over-day analytics"

key-files:
  created: []
  modified:
    - "back/src/Controller/Api/Admin/ReportController.php"

key-decisions:
  - "Vendor query joins through Order.user relationship, groups by User.displayName"
  - "Category query uses ManyToMany join through Product.categories for full attribution"
  - "Margin computed post-query via array_map to avoid DQL complexity"
  - "Yesterday comparison uses separate queries rather than single complex query for clarity"

patterns-established:
  - "Post-query computed fields: use array_map on DQL results for derived metrics (margin, averageBasket)"
  - "Day comparison: separate queries for current vs previous day data"

requirements-completed: [RAPT-01, RAPT-02, RAPT-03, RAPT-04, RAPT-05]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 5 Plan 2: Extended Reports Summary

**Vendor/category report endpoints plus daily top-vendors, J-1 comparison, and per-product margin in profit report**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T13:15:54Z
- **Completed:** 2026-02-18T13:18:26Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added vendor report endpoint with per-vendeur revenue, order count, and average basket breakdown
- Added category report endpoint with per-category revenue, cost, gross profit, and profit margin
- Enhanced daily report with top 5 vendors, yesterday (J-1) comparison data, and average basket metric
- Enhanced profit report topProducts with per-product margin percentage
- Confirmed sales report already includes averageBasket (no change needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add vendor and category report endpoints** - `77390e7` (feat)
2. **Task 2: Enhance daily, profit, and sales endpoints** - `b42627c` (feat)

## Files Created/Modified
- `back/src/Controller/Api/Admin/ReportController.php` - Added vendor(), category() methods; enhanced daily() with topVendors/yesterday/averageBasket; enhanced profit() topProducts with margin field; added User import

## Decisions Made
- Vendor query joins Order -> User via `o.user` relationship, using `u.displayName` for human-readable names
- Category query joins through ManyToMany `prod.categories` for full attribution (products in multiple categories counted in each)
- Per-product margin computed post-query via `array_map` rather than in DQL to keep queries simple
- Yesterday comparison implemented as two separate queries (revenue + orders) for clarity and maintainability
- Sales endpoint already had averageBasket -- confirmed present, no modification needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five RAPT requirements (RAPT-01 through RAPT-05) are now satisfied
- Extended report endpoints ready for frontend consumption in Phase 7 (UI redesign)
- Z-report PDF generation (plan 03) can proceed independently

## Self-Check: PASSED

- FOUND: back/src/Controller/Api/Admin/ReportController.php
- FOUND: .planning/phases/05-z-report-and-extended-reports/05-02-SUMMARY.md
- FOUND: commit 77390e7 (Task 1)
- FOUND: commit b42627c (Task 2)

---
*Phase: 05-z-report-and-extended-reports*
*Completed: 2026-02-18*
