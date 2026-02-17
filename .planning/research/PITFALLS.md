# Pitfalls Research

**Domain:** POS system enhancement — RBAC, PMP costing, Z-Reports, stock alerts, UI redesign, RTL/Arabic
**Researched:** 2026-02-17
**Confidence:** HIGH (all findings grounded in direct codebase evidence)

---

## Critical Pitfalls

### Pitfall 1: RBAC Migration Breaks Every Existing User

**What goes wrong:**
The entire `/api/admin` namespace is guarded by `roles: [ROLE_ADMIN, ROLE_USER]` in `security.yaml`. When you introduce fine-grained roles (e.g. `ROLE_CASHIER`, `ROLE_MANAGER`), any existing user whose stored `roles` array does not include the new role strings will be denied access to every route they previously could use.

**Why it happens:**
Symfony's role model is hierarchical but cumulative: `ROLE_USER` does not automatically inherit `ROLE_CASHIER`. The `DataFixtures/AppFixtures.php` seeds users with `['ROLE_USER']` only. If RBAC is implemented as additive role requirements (`IS_GRANTED('ROLE_CASHIER')` per route) without migrating existing users, production accounts silently lose access on deploy.

**How to avoid:**
1. Audit every existing user's `roles` column **before** adding new role checks.
2. Write a Doctrine migration or a one-time command that upgrades existing users to their appropriate new role (e.g. any current `ROLE_USER` who can manage sales gets `ROLE_CASHIER` added alongside).
3. Implement role hierarchy in `security.yaml` so `ROLE_ADMIN` inherits all sub-roles. Existing admins remain unaffected.
4. Deploy RBAC enforcement and user migration in the **same release** — never split across two separate deployments.

**Warning signs:**
- After merging RBAC changes, any test login as a non-admin user immediately returns 403 for previously working routes.
- Fixture-seeded users cannot reach `/api/admin/*` endpoints.

**Phase to address:** RBAC implementation phase (must include a `data-migration` subtask before any voter or access_control changes are deployed).

---

### Pitfall 2: PMP Calculation Uses Current `product.cost`, Not Cost-at-Time-of-Sale

**What goes wrong:**
The profit report in `ReportController::profit()` calculates `SUM(COALESCE(prod.cost, 0) * op.quantity)` by joining `OrderProduct` back to `Product` and reading `Product.cost` live. `OrderProduct` does **not** store the cost at the time of sale — only `price` (selling price) and `discount`. This means retroactive profit figures change every time a product's cost is updated, making historical reports inaccurate.

**Why it happens:**
The entity model (`OrderProduct`) was designed to capture the selling price but not the cost/purchase price at point of sale. This is a common oversight when reports are added after the sales model is built.

**Consequences:**
- Historical profit reports are unreliable: updating a product's cost retroactively changes past profitability.
- PMP (Weighted Average Cost) calculated from `PurchaseItem.purchasePrice` batches becomes meaningless if `Product.cost` is overwritten on each purchase.
- Supervisor demo comparing periods will show wrong gross profit.

**How to avoid:**
1. Add a `costAtSale` decimal column to `OrderProduct` — snapshot `Product.cost` at order creation time, similar to how `price` snapshots the selling price.
2. Write a Doctrine migration to populate `costAtSale` for existing rows from the current `Product.cost` (accepting that historical data is approximate for old orders, and exact going forward).
3. Update `CreateOrderCommandHandler` to set `costAtSale` from `product->getCost()` at save time.
4. Rewrite the profit queries to use `op.costAtSale` instead of `prod.cost`.

**Warning signs:**
- Updating a product's cost changes the "gross profit" figure for past months in the report.
- `OrderProduct` has no `cost` or `costAtSale` column (confirmed: it only has `price`, `quantity`, `discount`).

**Phase to address:** PMP/cost calculation phase, before any Z-Report or profit reporting is demonstrated.

---

### Pitfall 3: Suspended Orders Inflate Revenue in All Reports

**What goes wrong:**
`ReportController` filters out `isDeleted = false` and `isReturned = false` but **never** filters `isSuspended`. A suspended (parked/held) order is still an open transaction — no payment has been completed — yet its line items are counted in `grossRevenue` and `totalCost` calculations.

**Why it happens:**
The flag was added to the `Order` entity (`isSuspended` boolean) for the hold-sale feature, but the report queries were written without accounting for this status. Without tests, no regression caught it.

**Consequences:**
- Z-Report totals overstate actual collected revenue.
- End-of-day cash reconciliation will not balance: the report shows more revenue than cash in the drawer.
- Could make the supervisor demo appear fraudulent.

**How to avoid:**
Add `->andWhere('o.isSuspended = false OR o.isSuspended IS NULL')` to every revenue/cost query in `ReportController` and any future Z-Report query. Create a short integration test for the report endpoint that seeds a suspended order and asserts it does not appear in totals.

**Warning signs:**
- End-of-day totals are consistently slightly higher than payment receipts.
- A suspended sale is visible in the sales list but also shows up in daily revenue.

**Phase to address:** Z-Report / reporting phase — add this filter as the very first step before building any UI for reports.

---

### Pitfall 4: RTL Toggling via CDN Swap Breaks on Page Load Race Condition

**What goes wrong:**
Both `topbar.right.tsx` (frontend app) and `navbar.tsx` (admin app) switch RTL by calling `bootstrapCss.setAttribute('href', '...bootstrap.rtl.min.css')` and `document.dir = 'rtl'`. This is a runtime DOM mutation that depends on a `<link id="bootstrap-css">` element existing at the moment the component mounts. The admin navbar also calls `updateLocale()` inside a `useEffect` on mount to restore the saved locale — but if the component renders before `#bootstrap-css` is in the DOM, `bootstrapCss!.setAttribute(...)` throws a null-dereference crash in strict TypeScript (the `!` assertion is a lie).

**Why it happens:**
The approach of swapping a CDN `<link>` at runtime is a quick workaround rather than a proper RTL-aware build. It depends on HTML element timing and an active internet connection (the CDN URL), both of which are unreliable.

**Consequences:**
- RTL layout silently breaks if the network is slow (CDN URL resolves after page interaction).
- Any new UI component added using Tailwind `ml-*`/`mr-*` (185+ occurrences confirmed) will not flip automatically under Bootstrap RTL — mixed directionality in the same UI.
- Refreshing the page in Arabic mode shows a flash of LTR layout until the CDN link loads.

**How to avoid:**
1. Replace the CDN swap with a build-time approach: include both Bootstrap LTR and RTL CSS locally (already installed via npm `bootstrap`). Set the active sheet via a class on `<html>` or use Tailwind's `rtl:` variant for custom styles.
2. Use Tailwind's built-in RTL plugin (`dir="rtl"` on `<html>`) for all custom spacing — replace `ml-*`/`mr-*` with `ms-*`/`me-*` (logical properties) throughout the codebase.
3. Set `document.dir` in the `<html>` tag from the server or in the React root before first render, not inside a component's `useEffect`.

**Warning signs:**
- Console error `Cannot read properties of null (reading 'setAttribute')` in the admin app on first load in a slow network environment.
- Arabic mode shows LTR icon spacing (icons still push right, not left) because Tailwind `mr-*` hardcodes LTR margin.

**Phase to address:** RTL/Arabic translation phase — fix the CDN swap mechanism before adding any new components that need RTL support.

---

### Pitfall 5: Adding New API Routes Without Voter-Level Authorization Leaves Them Open to Any Authenticated User

**What goes wrong:**
The current security model has a single `access_control` rule: any JWT-authenticated user can reach all of `/api/admin`. There are no Symfony Voters, no `#[IsGranted]` attributes, and no per-controller role checks. When new routes are added for PMP management, Z-Report generation, or stock alert configuration, they will be open to cashiers by default (any `ROLE_USER`) unless a Voter is explicitly attached.

**Why it happens:**
The previous security model only needed to distinguish "logged in vs. not logged in". Adding RBAC incrementally means every new endpoint must opt in to role checks. The existing architecture has zero precedent or pattern for this, making it easy for a developer to forget.

**Consequences:**
- A cashier can access manager-only reports or modify stock alert thresholds.
- RBAC enforcement is inconsistent: some routes check roles, others do not, giving a false sense of security.

**How to avoid:**
1. Create a `SecurityVoter` base class and a `RoleChecker` service in Phase 1 of RBAC work.
2. Add a Symfony `kernel.controller` event subscriber that enforces a default "deny unless explicitly permitted" policy for the `/api/admin` namespace, requiring all controllers to declare required roles.
3. Alternatively, adopt the Symfony `#[IsGranted('ROLE_X')]` attribute consistently on every new controller method, enforced by a code review checklist item.
4. Write a smoke test that logs in as `ROLE_CASHIER` and asserts a 403 on a `ROLE_MANAGER` endpoint.

**Warning signs:**
- A new route works for a test user with only `ROLE_USER` without any explicit grant.
- No `#[IsGranted]` attribute or voter call visible in a new controller method.

**Phase to address:** RBAC implementation phase — establish the Voter pattern before any new protected routes are added.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep dual Redux+Saga AND Jotai state | No migration needed; POS state stays in Jotai | Developers must know which system owns which state; new features risk landing in the wrong store | Acceptable for this milestone if new POS cart features go to Jotai and admin/auth state stays in Redux — document the rule |
| Leave `Core/Discont/` namespace misspelling | No rename migration | Import paths are subtly wrong; grep for "Discount" misses the `Discont` path; confusing for anyone new to codebase | Never — fix the directory name in a single dedicated commit before adding any new code to that namespace |
| Leave JWT token in URL param for export (`export.items.tsx`) | Simple browser `window.open` download | JWT leaked in browser history, server logs, and referrer headers | Never — fix before any RBAC work since the URL token bypasses whatever role checks are added to the endpoint |
| Apollo/GraphQL imported at root but only used for terminals | No change needed | ~60KB of Apollo Client bundle included on every page; adds provider nesting with no benefit | Acceptable to leave unused for this milestone if scope is constrained, but document it as removable |
| `float` columns in `Closing` entity (`openingBalance`, `closingBalance`) | Works now | Floating-point arithmetic errors accumulate in end-of-day reconciliation totals | Migrate to `decimal(20,2)` before or during Z-Report implementation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Symfony Security + existing JWT users | Adding `role_hierarchy` without migrating stored roles | Add hierarchy AND run a migration that backfills new roles to existing users in the same deployment |
| Bootstrap RTL + Tailwind | Assuming Bootstrap RTL handles `mr-*`/`ml-*` Tailwind classes | Bootstrap RTL only flips Bootstrap classes; Tailwind logical properties (`ms-*`/`me-*`) must be used for custom spacing |
| i18next Arabic translation file | File is 504 lines vs 510 for French — missing ~6 keys | Run `i18next-parser` or a diff to find missing keys before demo; missing keys fall back to the key string in LTR English |
| `Product.cost` + PurchaseItem price | Assuming updating `Purchase.updatePrice=true` auto-syncs PMP | The `updatePrice` flag updates `Product.cost` directly (last-in wins) — no weighted average is computed anywhere; PMP must be implemented as a new calculation layer |
| Closing entity `data` column (JSON type) | Storing computed Z-Report totals in the blob `data` field | Query data live for Z-Report rather than relying on the JSON blob, which has no schema and is easy to corrupt |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Report queries use `DATE()` function on `createdAt` | Full table scan on the `order` table — no index is usable on a wrapped column | Add a functional index or store a `date` column; use range filter (`createdAt >= :start AND createdAt < :end`) instead of `DATE()` | Noticeable at ~5,000 orders; slow at 50,000+ |
| Profit query joins `OrderProduct` → `Order` → `Product` with no pagination | Single aggregation query over all orders in date range; expensive for wide ranges | Acceptable for Z-Reports (one day); add pagination or pre-aggregation for "all time" views | Slow for queries spanning 1+ year of data |
| Jotai `atomWithStorage` persists entire cart to `localStorage` | Cart state including all product objects written on every keystroke during search | Store only product IDs + quantities in the atom; hydrate full product data from the API or a local cache | When cart contains 50+ items with large product objects |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| JWT sent as URL query param in `export.items.tsx` (`bearer: Cookies.get("JWT")`) | Token captured in browser history, proxy logs, server access logs, and Referer headers of linked pages — allows session hijacking | Replace with POST request with Authorization header, or use a short-lived signed download token generated server-side |
| `ApiAuthenticator` authenticates by username header (`X-AUTH-TOKEN`) with empty `PasswordCredentials('')` | Terminal auth bypasses password verification entirely — any user ID in the header authenticates | This is a legacy terminal auth path; document which routes use it and restrict with a firewall pattern; do not expand this pattern to new routes |
| Broad `ROLE_USER` + `ROLE_ADMIN` access to all `/api/admin` with no per-resource voter | A user with `ROLE_USER` can read/modify any resource the API exposes including other users' data | Implement Symfony Voters per resource type; restrict user management to `ROLE_ADMIN` only |
| `User.roles` stored as PHP serialized array in MySQL `array` column type | The `array` Doctrine type uses PHP `serialize()` — vulnerable to PHP object injection if input is not validated before deserialization in older Doctrine versions | Migrate `roles` column to `json` type in a Doctrine migration; validate input in `setRoles()` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Language toggle causes full page CSS swap with visible flash | Arabic-speaking cashier sees LTR layout for 200-500ms on every language switch; disorienting on a fast-paced POS screen | Preload both Bootstrap CSS files; toggle a `<html dir>` attribute instead of swapping href |
| Adding role-based UI hiding without server-side enforcement | Cashier sees a hidden "Refund" button in the DOM and can access refund via direct API call | Always enforce permissions server-side; UI hiding is UX polish only, never a security boundary |
| UI redesign changes component structure while POS cart is in `localStorage` | Old cart data shape in `localStorage` causes React to crash or render garbage on next load after deploy | Add a schema version key to Jotai's `atomWithStorage`; clear storage when version mismatch detected on app boot |
| Stock alert thresholds shown in admin but not visible in POS cashier view | Cashier is unaware stock is low until physically out; stock alerts require the cashier screen to show warnings | Stock alert notifications should appear in the POS frontend (`app-frontend`), not only in `app-admin` |

---

## "Looks Done But Isn't" Checklist

- [ ] **RBAC:** Roles are enforced in `security.yaml` but not in Symfony Voters — verify with a test that logs in as `ROLE_CASHIER` and attempts a `ROLE_MANAGER` action.
- [ ] **PMP / Profit Report:** Report shows numbers but uses live `Product.cost` — verify that changing a product's cost does NOT retroactively change last month's profit figure.
- [ ] **Z-Report:** Closing entity is created but `data` JSON blob may be empty — verify that the Z-Report UI actually reads live query data, not the stale JSON blob.
- [ ] **Z-Report suspended orders:** Revenue total looks correct in dev (no suspended orders) but verify with a seeded suspended order that it does NOT appear in revenue.
- [ ] **Arabic RTL:** UI looks correct in Chrome on desktop — verify on a narrow touchscreen (the POS use case) where `ml-*/mr-*` Tailwind directional spacing causes icon overlap.
- [ ] **Translation completeness:** Arabic file has 504 lines, French has 510 — find and translate the ~6 missing keys before demo.
- [ ] **JWT export URL:** Export button works but JWT is visible in browser address bar — verify the token is not logged on the server side.
- [ ] **Stock alerts:** Alert threshold is saved in the backend — verify the frontend actually polls or receives a notification when stock drops below threshold (no polling mechanism currently exists).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RBAC breaks existing users post-deploy | HIGH | Roll back security.yaml to previous version; write migration; re-deploy with migration running first |
| Historical profit reports are wrong (live cost used) | MEDIUM | Add `costAtSale` column (nullable); backfill from current cost (approximation accepted); correct going forward; add note in UI that pre-migration data is approximate |
| Suspended orders in revenue (data already in reports) | LOW | Correct the query; historical reports generated before fix will show inflated revenue — add a note in the UI or recompute if needed |
| CDN Bootstrap RTL fails (network offline) | LOW | Bundle Bootstrap RTL locally as a static asset; swap `<link>` href to local path |
| `Core/Discont/` rename breaks imports | LOW | PHPStorm/IDE global search-replace of `Core\Discont\` → `Core\Discount\`; run tests; takes ~30 minutes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RBAC breaks existing users | Phase: RBAC — add migration task before access_control changes | Log in as existing non-admin user after deploy; all previously accessible routes return 200 |
| PMP uses live cost (historical inaccuracy) | Phase: PMP/Cost — add `costAtSale` before writing any profit report UI | Change `Product.cost` and confirm historical order profit figure does not change |
| Suspended orders inflate revenue | Phase: Z-Report — first filter fix, then build UI | Seed suspended order; assert it does not appear in daily report total |
| New routes open to all authenticated users | Phase: RBAC — establish Voter pattern before adding any new routes | Smoke test: `ROLE_CASHIER` token hits `ROLE_MANAGER` route → 403 |
| RTL breaks on CDN swap / Tailwind `ml-*` | Phase: RTL/Arabic — fix build pipeline before adding new RTL components | Toggle to Arabic in offline network; no flash, no broken spacing |
| JWT in URL param | Phase: RBAC (security pass) — fix as part of security hardening | Export button works; JWT not visible in network log URL |
| `Closing.data` JSON blob unreliable | Phase: Z-Report — use live query, not blob | Z-Report shows correct total even when `data` field is null |
| Cart `localStorage` schema mismatch after deploy | Phase: UI redesign — add version key before restructuring Jotai atoms | Deploy new version; existing session user sees clean cart, not crash |

---

## Sources

- Direct codebase analysis: `back/src/Controller/Api/Admin/ReportController.php` — suspended order filter absence confirmed
- Direct codebase analysis: `back/src/Entity/OrderProduct.php` — no `costAtSale` column confirmed
- Direct codebase analysis: `back/config/packages/security.yaml` — single broad access_control rule confirmed
- Direct codebase analysis: `front/src/app-frontend/components/settings/items/export.items.tsx` — JWT in URL query param confirmed
- Direct codebase analysis: `front/src/app-frontend/components/modes/topbar.right.tsx` and `front/src/app-admin/containers/layout/navbar.tsx` — CDN swap RTL mechanism confirmed
- Direct codebase analysis: `back/src/Core/Discont/` directory — misspelled namespace confirmed
- Direct codebase analysis: `back/src/Entity/Closing.php` — `float` column types and JSON `data` blob confirmed
- Direct codebase analysis: `front/src/language/lang.ar.json` (504 lines) vs `lang.fr.json` (510 lines) — translation gap confirmed
- Tailwind CSS documentation: `ml-*`/`mr-*` are physical properties, do not flip with `dir="rtl"`; `ms-*`/`me-*` are logical properties that do flip (MEDIUM confidence — consistent with Tailwind v3 docs)
- Symfony Security documentation: role hierarchy must be explicitly declared; roles are not auto-inherited (HIGH confidence — core Symfony behavior)

---

*Pitfalls research for: VelociPOS milestone — RBAC, PMP, Z-Reports, stock alerts, UI redesign, Arabic RTL*
*Researched: 2026-02-17*
