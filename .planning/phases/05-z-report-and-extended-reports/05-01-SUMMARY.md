---
phase: 05-z-report-and-extended-reports
plan: 01
subsystem: api
tags: [z-report, closing, cqrs, doctrine, json-snapshot, immutable-data]

# Dependency graph
requires:
  - phase: 02-data-model-fixes
    provides: "decimal(20,2) closing columns, isSuspended filter, costAtSale"
  - phase: 04-stock-payment
    provides: "Payment.category column for cash/mobile/credit bucketing"
provides:
  - "Closing.zReportNumber (INT UNIQUE) and Closing.zReportSnapshot (JSON) columns"
  - "CloseSessionCommand CQRS with transactional snapshot aggregation"
  - "POST /admin/closing/{id}/close endpoint"
  - "GET /admin/closing/{id}/z-report-data endpoint"
  - "ClosingDto serialization of zReportNumber and zReportSnapshot"
affects: [05-02, 05-03, 06-advanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [immutable-snapshot, transactional-sequential-numbering, cqrs-command-pattern]

key-files:
  created:
    - back/migrations/Version20260217_ZReport.php
    - back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommand.php
    - back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommandHandler.php
    - back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommandHandlerInterface.php
    - back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommandResult.php
  modified:
    - back/src/Entity/Closing.php
    - back/src/Core/Dto/Common/Closing/ClosingDto.php
    - back/src/Controller/Api/Admin/ClosingController.php

key-decisions:
  - "Sequential zReportNumber assigned inside DB transaction with MAX+1 to guarantee uniqueness"
  - "Snapshot includes payment category for cash reconciliation rather than re-querying Payment entity"
  - "Query scoping uses createdAt datetime range (not DATE()) for precision within session boundaries"

patterns-established:
  - "Immutable snapshot: Z-Report data frozen at close time, never recalculated"
  - "Cash reconciliation formula: expected = opening + cashReceived + cashAdded - cashWithdrawn - expenses"

requirements-completed: [ZRPT-01, ZRPT-02, ZRPT-03, ZRPT-04, ZRPT-05, ZRPT-06, ZRPT-08]

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 5 Plan 1: Z-Report Backend Summary

**Immutable Z-Report snapshot pipeline with CloseSessionCommand CQRS, sequential numbering, and close/z-report-data API endpoints behind ClosingVoter::MANAGE**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T13:16:16Z
- **Completed:** 2026-02-18T13:20:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Closing entity extended with zReportNumber (INT UNIQUE nullable) and zReportSnapshot (JSON nullable) columns, migration applied
- CloseSessionCommandHandler aggregates sales, payments, cash reconciliation, and denominations into a frozen immutable JSON snapshot with sequential numbering inside a DB transaction
- POST /admin/closing/{id}/close assigns zReportNumber and persists snapshot; rejects already-closed sessions with 422
- GET /admin/closing/{id}/z-report-data returns the frozen snapshot JSON
- Both endpoints gated by ClosingVoter::MANAGE (ROLE_MANAGER and ROLE_ADMIN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Closing entity migration and DTO update** - `fc4c170` (feat)
2. **Task 2: CloseSessionCommand with snapshot aggregation and close/z-report-data endpoints** - `d124386` (feat)

## Files Created/Modified
- `back/src/Entity/Closing.php` - Added zReportNumber and zReportSnapshot properties with ORM annotations
- `back/migrations/Version20260217_ZReport.php` - Migration adding two columns and unique index
- `back/src/Core/Dto/Common/Closing/ClosingDto.php` - DTO serialization for new fields
- `back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommand.php` - Command DTO (id, closedBy, closingBalance, denominations)
- `back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommandHandler.php` - Handler with buildSnapshot(), aggregateSales(), aggregatePayments(), buildCashReconciliation()
- `back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommandHandlerInterface.php` - Handler interface for autowiring
- `back/src/Core/Closing/Command/CloseSessionCommand/CloseSessionCommandResult.php` - Result with alreadyClosed factory
- `back/src/Controller/Api/Admin/ClosingController.php` - Added closeSession() and zReportData() actions

## Decisions Made
- Sequential zReportNumber assigned via MAX+1 inside a DB transaction to guarantee uniqueness without a separate sequence table
- Snapshot aggregation queries use datetime range (createdAt >= dateFrom AND createdAt <= dateTo) rather than DATE() for precision within session boundaries
- Payment breakdown includes category field from Payment entity to enable cash reconciliation without additional queries
- Cash reconciliation reuses aggregatePayments() result to avoid duplicate DB queries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed Doctrine-generated unique index**
- **Found during:** Task 1 (verification step)
- **Issue:** Migration created index named `uniq_closing_z_report_number` but Doctrine expected `UNIQ_5542EBB47708577F`
- **Fix:** Ran ALTER TABLE RENAME INDEX to match Doctrine's naming convention
- **Files modified:** Database only (runtime fix)
- **Verification:** doctrine:schema:update --dump-sql shows no closing-related changes
- **Committed in:** fc4c170 (part of Task 1)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor index naming mismatch, no scope creep.

## Issues Encountered
None beyond the index naming issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Z-Report backend pipeline fully operational
- Ready for Plan 02 (frontend Z-Report PDF rendering with @react-pdf/renderer)
- Snapshot JSON shape established for frontend consumption: store, terminal, sales, paymentBreakdown, cashReconciliation, denominations

## Self-Check: PASSED

All 8 created/modified files verified on disk. Both task commits (fc4c170, d124386) verified in git log.

---
*Phase: 05-z-report-and-extended-reports*
*Completed: 2026-02-18*
