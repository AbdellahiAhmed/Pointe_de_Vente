# Testing Patterns

**Analysis Date:** 2026-02-17

## Overview

Testing infrastructure exists on the backend (PHPUnit configured, bootstrapped) but contains **zero test cases** — only `back/tests/bootstrap.php` is present. The frontend has testing libraries installed (`@testing-library/react`, `@types/jest`) but **no test files** exist anywhere in `front/src/`. This is effectively an untested codebase.

---

## Backend Testing

### Test Framework

**Runner:**
- PHPUnit 9.5 (configured in `back/phpunit.xml.dist`)
- Config: `back/phpunit.xml.dist`
- Symfony PHPUnit Bridge: `symfony/phpunit-bridge ^6.0`
- Bootstrap: `back/tests/bootstrap.php`

**Run Commands:**
```bash
# From back/ directory
./bin/phpunit                    # Run all tests
./bin/phpunit --coverage-html coverage/  # Coverage (requires Xdebug)
```

**Environment:**
- Test env vars loaded from `back/.env.test`
- Test Doctrine config: `back/config/packages/test/doctrine.yaml`
- Test monolog (silent): `back/config/packages/test/monolog.yaml`
- Symfony Validator groups: `back/config/packages/test/validator.yaml`
- Sets `APP_ENV=test` automatically via `phpunit.xml.dist`

**Available test infrastructure (not yet used):**
- `symfony/browser-kit` — HTTP client for functional tests
- `symfony/css-selector` — DOM element selection in functional tests
- `doctrine/doctrine-fixtures-bundle` — database fixtures for test seeding
- `fakerphp/faker` — fake data generation in `back/src/Factory/Faker/`

### Test File Organization

**Location:** All tests go in `back/tests/`

**Naming convention (to follow when writing tests):**
- Unit tests: `back/tests/Unit/{MatchesSrcStructure}Test.php`
- Functional tests: `back/tests/Functional/{Feature}Test.php`
- Test class names end with `Test` suffix

**Test suite configured in `back/phpunit.xml.dist`:**
```xml
<testsuites>
    <testsuite name="Project Test Suite">
        <directory>tests</directory>
    </testsuite>
</testsuites>
```

**Coverage source configured:**
```xml
<coverage processUncoveredFiles="true">
    <include>
        <directory suffix=".php">src</directory>
    </include>
</coverage>
```

### Recommended Test Structure (No Tests Exist — Follow This Pattern)

When writing PHPUnit tests for this codebase, follow this structure:

**Unit test for a CommandHandler:**
```php
<?php

namespace App\Tests\Unit\Core\Brand\Command\CreateBrandCommand;

use PHPUnit\Framework\TestCase;
use App\Core\Brand\Command\CreateBrandCommand\CreateBrandCommand;
use App\Core\Brand\Command\CreateBrandCommand\CreateBrandCommandHandler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class CreateBrandCommandHandlerTest extends TestCase
{
    private CreateBrandCommandHandler $handler;
    private EntityManagerInterface $em;
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->validator = $this->createMock(ValidatorInterface::class);
        $this->handler = new CreateBrandCommandHandler($this->em, $this->validator);
    }

    public function testHandleCreatesValidBrand(): void
    {
        // ...
    }
}
```

**Functional test using Symfony WebTestCase:**
```php
<?php

namespace App\Tests\Functional\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class BrandControllerTest extends WebTestCase
{
    public function testCreateBrand(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/brands', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->getToken(),
        ], json_encode(['name' => 'Test Brand', 'stores' => []]));

        $this->assertResponseIsSuccessful();
    }
}
```

### Mocking (PHPUnit Native)

**Framework:** PHPUnit native mocks (no Mockery or Prophecy)

**Pattern for CommandHandlers:**
- Mock `EntityManagerInterface` and `ValidatorInterface` via `$this->createMock()`
- Spy on `persist()` and `flush()` calls with `$this->em->expects($this->once())->method('persist')`

**What to mock:**
- `EntityManagerInterface` — Doctrine persistence
- `ValidatorInterface` — Symfony validator
- HTTP clients, mailers, external services

**What NOT to mock:**
- Command/Query objects — use real instances
- Result objects — use real instances
- DTO factories — use real `createFromRequest()` with mock `Request` objects

### Fixtures and Factories

**Fixtures location:** `back/src/DataFixtures/AppFixtures.php`

Creates seed data for development/test:
- Default `admin` user with password `admin`
- Default `Main` store
- Default `A1` terminal linked to the store

**Run fixtures:**
```bash
php bin/console doctrine:fixtures:load --env=test
```

**Faker factory:** `back/src/Factory/Faker/` — available for building test data in fixtures.

### Coverage

**Requirements:** None enforced — no minimum threshold configured

**View Coverage:**
```bash
./bin/phpunit --coverage-html var/coverage/
```
Xdebug must be enabled (config at `back/.docker/php/xdebug.ini`).

---

## Frontend Testing

### Test Framework

**Installed (but unused):**
- `@testing-library/react ^13.0.0`
- `@testing-library/user-event ^13.2.1`
- `@testing-library/jest-dom ^5.14.1`
- `@types/jest ^27.0.1`

**Runner:** Jest (via create-react-app / react-app preset in `package.json` eslintConfig)

**Build tool:** Vite (`vite.config.js`) — note that Vite does not bundle Jest; a separate Jest config or Vitest would be needed to actually run tests. No `jest.config.*` or `vitest.config.*` file exists.

**Run Commands:**
```bash
# No working test command exists currently.
# To add testing, install vitest and configure:
yarn add -D vitest @vitest/ui jsdom
# Then add to package.json scripts: "test": "vitest"
```

### Test File Organization

**No test files exist.** When adding tests:
- Co-locate test files next to source files (React Testing Library convention)
- Naming: `{component}.test.tsx` or `{hook}.test.ts`

```
src/
├── app-frontend/components/settings/brands/
│   ├── brands.tsx
│   ├── brands.test.tsx        ← add here
│   ├── create.brand.tsx
│   └── create.brand.test.tsx  ← add here
├── api/hooks/
│   ├── use.api.ts
│   └── use.api.test.ts        ← add here
```

### Recommended Test Structure (No Tests Exist — Follow This Pattern)

**Component test with React Testing Library:**
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Brands } from './brands';

// Mock dependencies
jest.mock('../../../../api/hooks/use.api');
jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockReturnValue({ id: 1, name: 'Main' }),
}));

describe('Brands', () => {
  it('renders brand list table', () => {
    render(<Brands />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
```

**Hook test:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useLogout } from './useLogout';

describe('useLogout', () => {
  it('clears cookies and dispatches userLoggedOut on logout', async () => {
    const { result } = renderHook(() => useLogout());
    const [, logout] = result.current;

    await act(async () => {
      await logout();
    });

    expect(document.cookie).not.toContain('JWT');
  });
});
```

### Mocking

**What to mock in frontend tests:**
- `react-redux` — `useSelector`, `useDispatch`
- `js-cookie` — cookie reads/writes
- `api/request/request.ts` — `jsonRequest`, `fetchJson`
- `react-i18next` — `useTranslation` returning `t: (key) => key`
- `react-router-dom` — `useLocation`, `useNavigate`

**What NOT to mock:**
- Redux reducers and selectors — test them with real store state
- Yup validation schemas — test with real inputs
- Pure utility functions in `front/src/lib/`

### Test Types

**Unit Tests:**
- Pure TypeScript utility functions in `front/src/lib/` (currency, error, location helpers)
- Redux reducers and selectors in `front/src/duck/`
- Yup validation schemas

**Integration Tests:**
- React components with RTL — render + interact + assert DOM
- Custom hooks with `renderHook`

**E2E Tests:**
- No E2E framework installed or configured (`panther` commented out in backend, no Cypress/Playwright in frontend)

---

## Test Coverage Gaps

The entire codebase has **zero tests written**. Priority areas to cover first:

**High priority (backend):**
- `CreateOrderCommandHandler` — complex business logic in `back/src/Core/Order/Command/CreateOrderCommand/`
- `OrderController` — most complex API surface with multiple operations (create, dispatch, refund, restore, delete)
- All CQRS command handlers — they contain the core business logic

**High priority (frontend):**
- `useApi` hook (`front/src/api/hooks/use.api.ts`) — used by every list view
- `CreateBrand` / `CreateCategory` / other create forms — form validation and server error mapping
- `request.ts` (`front/src/api/request/request.ts`) — base HTTP layer with auth token injection

**Medium priority:**
- Entity validation (Symfony Validator constraints on entities)
- Redux reducers in `front/src/duck/`
- `ApiResponseFactory` (`back/src/Factory/Controller/ApiResponseFactory.php`)

---

*Testing analysis: 2026-02-17*
