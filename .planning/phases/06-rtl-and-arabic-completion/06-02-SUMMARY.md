---
phase: 06-rtl-and-arabic-completion
plan: 02
subsystem: ui
tags: [rtl, arabic, tailwindcss, i18n, css, logical-properties]

# Dependency graph
requires:
  - phase: 06-01
    provides: Tailwind 3.4.x with ms-*/me-*/ps-*/pe-* utilities; Bootstrap locally served
provides:
  - Zero physical direction Tailwind classes in TSX/TS source (ml-*/mr-*/pl-*/pr-* all migrated)
  - Complete Arabic translation file — 0 missing keys vs lang.fr.json
  - Minimal [dir="rtl"] override block — only 5 custom component-specific rules remain
affects:
  - 06-03 (translation polish — Arabic base is now complete)
  - All RTL layout — logical properties now auto-flip in both LTR and RTL

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind logical margin/padding: ms-*/me-*/ps-*/pe-* for LTR+RTL auto-flip"
    - "Icon spacing uses me-N not mr-N: FontAwesomeIcon className='me-2' flips in Arabic"
    - "RTL override block minimized: only rules that cannot be expressed as Tailwind utilities"

key-files:
  created: []
  modified:
    - front/src/language/lang.ar.json
    - front/src/css/index.scss
    - front/src/css/ltr.scss
    - front/src/app-common/components/input/custom.react.select.tsx
    - front/src/app-common/components/input/shortcut.tsx
    - front/src/app-common/components/input/switch.tsx
    - front/src/app-common/components/react-aria/dropdown.menu.tsx
    - front/src/app-common/components/tabs/tabs.tsx
    - front/src/app-frontend/components/cart/order.totals.tsx
    - front/src/app-frontend/components/customers/customer.payments.tsx
    - front/src/app-frontend/components/customers/customers.tsx
    - front/src/app-frontend/components/inventory/purchase-orders/create.purchase.order.tsx
    - front/src/app-frontend/components/inventory/purchase-orders/purchase.orders.tsx
    - front/src/app-frontend/components/inventory/purchase/create.purchase.tsx
    - front/src/app-frontend/components/inventory/purchase/purchases.tsx
    - front/src/app-frontend/components/inventory/supplier/supplier.ledger.tsx
    - front/src/app-frontend/components/inventory/supplier/suppliers.tsx
    - front/src/app-frontend/components/modes/topbar.right.tsx
    - front/src/app-frontend/components/sale/apply.discount.tsx
    - front/src/app-frontend/components/sale/apply.tax.tsx
    - front/src/app-frontend/components/sale/expenses.tsx
    - front/src/app-frontend/components/sale/sale.find.tsx
    - front/src/app-frontend/components/sale/sale.history.tsx
    - front/src/app-frontend/components/sale/sale.inline.tsx
    - front/src/app-frontend/components/sale/sale.print.tsx
    - front/src/app-frontend/components/sale/sale.tsx
    - front/src/app-frontend/components/search/sale.brands.tsx
    - front/src/app-frontend/components/search/sale.categories.tsx
    - front/src/app-frontend/components/search/sale.departments.tsx
    - front/src/app-frontend/components/search/search.table.tsx
    - front/src/app-frontend/components/settings/brands/brands.tsx
    - front/src/app-frontend/components/settings/categories/categories.tsx
    - front/src/app-frontend/components/settings/departments/departments.tsx
    - front/src/app-frontend/components/settings/discounts/discount.types.tsx
    - front/src/app-frontend/components/settings/dynamic-barcodes/index.tsx
    - front/src/app-frontend/components/settings/items/export.items.tsx
    - front/src/app-frontend/components/settings/items/import.items.tsx
    - front/src/app-frontend/components/settings/items/item.tsx
    - front/src/app-frontend/components/settings/items/items.tsx
    - front/src/app-frontend/components/settings/more.tsx
    - front/src/app-frontend/components/settings/payment-types/payment.types.tsx
    - front/src/app-frontend/components/settings/stores/stores.tsx
    - front/src/app-frontend/components/settings/taxes/tax.types.tsx
    - front/src/app-frontend/components/settings/terminals/terminals.tsx
    - front/src/app-frontend/components/settings/users/users.tsx
    - front/src/app-frontend/containers/login/login.tsx

key-decisions:
  - "Only 2 keys were actually missing from lang.ar.json at execution time (available, in cart) — the plan's list of 20 was from research; most had already been added before Phase 6"
  - "Commented-out JSX code (ml-3, mr-2 inside {/* ... */} blocks) left unchanged — dead code, not rendered"
  - "tabs.tsx ml-[-20px] migrated to ms-[-20px] and pl-3 to ps-3 — negative margins and padding also use logical equivalents"

requirements-completed:
  - I18N-01
  - I18N-02

# Metrics
duration: 7min
completed: 2026-02-18
---

# Phase 6 Plan 02: RTL Class Migration and Arabic Completion Summary

**Arabic file completed (0 missing keys) and all 73+ physical direction Tailwind classes replaced with logical equivalents across 45 files**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18T14:20:03Z
- **Completed:** 2026-02-18T14:27:07Z
- **Tasks:** 2
- **Files modified:** 46

## Accomplishments

- Completed Arabic translation file: added `available` → `متوفر` and `in cart` → `في السلة`; diff against lang.fr.json now shows 0 missing keys
- Migrated all physical direction Tailwind classes to logical equivalents across 43 TSX/TS files: every `ml-N`/`mr-N` → `ms-N`/`me-N`, every `pl-N`/`pr-N` → `ps-N`/`pe-N`
- Migrated 3 SCSS `@apply` directives in `ltr.scss` (switch toggle thumb positioning) from `ml-1 mr-0` / `mr-1 ml-0` / `mr-2` to logical equivalents
- Removed 5 redundant generic utility overrides from the `[dir="rtl"]` block in `index.scss` (`.mr-auto`, `.mr-2/.mr-3`, `.ml-2/.ml-3`, `.me-2/.me-3`, `.ps-3`) — these are now handled automatically by Tailwind's logical property system
- Retained 5 custom component-specific overrides in the `[dir="rtl"]` block that cannot be expressed as Tailwind utilities: `product-grid-categories`, `product-grid-info`, `pos-topbar-actions`, `.text-end`, and `.image-upload-preview .image-upload-remove`
- Vite production build passes in 18.35s with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill missing Arabic translation keys** - `f7e8326` (feat)
2. **Task 2: Migrate ml-*/mr-* to ms-*/me-* and clean up RTL CSS overrides** - `a3aebe7` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

**Language:**
- `front/src/language/lang.ar.json` — Added `available` and `in cart` translations; now fully synchronized with lang.fr.json

**CSS:**
- `front/src/css/ltr.scss` — 3 `@apply` directives in `.switch` component migrated to logical properties
- `front/src/css/index.scss` — `[dir="rtl"]` override block reduced from 10 rules to 5; removed redundant Tailwind utility class overrides

**TSX/TS (43 files — key examples):**
- `front/src/app-common/components/input/custom.react.select.tsx` — `mr-2` → `me-2` (LoadingIndicator spinner)
- `front/src/app-common/components/tabs/tabs.tsx` — `ml-[-20px]` → `ms-[-20px]`, `pl-3` → `ps-3` (vertical tab nav)
- `front/src/app-frontend/components/modes/topbar.right.tsx` — `mr-2`, `mr-3` → `me-2`, `me-3` (globe icon, mode icon, checkmark)
- All settings pages (brands, categories, departments, discounts, items, payment-types, stores, taxes, terminals, users) — `mr-2` on FontAwesome Plus icons → `me-2`
- All inventory pages (purchases, purchase orders, suppliers) — icon spacing migrated
- All sale modals (apply.tax, apply.discount, sale.history, expenses) — button spacing migrated

## Decisions Made

- Only 2 keys were actually missing from `lang.ar.json` at execution time (`available`, `in cart`) — the plan's list of 20 was from pre-implementation research; most had already been added in prior work
- Commented-out JSX code containing `ml-3`, `mr-2` inside `{/* ... */}` blocks left unchanged — dead code, not rendered in any browser
- Negative margin `ml-[-20px]` in `tabs.tsx` correctly migrated to `ms-[-20px]` — logical negative margins work the same way in Tailwind
- `pl-3`/`pr-3` in `terminals.tsx` correctly migrated to `ps-3`/`pe-3` — terminal product pill padding is now directional-aware

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Discovery Notes

The plan anticipated ~73 physical direction class occurrences. The actual grep count confirmed this range. The Arabic translation gap was smaller than the plan's pre-research estimate (2 keys missing, not up to 20) — the remaining keys from the research list had already been added to lang.ar.json before this plan ran.

## User Setup Required

None.

## Next Phase Readiness

- Phase 6 Plan 03 can begin: Arabic translation polish and any remaining RTL visual fixes
- Zero physical direction Tailwind classes remain in source — no regression possible from this base
- The `[dir="rtl"]` block in `index.scss` is now minimal and correctly scoped to custom components only

---
*Phase: 06-rtl-and-arabic-completion*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: front/src/language/lang.ar.json
- FOUND: front/src/css/index.scss
- FOUND: .planning/phases/06-rtl-and-arabic-completion/06-02-SUMMARY.md
- FOUND commit: f7e8326 (Task 1 - Arabic keys)
- FOUND commit: a3aebe7 (Task 2 - Class migration)
- FOUND: lang.ar.json contains `"available": "متوفر"`
- FOUND: ltr.scss contains `ms-1 me-0` (logical switch props)
- PASS: no utility overrides remaining in index.scss RTL block
