# Codebase Concerns

**Analysis Date:** 2026-02-17

---

## Tech Debt

**Split State Management (Redux + Jotai):**
- Issue: Two concurrent state systems. Redux (`redux`, `redux-saga`, `redux-actions`) manages auth, entity normalization, and app bootstrap. Jotai (`jotai`) manages POS cart state and terminal settings via `atomWithStorage`. No clear rule for which to use where.
- Files: `front/src/duck/` (Redux), `front/src/store/jotai.ts` (Jotai), `front/src/index.tsx`
- Impact: Increased bundle size, cognitive overhead for contributors, unclear ownership of shared state (e.g., store/terminal exists in both Redux and Jotai atoms).
- Fix approach: Pick one system. Jotai with `atomWithStorage` is already handling the most active POS state; migrate Redux auth/entity slices to Jotai or React Query, remove `redux`, `redux-saga`, `redux-actions`.

**Dual Table Library:**
- Issue: Both `react-table` v7 (legacy) and `@tanstack/react-table` v8 are installed and actively imported. `keyboard.table.tsx` and `search.table.tsx` use v7; all settings list components use v8.
- Files: `front/src/app-common/components/table/keyboard.table.tsx`, `front/src/app-frontend/components/search/search.table.tsx`, `front/src/app-frontend/components/modes/payment.tsx` (v7 `Row` import), all settings list components (v8)
- Impact: Double the table code in the bundle; maintaining two APIs creates inconsistency.
- Fix approach: Migrate `keyboard.table.tsx` and `search.table.tsx` to `@tanstack/react-table` v8, remove `react-table` v7 dependency.

**Unused Apollo/GraphQL Setup:**
- Issue: `@apollo/client` and `graphql` are installed. `ApolloClient` and `ApolloProvider` are configured in `front/src/index.tsx`. The only GraphQL file is `front/src/api/graphql/terminals.ts` which imports `gql` but contains only an empty body. No Apollo hooks are used anywhere in the application.
- Files: `front/src/index.tsx`, `front/src/api/graphql/terminals.ts`, `front/src/__generated__/graphql.ts` (5121 lines of generated but unused types)
- Impact: ~300KB+ dead bundle weight from Apollo and its dependencies; 5121-line generated file is pure noise.
- Fix approach: Remove `@apollo/client`, `graphql`, `@graphql-codegen/*` packages. Delete `front/src/__generated__/` and `front/src/api/graphql/`.

**Misspelled Namespace: `Discont` instead of `Discount`:**
- Issue: The Create Discount command and its handler live under `back/src/Core/Discont/` (typo for Discount). The Delete and Update commands correctly live under `back/src/Core/Discount/`. Two DTO files import from the misspelled namespace.
- Files: `back/src/Core/Discont/Command/CreateDiscountCommand/` (4 files), `back/src/Core/Dto/Controller/Api/Admin/Discount/CreateDiscountRequestDto.php`, `back/src/Core/Dto/Controller/Api/Admin/Discount/UpdateDiscountRequestDto.php`
- Impact: Confusion during navigation; new discount-related work is likely to land in the wrong namespace.
- Fix approach: Move `back/src/Core/Discont/` to `back/src/Core/Discount/Command/CreateDiscountCommand/`, update namespaces in all 4 files and update the 2 DTO `use` statements.

**Legacy `salt` Field on User Entity:**
- Issue: `User` entity persists a `salt` column (`@ORM\Column(type="string", length=255)`) and `setSalt()` is called with a UUID on user creation/update. Modern Symfony password hashers do not require a separate salt — this is a remnant of bcrypt/legacy patterns.
- Files: `back/src/Entity/User.php`, `back/src/Core/User/Command/CreateUserCommand/CreateUserCommandHandler.php`, `back/src/Core/User/Command/UpdateUserCommand/UpdateUserCommandHandler.php`
- Impact: Wasted DB column; misleading for developers who may think salt is still relevant to security.
- Fix approach: Remove `salt` column (add migration), remove `getSalt()`/`setSalt()` from entity and commands.

**Dead `AppAuthenticator` with `dd()` Call:**
- Issue: `back/src/Security/AppAuthenticator.php` extends `AbstractLoginFormAuthenticator` and contains `dd()` (Symfony's dump-and-die) inside the `authenticate()` method. This is a debugging artifact that would crash any request that reaches this code path.
- Files: `back/src/Security/AppAuthenticator.php`
- Impact: If this authenticator is ever activated in the security firewall, it will dump and exit on every authentication attempt.
- Fix approach: Delete `AppAuthenticator.php` if it is not wired into `security.yaml` (it is not currently wired), or fix the implementation if it is intended.

**Outdated `reportWebVitals` Logging to Console:**
- Issue: `front/src/index.tsx` line 49 calls `reportWebVitals(console.log)` unconditionally, logging performance metrics to the browser console in all environments including production.
- Files: `front/src/index.tsx`
- Impact: Noisy console output in production; unintended information disclosure.
- Fix approach: Remove or guard with `import.meta.env.DEV`.

**Legacy `react-query` v3 Listed as Dependency (Unused):**
- Issue: `package.json` lists both `react-query: ^3.39.3` (v3) and `@tanstack/react-query: ^4.29.7` (v4). Grep confirms only `@tanstack/react-query` is imported in source code. The v3 package is dead weight.
- Files: `front/package.json`
- Fix approach: Remove `react-query` from `package.json` and run `npm install`.

---

## Known Bugs

**Password Reset Email Contains `<a href="#">Url</a>`:**
- Symptoms: Forgot-password flow generates a reset token and sends an email, but the email body contains a hardcoded `<a href="#">Url</a>` placeholder link. The user receives the email but cannot click through to reset their password.
- Files: `back/src/Controller/Api/SecurityController.php` line 95–108
- Trigger: Any user submitting the forgot-password form.
- Workaround: None; feature is non-functional.

**Terminal Product Removal UI is Commented Out:**
- Symptoms: The "Terminal products" modal shows assigned products but has no way to remove them. The removal button is commented out with a `TODO` note.
- Files: `front/src/app-frontend/components/settings/terminals/terminals.tsx` lines 138–146
- Trigger: Opening the Terminal products modal in Settings.
- Workaround: None in the UI; must be done via direct API call or database.

**Conditional Prices Not Implemented:**
- Symptoms: Item creation/edit form has a commented-out "Conditional prices" section with a TODO comment. This feature appears partially modeled on the backend (`ProductPrice` entity, 306 lines) but is not exposed in the UI.
- Files: `front/src/app-frontend/components/settings/items/manage-item/items.create.tsx` line 802
- Workaround: None; UI feature gap.

**Order Dispatch Feature is Commented Out:**
- Symptoms: Order dispatch functionality exists in backend models (`isDispatched` field) and routing files (`ORDER_DISPATCH` route constant in admin routes), but the dispatch action in the sale history component is fully commented out.
- Files: `front/src/app-frontend/components/sale/sale.history.tsx` lines 439–456
- Workaround: None in UI.

---

## Security Considerations

**JWT Token Exposed via URL Query Parameter:**
- Risk: `back/config/packages/lexik_jwt_authentication.yaml` enables the `query_parameter` token extractor. This means JWT tokens can be passed as `?token=...` in URLs, causing them to appear in server logs, browser history, and referrer headers.
- Files: `back/config/packages/lexik_jwt_authentication.yaml`
- Current mitigation: Cookie-based auth is the primary mechanism in the frontend.
- Recommendations: Disable `query_parameter` extractor unless there is a specific need (e.g., file downloads). If needed for file downloads, scope it to specific routes only.

**Frontend `.env` File Committed to Git:**
- Risk: `front/.env` is tracked in version control (confirmed via `git ls-files`). It contains `VITE_GOOGLE_ANALYTICS` tracking ID and API host URLs. While not secret keys, committing `.env` establishes a pattern where someone may add secrets to it.
- Files: `front/.env`
- Current mitigation: Values appear to be non-sensitive configuration. `front/.gitignore` excludes `.env.local` and `.env.*.local` variants but not the base `.env`.
- Recommendations: Add `front/.env` to `.gitignore`. Use `front/.env.example` as a template. Document required vars in README.

**Broad RBAC: All Authenticated Users Access All Admin Endpoints:**
- Risk: `security.yaml` grants `^/api/admin` access to `[ROLE_ADMIN, ROLE_USER]`. There is no fine-grained authorization (`isGranted`, `@IsGranted`, voter logic) anywhere in the admin controllers. A `ROLE_USER` cashier can access user management, product management, reports, and order history endpoints identically to a `ROLE_ADMIN` manager.
- Files: `back/config/packages/security.yaml` line 50, `back/src/Controller/Api/Admin/UserController.php`, `back/src/Controller/Api/Admin/ReportController.php`
- Current mitigation: Role differentiation exists in the data model but is not enforced server-side.
- Recommendations: Add `@IsGranted("ROLE_ADMIN")` annotations on sensitive endpoints (user management, report access, store configuration), or implement a Symfony Voter for resource-level access.

**Media Upload Uses `getClientOriginalExtension()` for Filename:**
- Risk: `MediaController.php` line 50 uses `$file->getClientOriginalExtension()` (user-controlled) to build the saved filename: `uniqid('product_', true) . '.' . $extension`. MIME type is validated server-side, but if validation is bypassed or a new MIME type is added, the extension from the client is used directly.
- Files: `back/src/Controller/Api/Admin/MediaController.php`
- Current mitigation: MIME type whitelist validation is in place.
- Recommendations: Derive the extension from `$mimeType` using a trusted map (e.g., `jpeg → jpg`) rather than from client input. Also: the upload directory is created with `0777` permissions — use `0755` instead.

**Cookies Missing `SameSite` and `HttpOnly` Flags:**
- Risk: JWT and refresh token cookies are set with only `secure: true`. They are missing `sameSite` (CSRF protection) and `httpOnly` (XSS protection) flags.
- Files: `front/src/app-frontend/containers/login/login.tsx`, `front/src/app-admin/containers/login/login.tsx`
- Current mitigation: `secure: true` prevents transmission over HTTP.
- Recommendations: Add `{ secure: true, sameSite: 'strict', httpOnly: true }` — note `httpOnly` is not possible from JavaScript (must be set by the server). Consider moving JWT storage to an `HttpOnly` cookie set by the backend on login response.

---

## Performance Bottlenecks

**Recursive Product Loading Without Pagination Limit:**
- Problem: `use.load.data.ts` uses a recursive `loadProducts()` function that fetches 100 products per page and continues recursively until all pages are exhausted. With a large catalogue, this runs N sequential API calls on every first load, blocking the POS from being usable.
- Files: `front/src/api/hooks/use.load.data.ts` lines 69–88
- Cause: Recursive sequential fetching, no abort mechanism, stores entire product catalogue in IndexedDB.
- Improvement path: Load only the first page on startup for display. Use server-side search/filter for barcode lookup. Cache is keyed only as `'list'` — any catalogue change requires manual cache clear (via Settings).

**ReportController Executes 3–4 Separate Database Queries Per Request:**
- Problem: Each report endpoint (`/sales`, `/profit`, `/daily`) runs 3–4 separate `QueryBuilder` queries sequentially. For date ranges spanning many orders, these are full table scans without index hints.
- Files: `back/src/Controller/Api/Admin/ReportController.php`
- Cause: Each metric (summary, revenue, payments, top products) is a separate query. No caching layer.
- Improvement path: Combine into fewer queries using subqueries, or cache report results in Redis/APCu with a short TTL. Add a database index on `order.created_at` if not present.

**`DATE()` Function Prevents Index Use on `createdAt`:**
- Problem: All report queries use `WHERE DATE(o.createdAt) >= :dateFrom`. Wrapping a column in a function prevents MySQL from using a B-Tree index on `createdAt`.
- Files: `back/src/Controller/Api/Admin/ReportController.php` (14 occurrences)
- Cause: Convenience use of MySQL `DATE()` function.
- Improvement path: Rewrite as `WHERE o.createdAt >= :dateFrom AND o.createdAt < :dateTo + 1 day` using datetime parameters to allow index usage.

**Large Mega-Components (500–875 lines):**
- Problem: Several frontend components have grown into large, single-responsibility-violating files, increasing re-render scope and making targeted optimization harder.
- Files: `front/src/app-frontend/components/inventory/purchase/create.purchase.tsx` (875 lines), `front/src/app-frontend/components/settings/items/manage-item/items.create.tsx` (844 lines), `front/src/app-frontend/components/sale/sale.history.tsx` (825 lines), `front/src/app-frontend/components/sale/sale.inline.tsx` (753 lines), `front/src/app-frontend/components/modes/pos.tsx` (741 lines)
- Cause: Incremental feature addition without extraction.
- Improvement path: Extract sub-forms, modals, and data-fetching hooks into separate files/components. Use `React.memo` and `useCallback` on frequently re-rendered sub-sections.

---

## Fragile Areas

**POS State Persisted in Browser Storage (Jotai `atomWithStorage`):**
- Files: `front/src/store/jotai.ts`
- Why fragile: The entire cart state (items, discounts, taxes, customer) is persisted to `localStorage` via `atomWithStorage` with key `"pos-state"`. Any schema change to `DefaultStateInterface` will silently load stale/mismatched data from storage on next page load, causing hard-to-diagnose bugs.
- Safe modification: Add a version key to the atom and implement a migration/reset when the stored version doesn't match the expected version.
- Test coverage: No tests exist for the storage persistence or migration behavior.

**LocalForage Cache with No Invalidation Strategy:**
- Files: `front/src/api/hooks/use.load.data.ts`, `front/src/app-frontend/components/settings/more.tsx`
- Why fragile: Product list, discount list, tax list, payment types, and devices are cached indefinitely in IndexedDB. Cache is only cleared manually via a settings action. Changes made in the backend (new products, deactivated taxes) will not be reflected until the user manually clears cache.
- Safe modification: Add a timestamp to each cached entry and compare against a configurable TTL on load.
- Test coverage: None.

**`VITE_APP_TYPE` Toggle for Frontend/Admin Mode:**
- Files: `front/src/index.tsx` line 34
- Why fragile: The entire application branch (POS frontend vs. admin panel) is determined by a single env variable `VITE_APP_TYPE === "frontend"`. A misconfigured build will silently render the wrong application.
- Safe modification: Add a build-time check that throws if `VITE_APP_TYPE` is not one of the known values. Consider separate entry points (`main-frontend.tsx`, `main-admin.tsx`) and separate Vite configs.
- Test coverage: None.

**Symfony 5.4 (LTS) — Approaching EOL:**
- Files: `back/composer.json`
- Why fragile: Symfony 5.4 LTS security support ends November 2024 (already past). The project is running on an end-of-life version. API Platform `^2.7` is also the legacy v2 line; v3 has been the stable release since 2022.
- Safe modification: Upgrade to Symfony 6.4 LTS or 7.x. Also upgrade API Platform to v3.
- Test coverage: Only a bootstrap file exists in `back/tests/`; no actual tests to validate the upgrade.

---

## Dependencies at Risk

**`redux-actions` (Unmaintained):**
- Risk: `redux-actions` has had no releases since 2019 and its GitHub repository is effectively abandoned. TypeScript types are included but lag behind current TS versions.
- Impact: No security patches; `createAction` and `handleActions` usage is spread across all duck files.
- Migration plan: Replace with `@reduxjs/toolkit` `createSlice`, or eliminate Redux entirely in favor of Jotai.

**`react-mousetrap` (Low maintenance):**
- Risk: Last published 2018. Wraps `mousetrap.js` which itself has limited maintenance.
- Impact: Keyboard shortcut functionality (`front/src/app-common/components/input/shortcut.tsx`) depends on this package.
- Migration plan: Migrate to `react-hotkeys-hook` (actively maintained).

**Symfony 5.4 — EOL (see Fragile Areas above).**

**API Platform v2.7 — Legacy:**
- Risk: API Platform v2 is no longer receiving feature updates. The annotation-based configuration used throughout entities (`@ApiResource`, `@ApiFilter`) is deprecated in v3 which uses PHP 8 attributes.
- Impact: Migrating to v3 will require rewriting all entity annotations.
- Migration plan: Plan a phased migration to API Platform v3 alongside the Symfony upgrade.

---

## Missing Critical Features

**No Backend Tests:**
- Problem: `back/tests/` contains only `bootstrap.php`. There are zero PHPUnit tests for any controller, command handler, or repository. All business logic (order creation, inventory, closing, returns) is untested.
- Blocks: Safe refactoring of any backend code; confidence in the Symfony/API Platform upgrade.

**No Frontend Tests:**
- Problem: Testing dependencies (`@testing-library/react`, `@testing-library/jest-dom`, `@types/jest`) are installed but no test files exist anywhere in `front/src/`.
- Blocks: Safe refactoring of cart logic, state management migration, component extraction.

**No Rate Limiting on Auth Endpoints:**
- Problem: The login (`/api/auth/login_check`) and forgot-password (`/api/auth/forgot-password`) endpoints have no rate limiting. Symfony's rate limiter package is available but not configured for any endpoint.
- Blocks: Brute-force and password spray attacks are possible with no throttling.

---

## Test Coverage Gaps

**Order Creation and Financial Calculations:**
- What's not tested: The entire order creation flow, tax calculation, discount application, and payment reconciliation logic in `back/src/Core/Order/`.
- Files: `back/src/Core/Order/Command/CreateOrderCommand/CreateOrderCommand.php` (422 lines), `back/src/Controller/Api/Admin/OrderController.php`
- Risk: Financial calculation errors (wrong discount application, tax rounding) go undetected.
- Priority: High

**Cart State Logic:**
- What's not tested: Cart item addition, quantity updates, discount/tax calculations in `front/src/app-frontend/containers/dashboard/pos.tsx` and `front/src/app-frontend/components/cart/`.
- Files: `front/src/app-frontend/components/cart/cart.container.tsx`, `front/src/app-frontend/containers/dashboard/pos.tsx`
- Risk: Regressions in price calculation silently affect every sale.
- Priority: High

**LocalForage Cache and State Hydration:**
- What's not tested: Loading from cache vs. fresh fetch, stale data handling, cache clear behavior.
- Files: `front/src/api/hooks/use.load.data.ts`
- Risk: Silent data staleness issues after catalogue updates.
- Priority: Medium

**Forgot Password / Reset Password Flow:**
- What's not tested: Token generation, email sending, token validation, password update.
- Files: `back/src/Controller/Api/SecurityController.php`
- Risk: The feature is already broken (hardcoded `href="#"`) and would not be caught by tests even if they existed.
- Priority: Medium

---

*Concerns audit: 2026-02-17*
