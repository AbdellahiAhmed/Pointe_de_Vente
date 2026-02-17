# Stack Research

**Domain:** Point of Sale — Mauritanian boutique/restaurant (existing Symfony 5.4 + React 18 app)
**Researched:** 2026-02-17
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; based on project code inspection + training knowledge; confidence noted per section)

---

## Context: What the Existing App Already Has

Before recommending new additions, here is what was confirmed by reading the actual codebase:

| Layer | Already Present |
|-------|----------------|
| Backend | Symfony 5.4, API Platform 2.7, Doctrine ORM 2.10, JWT (lexik), CQRS (Commands + Handlers), MariaDB, Docker |
| Backend security | `symfony/security-bundle` 5.4, LexikJWT, simple `ROLE_USER` / `ROLE_ADMIN` on the `User` entity (`roles[]` array) |
| Backend inventory | `Product.cost` (string), `ProductStore.quantity` + `ProductStore.reOrderLevel` (decimal), PMP calculation stub in `PurchaseEvent.php` |
| Backend closing | `Closing` entity with `openingBalance`, `closingBalance`, `cashAdded`, `cashWithdrawn`, `data` (JSON), CQRS command exists |
| Frontend | React 18, TypeScript 4, Vite 4, TailwindCSS 3, Redux + Saga, Jotai, TanStack Query v4, Ant Design 5, i18next 21 |
| Frontend i18n | `lang.fr.json` (510 lines), `lang.ar.json` (504 lines — close to FR but with gaps), RTL set via `document.dir` and Bootstrap RTL CDN swap |
| Frontend print | `PrintService` opens a browser `window.open()` + `window.print()` — no PDF library |
| Frontend charts | `@nivo/bar` + `@nivo/pie` 0.79 |
| Frontend tables | `@tanstack/react-table` v8 |
| Restaurant doc | `back/docs/RESTAURANT_VERSION.md` — complete technical spec, not yet implemented |

**Key gaps identified (what this milestone must add):**
1. RBAC: only `ROLE_USER`/`ROLE_ADMIN` exist; no voter pattern, no granular permissions
2. PMP: calculation stub is in place but `Product.cost` is a string field (should be decimal), no audit trail per purchase
3. Z-Report: closing modal exists in the POS UI but no printable/PDF Z-Report document
4. Stock alerts: `reOrderLevel` field exists, but no query, notification, or UI for it
5. RTL: `document.dir` toggle exists, but TailwindCSS has no RTL variant activated; layout is not truly bidirectional
6. Arabic translation: 504 lines vs 510 lines in FR — close but likely has untranslated strings added recently
7. Restaurant doc: exists as a planning document only

---

## Recommended Stack — New Additions Only

### Backend: RBAC

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|-----------|
| `symfony/security-bundle` (built-in) | 5.4.* (already installed) | Role hierarchy + Voters | Already in `composer.json`. Symfony's native voter pattern (`AbstractVoter`) is the idiomatic Symfony 5.4 RBAC mechanism — no extra library needed. Role hierarchy is configured in `security.yaml`. | HIGH |
| No additional RBAC library | — | — | Do NOT add `casbin/casbin` or similar third-party RBAC libs. They add complexity incompatible with Symfony's Security component, which already handles everything needed: role hierarchy, voters, `is_granted()` in controllers and Twig. | HIGH |

**What to implement (no new packages, configuration only):**

```yaml
# config/packages/security.yaml — add role hierarchy
security:
  role_hierarchy:
    ROLE_ADMIN: [ROLE_MANAGER, ROLE_CASHIER]
    ROLE_MANAGER: [ROLE_CASHIER, ROLE_REPORTS]
    ROLE_CASHIER: [ROLE_USER]
    ROLE_REPORTS: [ROLE_USER]
```

Voters: create `src/Security/Voter/` classes extending `AbstractVoter` for per-resource access control (e.g., `ClosingVoter`, `ReportVoter`). Use `#[IsGranted]` attribute on controllers (compatible with Symfony 5.4 via `sensio/framework-extra-bundle` which is already installed).

**Frontend RBAC pattern (no new packages):**
- Store `roles[]` in Redux auth state (already fetched via JWT payload)
- Create a `usePermission(role)` hook that reads from Redux
- Conditionally render menu items and route guards

---

### Backend: PMP / Weighted Average Cost

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|-----------|
| No new package | — | PMP calculation | The formula is pure PHP arithmetic. The stub in `PurchaseEvent.php` already implements the correct PMP formula. The only fix needed is a database schema migration to change `Product.cost` from `type="string"` to `type="decimal", precision=10, scale=4`. | HIGH |
| `doctrine/doctrine-migrations-bundle` | ^3.2 (already installed) | Schema migration for cost field | Already in `composer.json`. Run `php bin/console doctrine:migrations:diff` after changing the ORM mapping. | HIGH |

**What NOT to do:** Do not add a separate `CostHistory` entity at this stage unless audit requirements mandate it. The `gedmo/doctrine-extensions` (`@Gedmo\Loggable()` + `@Gedmo\Versioned()`) are already installed and active on `Product` — the cost field just needs `@Gedmo\Versioned()` added to track changes automatically.

---

### Backend: Z-Report / Day Closing

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|-----------|
| No new package | — | Z-Report data aggregation | The `Closing` entity + `ClosingRepository` exist. A dedicated `ClosingController::zReport()` endpoint that joins `Order`, `OrderProduct`, `Payment`, `Expense` tables via Doctrine DQL is sufficient. Backend generates the data; frontend renders to PDF. | HIGH |
| `dompdf/dompdf` (optional, backend PDF) | ^2.0 | Server-side PDF generation | Only add if offline/email dispatch of Z-Reports is required. If PDFs are generated client-side (preferred, see frontend), skip this entirely. | LOW |

**Recommended approach:** Generate the Z-Report as a JSON API endpoint, render it on the frontend with `@react-pdf/renderer` (see frontend section below). This avoids PHP PDF complexity and allows Arabic RTL in the PDF via custom fonts.

---

### Backend: Stock Alerts

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|-----------|
| No new package | — | Stock alert detection | `ProductStore.reOrderLevel` already exists as a decimal column. Add a repository query `ProductStoreRepository::findBelowReorderLevel()` comparing `quantity <= reOrderLevel`. Expose as a dedicated API endpoint. | HIGH |
| Symfony Messenger (built-in, optional) | 5.4.* | Async notification dispatch | Only needed if email/SMS alerts are required. For in-app badge alerts, a simple query at page load is sufficient. `symfony/messenger` is available but not in `composer.json` yet. | MEDIUM |

---

### Frontend: PDF Generation (Z-Report + Receipts)

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|-----------|
| `@react-pdf/renderer` | ^3.4 | Client-side PDF generation | The existing `PrintService` uses `window.print()` on a new browser window — fragile and not styleable. `@react-pdf/renderer` generates real PDF documents in the browser with full control over layout, fonts, and RTL. It supports Arabic text via embedded fonts (Amiri, Cairo, or Noto Sans Arabic). This is the standard library for PDF generation in React ecosystems as of 2025. | MEDIUM |

**Why not alternatives:**
- `react-to-print`: still uses `window.print()`, same fragility as current solution, no true PDF output
- `jsPDF`: HTML-to-canvas approach, Arabic text often breaks; poor RTL support
- `pdfmake`: viable but requires a separate non-React API; `@react-pdf/renderer` integrates naturally with React component model

**Arabic font for PDF:** Embed the Amiri or Cairo font (Google Fonts, OFL license) as a base64 string or via URL in `Font.register()`. This is the only way to get Arabic in `@react-pdf/renderer` PDFs.

```bash
# Frontend installation
yarn add @react-pdf/renderer
```

**Note on version:** `@react-pdf/renderer` v3.x requires React 18, which matches. Confirm compatibility at install time. (MEDIUM confidence — based on training knowledge; verify at `npmjs.com/package/@react-pdf/renderer`)

---

### Frontend: RTL / TailwindCSS Bidirectional Layout

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|-----------|
| `tailwindcss` | ^3.3 (upgrade from 3.1.8) | RTL logical properties | TailwindCSS 3.3+ added native RTL support via logical property utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`. Upgrade from 3.1.8 to 3.3+ is non-breaking and unlocks `dir="rtl"` support without needing `tailwindcss-rtl` plugin. | HIGH |

**Migration pattern:** Replace directional utilities (`pl-`, `pr-`, `ml-`, `mr-`) with logical equivalents (`ps-`, `pe-`, `ms-`, `me-`). Set `dir` attribute on `<html>` when language switches (already partially done via `document.dir` in `navbar.tsx`).

**What NOT to add:** Do NOT add `@radix-ui/react-direction` or `tailwindcss-rtl` plugin. TailwindCSS 3.3 native logical properties handle it natively. The `dir="rtl"` on the root element is the only trigger needed.

**Bootstrap RTL CDN swap:** The current code swaps Bootstrap RTL via CDN when Arabic is selected. This is acceptable but fragile (CDN dependency). If a full redesign is planned, migrate off Bootstrap CDN entirely and use only TailwindCSS with logical properties.

---

### Frontend: Role-Based UI Guards

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|-----------|
| No new library | — | Permission-based rendering | Redux auth state already holds `roles[]`. A `usePermission(role: string): boolean` hook (pure TypeScript, ~10 lines) is sufficient. Do NOT add `casl/casl` or `react-access` — they add a new abstraction layer on top of what's already a simple array check for 3-4 roles. | HIGH |

---

### Frontend: Stock Alert Badge

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|-----------|
| Ant Design 5 `Badge` (already installed) | ^5.4.7 (already installed) | Alert badge on nav | `antd` is already in `package.json`. Use `<Badge count={alertCount}>` on the inventory nav item. No new library needed. | HIGH |

---

### Frontend: Z-Report Print UI

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|-----------|
| `@react-pdf/renderer` | ^3.4 | Printable/downloadable Z-Report | Same library as above. Create a `ZReportDocument` component using `@react-pdf/renderer` primitives. Render via `<PDFDownloadLink>` for download or `<PDFViewer>` for in-app preview. | MEDIUM |

---

### Backend: Restaurant Documentation Implementation

The restaurant spec (`back/docs/RESTAURANT_VERSION.md`) is complete. For the new milestone, document generation is needed, not new libraries.

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|-----------|
| Symfony Mercure Bundle | ^0.3 | Real-time KDS | Already recommended in the restaurant spec. Mercure is the Symfony-native SSE/push protocol; the Hub runs as a Docker container. Only needed for KDS (Kitchen Display System) real-time updates. | MEDIUM |
| `@dnd-kit/core` + `@dnd-kit/sortable` | ^6.1 | Drag & drop floor plan | The restaurant spec recommends `react-dnd` or `@dnd-kit`. Prefer `@dnd-kit` because it is actively maintained, has no peer dependency on `react-dnd-html5-backend`, and has better mobile/touch support for restaurant tablets. `react-dnd` has had inconsistent release cadence. | MEDIUM |

---

## Installation Commands

```bash
# Backend — no new packages needed for RBAC, PMP, stock alerts
# Only add Mercure if KDS real-time is in scope this milestone:
composer require symfony/mercure-bundle

# Frontend — only react-pdf is new
yarn add @react-pdf/renderer

# Frontend — TailwindCSS upgrade (minor version, non-breaking)
yarn add -D tailwindcss@^3.3

# Frontend — if restaurant floor plan drag & drop is in scope this milestone:
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Alternatives Considered

| Recommended | Alternative | When Alternative is Better |
|-------------|-------------|---------------------------|
| Native Symfony Voters for RBAC | `casbin/casbin-symfony-bridge` | When permissions are attribute-based (ABAC) and managed dynamically by end users via a UI. Not needed here — 4 static roles. |
| `@react-pdf/renderer` for Z-Report PDF | `dompdf/dompdf` (backend) | When PDF must be generated headlessly (cron, email attachment). For on-demand UI printing, client-side wins on Arabic support. |
| TailwindCSS 3.3 logical properties for RTL | `tailwindcss-rtl` plugin | When on Tailwind < 3.3 and can't upgrade. Since 3.3+ is a minor upgrade, no reason to use the plugin. |
| `@dnd-kit` for restaurant floor plan | `react-dnd` | When the project already has `react-dnd` installed. Neither is installed; `@dnd-kit` has better touch/mobile support. |
| Custom `usePermission()` hook | `casl` permission library | When permissions are complex rules with conditions (e.g., "user can edit only their own orders"). For role-check only, CASL is overkill. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jsPDF` for Z-Report | Arabic RTL text rendering is broken in jsPDF without complex workarounds. Fonts must be manually embedded and bidi algorithm handled manually. | `@react-pdf/renderer` with Amiri/Cairo font embedded |
| `react-to-print` for Z-Report | Wraps `window.print()` — same approach as current `PrintService`. Cannot guarantee page breaks, Arabic fonts, or consistent styling. | `@react-pdf/renderer` |
| `casbin` or similar ABAC library | Incompatible with Symfony Security component mental model. Adds a parallel permission system that conflicts with `is_granted()` and voters. | Symfony Voters + Role Hierarchy |
| `dompdf` for on-demand UI reports | Generates PDFs server-side which must be served as HTTP responses. Arabic support requires embedding Arabic fonts in PHP — complex and fragile. | `@react-pdf/renderer` client-side |
| Bootstrap CDN swap for RTL | Network dependency; inconsistent with Tailwind-first approach; not tree-shakeable | TailwindCSS 3.3 logical properties + `dir="rtl"` on root |
| Upgrading to API Platform 3.x | Breaking change — requires PHP 8.1+, complete annotation-to-attribute migration, new resource metadata model. Current Symfony 5.4 + API Platform 2.7 is LTS-stable. | Stay on API Platform 2.7 |
| Upgrading to Symfony 6.x/7.x | Requires PHP 8.1+ minimum, breaking changes in Security component. Constraint says must stay on 5.4. | Stay on Symfony 5.4 |
| `antd` upgrade to 6.x | Not released as of research date; no reason to chase. v5.4.7 is already installed and stable. | Stay on Ant Design 5 |

---

## Stack Patterns by Feature

**For RBAC (roles: ADMIN, MANAGER, CASHIER, REPORTS):**
- Role hierarchy in `security.yaml` (no code change)
- One voter per protected resource or action group (not one voter per role)
- Frontend: `usePermission(role)` hook, `<ProtectedRoute>` wrapper
- Include roles in JWT payload claims via `lexik_jwt_authentication.yaml` `user_identity_field` or a custom `JWTCreatedListener`

**For PMP (weighted average cost):**
- Fix `Product.cost` column type: `string` → `decimal(10,4)` via migration
- Add `@Gedmo\Versioned()` annotation to `cost` field (free audit trail)
- The PMP formula in `PurchaseEvent.php` is already correct — no rewrite needed
- Expose `cost` in product list API response for margin calculation display

**For Z-Report:**
- Backend: one new endpoint `GET /api/admin/closings/{id}/z-report` returning aggregated JSON (totals by payment type, product category, tax, hourly breakdown)
- Frontend: `ZReportDocument.tsx` using `@react-pdf/renderer` — bidirectional (FR left-to-right, AR right-to-left based on current `i18n.language`)
- Embed Amiri font (Arabic) + a Latin font (system or Inter) via `Font.register()`

**For Stock Alerts:**
- Backend: `ProductStoreRepository::findBelowReorderLevel(Store $store): array`
- Expose as `GET /api/admin/stock/alerts` returning products where `quantity <= reOrderLevel`
- Frontend: TanStack Query polling every 5 minutes (use `refetchInterval: 300000`)
- Display: Ant Design `Badge` on the inventory nav item, `Table` with red row highlighting for alerted products

**For RTL / Arabic:**
- `tailwindcss` upgrade to ^3.3 in `devDependencies`
- Add `dir` attribute to root element on language switch (already done in `navbar.tsx` for `document.dir`; extend to `<html>` tag via React root)
- Replace physical CSS properties (`pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`) with logical (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`)
- Ant Design 5 has built-in RTL: wrap with `<ConfigProvider direction="rtl">` when Arabic is active
- i18next: already configured for AR; audit `lang.ar.json` for missing keys using `i18next-parser` in CI

**For Restaurant mode:**
- Backend: implement entities from `RESTAURANT_VERSION.md` spec
- Frontend: `@dnd-kit` for floor plan drag & drop
- Real-time KDS: `symfony/mercure-bundle` (backend) + native `EventSource` API (frontend, no extra library)

---

## Version Compatibility

| Package | Current | Target/Compatible | Notes |
|---------|---------|-------------------|-------|
| `tailwindcss` | 3.1.8 | ^3.3 | Non-breaking minor upgrade; logical property utilities added in 3.3 |
| `@tanstack/react-query` | 4.29.7 | 4.x (stay) | v5 has breaking API changes; do not upgrade this milestone |
| `i18next` | 21.8.16 | 21.x (stay) | v22+ has breaking changes in plugin API |
| `react-i18next` | 11.18.3 | 11.x (stay) | Matches i18next 21.x; upgrade path exists but not needed |
| `@react-pdf/renderer` | (new) | ^3.4 | Requires React 16.8+; compatible with React 18 |
| `antd` | 5.4.7 | 5.x (stay) | No upgrade needed; `ConfigProvider direction="rtl"` available in v5 |
| `@dnd-kit/core` | (new) | ^6.1 | React 18 compatible; no peer conflicts |
| `symfony/security-bundle` | 5.4.* | 5.4.* (stay) | Already installed; role hierarchy config change only |

---

## Sources

- Project source code inspection (direct read of `back/composer.json`, `front/package.json`, `back/src/Entity/User.php`, `back/src/Entity/ProductStore.php`, `back/src/EventSubscriber/Purchase/PurchaseEvent.php`, `back/config/packages/security.yaml`, `back/docs/RESTAURANT_VERSION.md`, `front/src/i18next.ts`, `front/tailwind.config.js`) — HIGH confidence
- Symfony 5.4 Security component voter pattern — HIGH confidence (core Symfony feature, well-established)
- TailwindCSS 3.3 logical properties (`ms-`, `me-`, `ps-`, `pe-`) — HIGH confidence (documented since 3.3 release)
- `@react-pdf/renderer` v3 Arabic font support via `Font.register()` — MEDIUM confidence (based on training knowledge; official docs at `react-pdf.org` should be verified)
- Ant Design 5 `ConfigProvider direction="rtl"` — HIGH confidence (documented antd v5 feature)
- `@dnd-kit` vs `react-dnd` comparison — MEDIUM confidence (actively maintained as of 2024; check npmjs for latest version at install time)
- PMP formula correctness — HIGH confidence (pure arithmetic, verified against the stub in `PurchaseEvent.php`)

---

## Open Questions (Validate Before Implementation)

1. **`@react-pdf/renderer` Arabic RTL rendering:** Confirm that v3.4 correctly renders Arabic text right-to-left when font is embedded. The library uses PDFKit under the hood; Arabic bidi algorithm support should be verified against a test document before committing to this library.

2. **`Product.cost` type migration:** MariaDB 10.6 `DECIMAL` vs current `VARCHAR` — validate that existing cost values (stored as strings like `"1500.0000"`) migrate cleanly to `DECIMAL(10,4)` without data loss.

3. **JWT payload roles:** Confirm that the current `lexik/jwt-authentication-bundle` configuration includes `roles` in the JWT token payload. If roles are not in the token, frontend role-checking requires an extra `/api/auth/info` call (the route already exists in `security.yaml`).

4. **TailwindCSS 3.3 upgrade side effects:** Run the full build after upgrading from 3.1.8 to 3.3+ to check for any purge configuration changes. The `content` array in `tailwind.config.js` should remain compatible.

5. **`reOrderLevel` null handling:** `ProductStore.reOrderLevel` is nullable. The stock alert query must exclude products where `reOrderLevel IS NULL` to avoid false alerts.

---

*Stack research for: VelociPOS — milestone adding RBAC, PMP, Z-Report, Stock Alerts, RTL, Restaurant docs*
*Researched: 2026-02-17*
