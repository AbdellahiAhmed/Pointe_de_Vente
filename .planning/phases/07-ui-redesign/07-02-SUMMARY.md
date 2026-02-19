---
phase: 07-ui-redesign
plan: 02
subsystem: admin-dashboard
tags: [nivo, charts, dashboard, reports, users, kpi, rbac]
dependency_graph:
  requires: [07-01]
  provides: [admin-dashboard-kpi, report-charts, user-management-ui]
  affects: [admin-ui]
tech_stack:
  added: ["@nivo/bar@0.87.0", "@nivo/pie@0.87.0", "@nivo/line@0.87.0", "@nivo/core@0.87.0"]
  patterns: ["Nivo ResponsiveBar", "Nivo ResponsivePie", "Bootstrap modal (no Tailwind)", "Explicit chart height containers"]
key_files:
  created: []
  modified:
    - front/package.json
    - front/src/app-admin/containers/dashboard/dashboard.tsx
    - front/src/app-admin/containers/reports/sales-report.tsx
    - front/src/app-admin/containers/reports/category-report.tsx
    - front/src/app-admin/containers/reports/vendor-report.tsx
    - front/src/app-admin/containers/reports/profit-report.tsx
    - front/src/app-admin/containers/reports/daily-report.tsx
    - front/src/app-admin/containers/dashboard/users/index.tsx
    - front/src/language/lang.fr.json
    - front/src/language/lang.ar.json
decisions:
  - "Used backend.app.ts USER_LIST/CREATE/EDIT routes (not admin.backend.app.ts which belongs to a different messaging project)"
  - "Nivo labelFormat removed in favor of label prop (API changed between 0.79 and 0.87)"
  - "Dashboard KPI layout: 3 cards row 1, 2 cards row 2 (Bootstrap has no 5-col grid)"
  - "Admin Users page uses Bootstrap modal via conditional render + modal-backdrop (no JS modal.show())"
  - "Password field optional on edit (leave empty = keep current)"
metrics:
  duration: "~25min"
  completed: "2026-02-19"
  tasks_completed: 2
  files_changed: 10
---

# Phase 7 Plan 02: Admin Dashboard KPI + Charts + User Management Summary

Nivo 0.87 charts on 5 admin report pages, 5-card KPI dashboard, and complete user management page with ROLE_VENDEUR/ROLE_MANAGER/ROLE_ADMIN support.

## What Was Built

### Task 1: Nivo Upgrade + Dashboard KPI + Report Charts (commit 76cadb5)

**Nivo upgrade:** `@nivo/core`, `@nivo/bar`, `@nivo/pie` upgraded from 0.79.x to 0.87.0; `@nivo/line@0.87.0` added (React 18 peer dep conflict resolved).

**Dashboard (`dashboard.tsx`):** Added 2 new KPI cards to the existing 3:
- **Average Basket** — reads `averageBasket` from existing `REPORT_DAILY` endpoint response
- **Low Stock Count** — fetches separately from `STOCK_ALERTS` endpoint; displayed in amber with warning icon. Layout: row 1 = Sales/Revenue/Profit (3×col-md-4), row 2 = Avg Basket/Low Stock (2×col-md-6).

**Report charts (all use explicit `style={{ height: N }}` containers):**
- `sales-report.tsx`: `ResponsiveBar` for payment breakdown (vertical, paired color scheme) + existing table below
- `category-report.tsx`: `ResponsivePie` (donut, innerRadius=0.5) for revenue distribution, chart above table
- `vendor-report.tsx`: `ResponsiveBar` horizontal layout for revenue by vendor, dynamic height based on vendor count
- `profit-report.tsx`: `ResponsiveBar` grouped mode (profit vs revenue side-by-side) for top 10 products
- `daily-report.tsx`: `ResponsiveBar` for payment breakdown + `ResponsivePie` for top products share, both above respective tables

**Translation keys added (FR + AR):** `per order`, `Low Stock`, `Now`, `Revenue by Category`, `Revenue by Vendor`, `Profit by Product`

### Task 2: Complete Admin Users Page (commit 8915df6)

Replaced the stub `<h5>List</h5>` with a full user management page at `front/src/app-admin/containers/dashboard/users/index.tsx`:

- **Users table:** Bootstrap `table-striped table-hover` with columns: #, Display Name, Username, Email, Role (badge), Status (Active/Inactive badge), Actions
- **Role badges:** `ROLE_VENDEUR`=blue (`bg-primary`), `ROLE_MANAGER`=green (`bg-success`), `ROLE_ADMIN`=red (`bg-danger`)
- **Create User button:** Opens Bootstrap modal (conditional render + `modal-backdrop`) with form: Display Name, Username, Email, Password (required on create, optional on edit), Role dropdown
- **Edit user:** Pre-fills form; POST to `USER_CREATE` for new, PUT to `USER_EDIT` for update
- **Toggle activate/deactivate:** Button in actions column calls `USER_EDIT` with `isActive: !user.isActive`
- **Routes used:** `USER_LIST`, `USER_CREATE`, `USER_EDIT` from `backend.app.ts` (confirmed this is the correct POS routes file)

**Translation keys added (FR + AR):** `Vendor`, `Manager`, `Admin`, `Role`, `Display Name`, `Create User`, `Edit User`, `Saving...`, `Leave empty to keep current`, `Activate`, `Deactivate`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Nivo 0.87 `labelFormat` prop removed**
- **Found during:** Task 1 - vendor-report chart
- **Issue:** `labelFormat` prop was removed in Nivo 0.87; using it would cause a TypeScript error
- **Fix:** Used `label` prop with inline function `(d) => new Intl.NumberFormat('fr-FR').format(Number(d.value))`
- **Files modified:** `vendor-report.tsx`
- **Commit:** 76cadb5

**2. [Rule 2 - Missing] Additional translation keys for Users page not in plan**
- **Found during:** Task 2 - building the modal form
- **Issue:** Plan listed translation keys but missed `Saving...`, `Leave empty to keep current`, `Activate`, `Deactivate`
- **Fix:** Added all 4 keys to both `lang.fr.json` and `lang.ar.json`
- **Files modified:** `lang.fr.json`, `lang.ar.json`
- **Commit:** 8915df6

**3. [Rule 1 - Clarification] admin.backend.app.ts is NOT the correct routes file**
- **Found during:** Task 2 planning
- **Issue:** Plan referenced `admin.backend.app.ts` for USER_LIST/CREATE/EDIT but that file belongs to a different messaging product (has GROUP_LIST, SENT_LIST, TEMPLATE_LIST etc.) — not the POS
- **Fix:** Used `backend.app.ts` which has the correct POS-specific user routes (`/users`, `/admin/user/create`, `/admin/user/:id`)
- **Decision recorded:** See decisions section

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript errors in admin files | 0 errors |
| Production build | SUCCESS (15.94s) |
| `@nivo/core` version | 0.87.0 |
| `@nivo/line` installed | 0.87.0 |
| `averageBasket` in dashboard.tsx | FOUND |
| `STOCK_ALERTS` in dashboard.tsx | FOUND |
| `ResponsiveBar` in sales-report.tsx | FOUND |
| `ResponsivePie` in category-report.tsx | FOUND |
| `ResponsiveBar` in vendor-report.tsx | FOUND |
| `ResponsiveBar` in profit-report.tsx | FOUND |
| `ROLE_VENDEUR` in users/index.tsx | FOUND |
| Stub "List" text replaced | CONFIRMED |

## Self-Check: PASSED
