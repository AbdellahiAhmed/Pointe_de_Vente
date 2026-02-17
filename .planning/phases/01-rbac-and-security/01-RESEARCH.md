# Phase 1: RBAC and Security - Research

**Researched:** 2026-02-17
**Domain:** Symfony 5.4 Voters + React/Redux role-gated routing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RBAC-01 | L'administrateur peut créer/modifier/supprimer des utilisateurs et leur assigner un rôle (VENDEUR, MANAGER, ADMIN) | Backend: UserController already exists — add `denyAccessUnlessGranted('ROLE_ADMIN')` at top of each action. Frontend: update CreateUser role dropdown to ROLE_VENDEUR / ROLE_MANAGER / ROLE_ADMIN. |
| RBAC-02 | Le VENDEUR peut uniquement accéder au POS (ventes, panier, caisse) et voir le stock en lecture seule | Backend: OrderVoter + ProductVoter (read-only for ROLE_VENDEUR). Frontend: POS app `RequireAuth` already exists — extend to `RequireRole('ROLE_VENDEUR')`. |
| RBAC-03 | Le MANAGER peut accéder aux rapports, gérer le stock, les produits, les clients, et clôturer la caisse | Backend: ReportVoter, ClosingVoter gates `ROLE_MANAGER` minimum. Frontend: admin app sidebar items conditionally rendered via `useHasRole`. |
| RBAC-04 | L'ADMIN a accès total (paramètres, utilisateurs, magasins, terminaux) | Backend: UserController, TerminalController gate `ROLE_ADMIN`. Enforced by role_hierarchy — ROLE_ADMIN inherits MANAGER and VENDEUR automatically. |
| RBAC-05 | Les permissions sont enforced côté backend (Symfony Voters) et côté frontend (guards UI) | Backend: Voter classes + `denyAccessUnlessGranted` calls. Frontend: `RequireRole` component wrapping each route. |
| RBAC-06 | La hiérarchie des rôles est configurée dans security.yaml (ADMIN > MANAGER > VENDEUR) | `role_hierarchy` block in security.yaml: ROLE_ADMIN → ROLE_MANAGER → ROLE_VENDEUR. Verified pattern against Symfony 5.4 official docs. |
</phase_requirements>

---

## Summary

The codebase already has working JWT authentication (LexikJWT 2.14 / Symfony 5.4), a `User` entity with a `roles: array` column, `UserController` CRUD, and two separate React apps (POS `app-frontend`, admin `app-admin`). What does **not** exist: role hierarchy in `security.yaml`, any Symfony Voter classes, any role-gated access control beyond "is authenticated", and any frontend role-checking hook or role-aware route guard.

The current role model is binary: `ROLE_USER` (cashier) or `ROLE_ADMIN`. The new model introduces `ROLE_VENDEUR`, `ROLE_MANAGER`, `ROLE_ADMIN` with a Symfony hierarchy. The migration risk is low — `roles` is already a database array column, so existing users need their `ROLE_USER` value backfilled to `ROLE_VENDEUR` in the same deployment.

The export security hole is concrete and already located: `export.items.tsx` appends the raw JWT cookie as a `?bearer=` URL query parameter (`window.open(url.toString(), "_blank")`). This must be replaced with a signed short-lived download token or a `fetch()` + Blob URL approach during this phase.

**Primary recommendation:** Implement Symfony Voters as the canonical authorization layer; all controllers call `denyAccessUnlessGranted(VoterAttribute::CONSTANT, null)` at the top of each action. Never use raw `$this->isGranted('ROLE_X')` inside business logic — keep authorization at the controller entry point.

---

## Standard Stack

### Core (already in project — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| symfony/security-bundle | 5.4.* | Role hierarchy, access_control, Voter wiring | Ships with the project; Voter classes auto-registered by services.yaml |
| lexik/jwt-authentication-bundle | ^2.14 | Stateless JWT auth for the API firewall | Already configured and working |
| React Router (react-router-dom) | (existing) | Frontend route guards | `RequireAuth` component already used in both apps |
| js-cookie | (existing) | JWT cookie access | Already used in request.ts and export.items.tsx |

### Supporting (no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Symfony AccessDecisionManager | built-in | Checking roles inside Voters | Inject when a Voter needs to test ROLE_X on the token |
| Redux (react-redux) | (existing) | Auth state — user roles array available via `getAuthorizedUser` selector | For `useHasRole` hook implementation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Symfony Voters | `access_control` path rules in security.yaml | Path rules are URL-pattern only; Voters are object/operation aware and composable — correct choice for this domain |
| JWT-in-URL for export | Signed URL (S3-style) | Signed URL requires server-side token store; fetch+Blob is simpler for this use case |

**Installation:** No new packages required on either side.

---

## Architecture Patterns

### Recommended Project Structure

```
back/src/Security/Voter/
├── OrderVoter.php          # VENDEUR can create/edit orders; MANAGER/ADMIN also
├── PurchaseVoter.php       # MANAGER minimum for purchase orders
├── ReportVoter.php         # MANAGER minimum for all /admin/report/* endpoints
├── ClosingVoter.php        # MANAGER minimum for closing actions
├── UserManagementVoter.php # ADMIN only for /admin/user/* endpoints

front/src/
├── duck/auth/hooks/
│   └── useHasRole.ts        # NEW: returns boolean, reads from getAuthorizedUser selector
├── app-common/components/
│   └── auth/
│       └── RequireRole.tsx  # NEW: wrapper that redirects/blocks if role missing
└── app-frontend/components/settings/users/
    └── create.user.tsx      # MODIFY: update role dropdown options
```

### Pattern 1: Symfony Voter for Domain Access

**What:** One Voter per domain (Order, Purchase, Report, etc.). Each Voter maps named attributes (`VIEW`, `CREATE`, `MANAGE`) to the minimum required role.
**When to use:** Every new controller added in subsequent phases must call `denyAccessUnlessGranted` using one of these Voters.

```php
// Source: https://symfony.com/doc/5.4/security/voters.html
// src/Security/Voter/ReportVoter.php
namespace App\Security\Voter;

use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Security;

class ReportVoter extends Voter
{
    const VIEW = 'REPORT_VIEW';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, $subject): bool
    {
        return in_array($attribute, [self::VIEW]);
    }

    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        // ROLE_ADMIN inherits ROLE_MANAGER via role_hierarchy, so checking MANAGER
        // automatically covers ADMIN too.
        return $this->security->isGranted('ROLE_MANAGER');
    }
}
```

```php
// In ReportController:
public function sales(...): Response
{
    $this->denyAccessUnlessGranted(ReportVoter::VIEW);
    // ...
}
```

### Pattern 2: Role Hierarchy in security.yaml

**What:** Declare the three-tier hierarchy once; Symfony propagates it throughout the entire security system (Voters, `isGranted`, `access_control`).

```yaml
# config/packages/security.yaml
security:
    role_hierarchy:
        ROLE_MANAGER: ROLE_VENDEUR
        ROLE_ADMIN:   ROLE_MANAGER

    # access_control remains unchanged for broad firewall gates
    access_control:
        - { path: ^/api/auth/login_check, roles: IS_AUTHENTICATED_ANONYMOUSLY }
        - { path: ^/api/auth/reset-password, roles: IS_AUTHENTICATED_ANONYMOUSLY }
        - { path: ^/api/auth/forgot-password, roles: IS_AUTHENTICATED_ANONYMOUSLY }
        - { path: ^/api/auth/register, roles: IS_AUTHENTICATED_ANONYMOUSLY }
        - { path: ^/api/token/refresh, roles: IS_AUTHENTICATED_ANONYMOUSLY }
        - { path: ^/api/admin, roles: ROLE_VENDEUR }  # minimum: authenticated as any role
```

### Pattern 3: Frontend `useHasRole` Hook

**What:** A hook that reads the current user's roles array from Redux and tests for a specific role using the same hierarchy logic understood on the frontend.

```typescript
// front/src/duck/auth/hooks/useHasRole.ts
import { useSelector } from 'react-redux';
import { getAuthorizedUser } from '../auth.selector';

// Mirrors Symfony role_hierarchy on the client
const ROLE_HIERARCHY: Record<string, string[]> = {
  ROLE_ADMIN:   ['ROLE_MANAGER', 'ROLE_VENDEUR'],
  ROLE_MANAGER: ['ROLE_VENDEUR'],
  ROLE_VENDEUR: [],
};

function hasRoleWithHierarchy(userRoles: string[], requiredRole: string): boolean {
  for (const role of userRoles) {
    if (role === requiredRole) return true;
    const inherited = ROLE_HIERARCHY[role] ?? [];
    if (inherited.includes(requiredRole)) return true;
  }
  return false;
}

export function useHasRole(requiredRole: string): boolean {
  const user = useSelector(getAuthorizedUser);
  if (!user) return false;
  return hasRoleWithHierarchy(user.roles, requiredRole);
}
```

### Pattern 4: `RequireRole` Route Guard Component

```typescript
// front/src/app-common/components/auth/RequireRole.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useHasRole } from '../../../duck/auth/hooks/useHasRole';
import { LOGIN } from '../../../app-admin/routes/frontend.routes';

interface Props {
  role: string;
  children: JSX.Element;
  redirectTo?: string;
}

export const RequireRole = ({ role, children, redirectTo = LOGIN }: Props) => {
  const location = useLocation();
  const hasRole = useHasRole(role);

  if (!hasRole) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};
```

Usage in admin app.tsx:
```typescript
// Wrap USERS route so only ROLE_ADMIN can access
<Route path={USERS} element={
  <RequireAuth>
    <RequireRole role="ROLE_ADMIN">
      <Users />
    </RequireRole>
  </RequireAuth>
} />

// Reports accessible to ROLE_MANAGER and above
<Route path={REPORTS_SALES} element={
  <RequireAuth>
    <RequireRole role="ROLE_MANAGER">
      <SalesReport />
    </RequireRole>
  </RequireAuth>
} />
```

### Pattern 5: Doctrine Migration for Role Backfill

**What:** Atomic data migration that converts all existing `ROLE_USER` records to `ROLE_VENDEUR` without locking production.

```php
// back/migrations/VersionXXXXXXXXXXXXXX.php
public function up(Schema $schema): void
{
    // roles column is serialized PHP array — update in-place
    $this->addSql("
        UPDATE user_account
        SET roles = REPLACE(roles, '\"ROLE_USER\"', '\"ROLE_VENDEUR\"')
        WHERE roles LIKE '%ROLE_USER%'
          AND roles NOT LIKE '%ROLE_ADMIN%'
          AND roles NOT LIKE '%ROLE_MANAGER%'
    ");
}

public function down(Schema $schema): void
{
    $this->addSql("
        UPDATE user_account
        SET roles = REPLACE(roles, '\"ROLE_VENDEUR\"', '\"ROLE_USER\"')
        WHERE roles LIKE '%ROLE_VENDEUR%'
    ");
}
```

### Anti-Patterns to Avoid

- **Path-only access_control:** `{ path: ^/api/admin/user, roles: ROLE_ADMIN }` — fragile, breaks on route refactors. Use Voters in controllers instead.
- **Role checks in services:** Never call `$this->security->isGranted()` inside a Command handler or service. Authorization belongs at the controller boundary.
- **JWT in URL params:** `window.open(url + '?bearer=' + Cookies.get('JWT'))` — token appears in server logs, browser history, Referer headers. Replace with `fetch()` + `URL.createObjectURL(blob)`.
- **Divergent hierarchies:** Defining the hierarchy in security.yaml but duplicating different logic in the frontend hook — they must mirror each other exactly.
- **`ROLE_USER` legacy role left in DB:** If you keep `ROLE_USER` and add `ROLE_VENDEUR`, the `access_control` rule `roles: ROLE_VENDEUR` will reject existing cashiers. The backfill migration is mandatory.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role inheritance logic | Manual `in_array` checks for parent roles | `role_hierarchy` in security.yaml | Symfony propagates hierarchy to `isGranted`, Voters, access_control automatically |
| Controller access checks | Custom `if ($user->hasRole('X')) throw 403` | `$this->denyAccessUnlessGranted(VoterAttr::X)` | Throws `AccessDeniedException` which Symfony converts to proper 403 response |
| Frontend role math | Re-implementing hierarchy in multiple components | `useHasRole` hook (single implementation, mirrors security.yaml) | Drift between client and server logic is a security bug |
| Export file download auth | JWT token in query param | `fetch()` with `Authorization: Bearer` header + `URL.createObjectURL(blob)` | Prevents token leakage in logs/history |

**Key insight:** Symfony's authorization system is already comprehensive. Every custom check written in PHP or TypeScript that bypasses Voters is technical debt that will drift from the canonical rules.

---

## Common Pitfalls

### Pitfall 1: `ROLE_USER` Not Replaced Before Deploying New `access_control`

**What goes wrong:** `security.yaml` is updated to require `ROLE_VENDEUR` on `/api/admin`. All existing cashiers who have `ROLE_USER` start getting 403 on every API call.
**Why it happens:** The migration is run *after* the deployment instead of *before* (or atomically within the same deploy).
**How to avoid:** Run the Doctrine migration *before* the PHP code/config deploy (or as the first step of the deployment pipeline). Make it idempotent — the `WHERE roles NOT LIKE '%ROLE_ADMIN%'` guard makes it safe to run twice.
**Warning signs:** POST-deploy spike in 403 errors in the API logs for all authenticated requests.

### Pitfall 2: Frontend Hierarchy Diverges from Backend

**What goes wrong:** `security.yaml` says `ROLE_ADMIN > ROLE_MANAGER > ROLE_VENDEUR`. Frontend hook says `ROLE_ADMIN > ROLE_VENDEUR` (missing MANAGER tier). MANAGERs see correct data in API but sidebar hides their valid routes.
**Why it happens:** The hierarchy is copy-pasted to a frontend constant and the MANAGER tier is accidentally omitted.
**How to avoid:** Define `ROLE_HIERARCHY` constant in one file (`useHasRole.ts`) and reference it from all role-checking code. Add a unit test that asserts `hasRoleWithHierarchy(['ROLE_MANAGER'], 'ROLE_VENDEUR') === true`.
**Warning signs:** A MANAGER can't see Report nav items even though the API returns 200.

### Pitfall 3: Voter `supports()` Too Broad

**What goes wrong:** `OrderVoter::supports()` returns `true` for any attribute string, causing it to intercept unrelated checks (e.g., `isGranted('ROLE_ADMIN')` calls) and return false, effectively denying access.
**Why it happens:** Forgetting the attribute whitelist in `supports()`.
**How to avoid:** Always whitelist exact attribute constants: `return in_array($attribute, [self::CREATE, self::VIEW, self::MANAGE])`.
**Warning signs:** Unexpected 403s on endpoints that have no `denyAccessUnlessGranted` call.

### Pitfall 4: JWT-in-URL Export Not Fixed

**What goes wrong:** The JWT appears in server access logs, browser history, and in the `Referer` header of any subsequent request. Any log aggregation tool (Datadog, CloudWatch, etc.) stores the credential in plaintext.
**Why it happens:** The current `export.items.tsx` uses `window.open(url + '?bearer=...')` as a shortcut to pass auth to a file download endpoint.
**How to avoid:** Replace with `fetch()` using the standard `Authorization: Bearer` header, pipe the response to a Blob, then use `URL.createObjectURL(blob)` to trigger the download.
**Warning signs:** Token visible in browser Network tab URL, in nginx/apache logs, or in CORS preflight `Origin` headers.

### Pitfall 5: `IS_AUTHENTICATED_ANONYMOUSLY` Deprecation

**What goes wrong:** Symfony 5.4 deprecated `IS_AUTHENTICATED_ANONYMOUSLY`. Using it in `access_control` produces deprecation warnings and will break in Symfony 6.
**Why it happens:** The existing `security.yaml` already uses it — it's copy-pasted into new rules.
**How to avoid:** Replace with `PUBLIC_ACCESS` (Symfony 5.4+) for truly public routes, or `IS_AUTHENTICATED_FULLY` for login-required routes. For backward compatibility in 5.4, `IS_AUTHENTICATED_ANONYMOUSLY` still works but should be flagged.
**Warning signs:** `[Symfony\Component\Security\Core\Authorization\Voter\AuthenticatedVoter] Checking for "IS_AUTHENTICATED_ANONYMOUSLY"` deprecation in the dev log.

---

## Code Examples

### Complete Voter Example (Pattern Verified Against Official Docs)

```php
// Source: https://symfony.com/doc/5.4/security/voters.html
// src/Security/Voter/UserManagementVoter.php
namespace App\Security\Voter;

use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Security;

class UserManagementVoter extends Voter
{
    const MANAGE = 'USER_MANAGEMENT_MANAGE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, $subject): bool
    {
        return $attribute === self::MANAGE;
    }

    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        return $this->security->isGranted('ROLE_ADMIN');
    }
}
```

```php
// In UserController — first line of every action:
public function list(...): Response
{
    $this->denyAccessUnlessGranted(UserManagementVoter::MANAGE);
    // existing code...
}

public function create(...): Response
{
    $this->denyAccessUnlessGranted(UserManagementVoter::MANAGE);
    // existing code...
}
```

### role_hierarchy in security.yaml (Verified Pattern)

```yaml
# config/packages/security.yaml
security:
    role_hierarchy:
        ROLE_MANAGER: ROLE_VENDEUR
        ROLE_ADMIN:   ROLE_MANAGER
    # ROLE_ADMIN inherits ROLE_MANAGER, which inherits ROLE_VENDEUR
    # Symfony resolves the full chain automatically.
```

### Export Fix: fetch() + Blob

```typescript
// front/src/app-frontend/components/settings/items/export.items.tsx
import { request } from '../../../../api/request/request';
import { PRODUCT_DOWNLOAD } from '../../../../api/routing/routes/backend.app';

export const ExportItems = () => {
  const { t } = useTranslation();

  const onClick = async () => {
    // Authorization header is added automatically by request() via Cookies.get('JWT')
    const response = await request(PRODUCT_DOWNLOAD);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="primary" onClick={onClick}>
      <FontAwesomeIcon icon={faDownload} className="mr-2" /> {t('Export items')}
    </Button>
  );
};
```

### User Role Dropdown Update

```typescript
// front/src/app-frontend/components/settings/users/create.user.tsx
// Replace the current options (ROLE_USER, ROLE_ADMIN) with:
options={[
  { label: 'Vendeur',  value: 'ROLE_VENDEUR'  },
  { label: 'Manager',  value: 'ROLE_MANAGER'  },
  { label: 'Admin',    value: 'ROLE_ADMIN'    },
]}
```

---

## Existing Codebase Analysis

This section documents what already exists so the planner does not duplicate work.

### What Already Works (Do Not Touch)

| Component | Location | Status |
|-----------|----------|--------|
| JWT auth flow (login, cookie, refresh) | `SecurityController.php`, `security.yaml` firewalls | Working |
| `User` entity with `roles: array` column | `src/Entity/User.php:103` | Working |
| `UserController` CRUD | `src/Controller/Api/Admin/UserController.php` | Exists — needs `denyAccessUnlessGranted` added |
| `RequireAuth` component | `app-admin/app.tsx:111`, `app-frontend/app.tsx` | Working — exists in both apps |
| `getAuthorizedUser` Redux selector | `duck/auth/auth.selector.ts` | Returns full User with `roles: string[]` |
| `User` TypeScript model with `roles: string[]` | `src/api/model/user.ts:9` | Ready for role checks |

### What Is Missing (Must Build)

| Missing Piece | Where to Add |
|---------------|-------------|
| `role_hierarchy` block | `security.yaml` |
| Voter classes (5 domains) | `src/Security/Voter/` |
| `denyAccessUnlessGranted` calls in all controllers | All 8 controllers in `Admin/` |
| Doctrine migration: `ROLE_USER` → `ROLE_VENDEUR` | `migrations/` |
| `useHasRole` hook | `duck/auth/hooks/useHasRole.ts` |
| `RequireRole` component | `app-common/components/auth/RequireRole.tsx` |
| Role-gated routes in admin app | `app-admin/app.tsx` |
| Role-gated sidebar items | `app-admin/containers/layout/sidebar.tsx` |
| Export JWT-in-URL fix | `app-frontend/components/settings/items/export.items.tsx` |
| Update user role dropdown (3 options) | `create.user.tsx` in both apps |

### Role Mapping (Current → Target)

| Current Role | Maps To | Granted Access |
|---|---|---|
| `ROLE_USER` | `ROLE_VENDEUR` | POS screens, read-only stock |
| `ROLE_ADMIN` | `ROLE_ADMIN` | Full access (no change) |
| (new) | `ROLE_MANAGER` | Reports, stock management, closing |

### Controller → Voter → Minimum Role Matrix

| Controller | Voter | Minimum Role |
|------------|-------|-------------|
| `OrderController` | `OrderVoter::MANAGE` | `ROLE_VENDEUR` |
| `ProductController` (write) | `ProductVoter::MANAGE` | `ROLE_MANAGER` |
| `ProductController` (read) | `ProductVoter::VIEW` | `ROLE_VENDEUR` |
| `ReportController` | `ReportVoter::VIEW` | `ROLE_MANAGER` |
| `ClosingController` | `ClosingVoter::MANAGE` | `ROLE_MANAGER` |
| `UserController` | `UserManagementVoter::MANAGE` | `ROLE_ADMIN` |
| `CustomerController` | `CustomerVoter::MANAGE` | `ROLE_MANAGER` |
| `ExpenseController` | `ExpenseVoter::MANAGE` | `ROLE_MANAGER` |
| `TerminalController` | `UserManagementVoter::MANAGE` | `ROLE_ADMIN` |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `IS_AUTHENTICATED_ANONYMOUSLY` | `PUBLIC_ACCESS` | Symfony 5.4 | Change in new rules; existing rules still work but will warn |
| Custom role-checking in controllers | Voter classes | Best practice pre-5.4 | Use Voters — they centralize logic and are testable |
| JWT in URL query param | fetch() + Blob URL | N/A (was always a security issue) | Fix in this phase |

**Deprecated/outdated in this codebase:**
- `ROLE_USER` as the cashier role: must be replaced by `ROLE_VENDEUR` in DB, security.yaml, and frontend code.
- JWT-in-URL in `export.items.tsx`: security vulnerability, fix in this phase as per prior decisions.

---

## Open Questions

1. **PurchaseController access level**
   - What we know: `PurchaseController` exists (repository file found). Requirement RBAC-03 covers "gérer le stock" for MANAGER.
   - What's unclear: Is purchase order creation exclusively MANAGER or can VENDEUR view purchase order history?
   - Recommendation: Default to `ROLE_MANAGER` for all PurchaseController actions until product owner clarifies. The Voter pattern makes this a one-line change later.

2. **Admin app vs. POS app role enforcement**
   - What we know: There are two separate frontend apps. POS app currently allows any authenticated user. Admin app currently allows any authenticated user.
   - What's unclear: Should a ROLE_VENDEUR user who navigates to the admin app URL be denied at login or after login?
   - Recommendation: Deny after login — the admin login flow already sends `?role=ROLE_ADMIN`; extend to check the returned user's roles and redirect to POS if the user has only `ROLE_VENDEUR`.

3. **`IS_AUTHENTICATED_ANONYMOUSLY` in existing security.yaml**
   - What we know: Five `access_control` rules use `IS_AUTHENTICATED_ANONYMOUSLY` (deprecated in 5.4).
   - What's unclear: Whether to fix these in this phase or leave them (they still work in 5.4).
   - Recommendation: Fix them in this phase since we're already touching `security.yaml`. Replace with `PUBLIC_ACCESS`.

---

## Sources

### Primary (HIGH confidence)
- https://symfony.com/doc/5.4/security/voters.html — Voter class structure, `supports()`, `voteOnAttribute()`, controller usage, auto-wiring
- https://symfony.com/doc/5.4/security.html — role_hierarchy configuration syntax, access_control, `denyAccessUnlessGranted`
- https://symfony.com/blog/new-in-symfony-5-4-faster-security-voters — `CacheableVoterInterface` in 5.4

### Secondary (MEDIUM confidence)
- Codebase direct inspection: `security.yaml`, `User.php`, all Admin controllers, `auth.selector.ts`, `auth.state.ts`, `export.items.tsx`, `create.user.tsx` — used to map existing gaps

### Tertiary (LOW confidence)
- None — all claims are backed by official docs or direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in the project; Voter pattern verified against Symfony 5.4 official docs
- Architecture: HIGH — Voter pattern is the canonical Symfony authorization approach; frontend hook pattern derived from existing Redux selectors in the codebase
- Pitfalls: HIGH — JWT-in-URL issue is directly observed in source code; migration pitfall derived from current DB schema (roles as serialized PHP array); IS_AUTHENTICATED_ANONYMOUSLY deprecation confirmed in Symfony 5.4 docs

**Research date:** 2026-02-17
**Valid until:** 2026-08-17 (Symfony 5.4 is LTS; patterns are stable)
